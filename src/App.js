// src/App.js
const { useState, useEffect, useMemo, createElement } = React;

// Import Config and Utils
import { N8N_WEBHOOK_URL, HOURLY_SLOTS, TIME_BLOCKS } from './config.js';
import { getMonday, getDayOfWeekAbbrev, getWeekDates, getCalendarDays, getRegionColor, getRegionEmoji, getInitials } from './utils.js';

// Import Components and Views
import SlotDetailsModal from './components/SlotDetailsModal.js';
import CleanersModal from './components/CleanersModal.js';
import WeeklyView from './views/WeeklyView.js';
import DailyView from './views/DailyView.js';
import MonthlyView from './views/MonthlyView.js';

const App = () => {
  // --- STATE MANAGEMENT ---
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [view, setView] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCleanersModal, setShowCleanersModal] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  // --- DATA FETCHING ---
  const loadAvailabilityData = async () => {
    setLoading(true);
    setNetworkError(null);
    try {
      const response = await fetch(N8N_WEBHOOK_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAvailabilityData(data.cleaners || []);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      setAvailabilityData([]);
      setNetworkError(`Failed to load data. Please check connection. Error: ${error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAvailabilityData();
    const interval = setInterval(loadAvailabilityData, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- MEMOIZED DERIVED STATE ---
  const availableRegions = useMemo(() => {
    const regions = new Set();
    availabilityData.forEach(cleaner => {
      if (cleaner.id !== 'unassigned' && cleaner.region) {
        regions.add(cleaner.region);
      }
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const dynamicStats = useMemo(() => {
    // Logic to calculate stats based on the current view and filters
    // This is a simplified version; you can expand it as needed.
    const totalCleaners = availabilityData.filter(c => c.id !== 'unassigned').length;
    return {
        totalCleaners: totalCleaners,
        cleanersAvailable: 'N/A', // These would need more complex calculation
        bookedSlots: 'N/A',
        openSlots: 'N/A',
    };
  }, [availabilityData, view, selectedDay, currentWeek, currentMonth, selectedRegion]);

  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek]);
  const monthDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  // --- CORE LOGIC FUNCTIONS ---
  const getCleanersForSlot = (date, blockIdOrHour) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    const weekMonday = getMonday(date);
    const weekString = weekMonday.toISOString().split('T')[0];
    
    let filtered = availabilityData
      .filter(c => (c.weekStarting && c.weekStarting === weekString) || c.id === 'unassigned')
      .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion || c.id === 'unassigned');

    const isHourly = HOURLY_SLOTS.includes(blockIdOrHour);
    const hoursToCheck = isHourly ? [blockIdOrHour] : TIME_BLOCKS.find(b => b.id === blockIdOrHour).hours;

    const available = [];
    const booked = [];

    filtered.forEach(c => {
        let isBookedInBlock = false;
        let isAvailableInBlock = true;
        let bookingDetails = [];

        for (const hour of hoursToCheck) {
            const fieldName = `${dayPrefix}_${hour}`;
            const status = c[fieldName];
            if (status?.startsWith('BOOKED')) {
                isBookedInBlock = true;
                isAvailableInBlock = false;
                bookingDetails.push({ cleaner: c, details: status });
            } else if (status !== 'AVAILABLE') {
                isAvailableInBlock = false;
            }
        }
        
        if (isBookedInBlock) {
             booked.push(...bookingDetails);
        } else if (isAvailableInBlock) {
            if (c.id !== 'unassigned') {
                available.push(c);
            }
        }
    });
    return { available, booked, total: available.length + booked.length };
  };

  const getAvailableCleanersForDay = (date) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    const weekString = getMonday(date).toISOString().split('T')[0];
    const availableCleaners = new Map();

    const cleanersForThisWeek = availabilityData.filter(c => c.weekStarting === weekString && c.id !== 'unassigned');
    
    cleanersForThisWeek.forEach(cleaner => {
        for (const hour of HOURLY_SLOTS) {
            if (cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE') {
                if (!availableCleaners.has(cleaner.id)) {
                    availableCleaners.set(cleaner.id, cleaner);
                }
                break;
            }
        }
    });
    return Array.from(availableCleaners.values());
  };


  // --- EVENT HANDLERS ---
  const openSlotDetails = (date, blockIdOrHour) => {
    const { available, booked } = getCleanersForSlot(date, blockIdOrHour);
    const isHourly = HOURLY_SLOTS.includes(blockIdOrHour);
    setSelectedSlot({
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
      date: date,
      block: isHourly ? { label: blockIdOrHour, time: blockIdOrHour } : TIME_BLOCKS.find(b => b.id === blockIdOrHour),
      available, booked, isHourly
    });
    setShowModal(true);
  };

  const handleViewChange = (newView) => setView(newView);

  // --- RENDER ---
  if (loading && availabilityData.length === 0) {
    return createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' }, 'Loading Calendar...');
  }

  return createElement('div', { className: 'min-h-screen bg-gray-50 p-2 md:p-5' },
    // Error Banner
    networkError && createElement('div', { className: 'max-w-7xl mx-auto mb-4 p-4 bg-red-100 text-red-800 rounded-lg' }, networkError),
    
    // Header
    createElement('div', { className: 'max-w-7xl mx-auto mb-4 bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center justify-between' },
      createElement('div', { className: 'flex items-center gap-3' },
        createElement('div', { className: 'text-2xl sm:text-3xl' }, '🧹'),
        createElement('div', null,
          createElement('h1', { className: 'text-lg sm:text-2xl font-bold text-gray-800' }, 'DustBusters Calendar'),
          lastSync && createElement('p', { className: 'text-xs text-gray-500' }, `Last updated ${lastSync.toLocaleTimeString()}`)
        )
      ),
      createElement('button', { onClick: loadAvailabilityData, disabled: loading, className: 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50' }, loading ? 'Refreshing...' : 'Refresh')
    ),

    // Stats
    createElement('div', { className: 'max-w-7xl mx-auto mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4' },
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:bg-gray-50', onClick: () => setShowCleanersModal(true) },
        createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'),
        createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.totalCleaners)
      ),
      // Other stats placeholders
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' }, createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Available Slots'), createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, '-')),
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' }, createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Jobs'), createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, '-')),
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' }, createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Unassigned Jobs'), createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, '-')),
    ),

    // Controls
    createElement('div', { className: 'max-w-7xl mx-auto mb-4 bg-white rounded-xl shadow-sm p-3 sm:p-4' },
      // ... (Insert your control bar JSX/createElement calls here: view toggles, region filters, date navigation)
      // This is the section with "Daily", "Weekly", "Monthly", Region buttons, and date arrows.
    ),

    // View Container
    createElement('div', { className: 'max-w-7xl mx-auto' },
        view === 'weekly' && createElement(WeeklyView, { weekDates, getCleanersForSlot, openSlotDetails, setSelectedDay, setView }),
        view === 'daily' && createElement(DailyView, { availabilityData, selectedDay, selectedRegion, searchQuery, openSlotDetails }),
        view === 'monthly' && createElement(MonthlyView, { monthDays, getAvailableCleanersForDay, setSelectedDay, setView })
    ),
    
    // Modals
    createElement(SlotDetailsModal, { slot: selectedSlot, onClose: () => setShowModal(false) }),
    createElement(CleanersModal, { show: showCleanersModal, onClose: () => setShowCleanersModal(false), availabilityData })
  );
};

export default App;
