// src/App.js
const { useState, useEffect, useMemo, createElement } = React;

// Import Config and Utils
import { N8N_WEBHOOK_URL, HOURLY_SLOTS, TIME_BLOCKS } from './config.js';
import { getMonday, getDayOfWeekAbbrev, getWeekDates, getCalendarDays, getRegionColor, getRegionEmoji } from './utils.js';

// Import Components and Views
import SlotDetailsModal from './components/SlotDetailsModal.js';
import CleanersModal from './components/CleanersModal.js';
import WeeklyView from './views/WeeklyView.js';
import DailyView from './views/DailyView.js';
import MonthlyView from './views/MonthlyView.js';

const App = () => {
  // --- STATE MANAGEMENT (Complete) ---
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [networkError, setNetworkError] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dynamicStats, setDynamicStats] = useState({
    totalCleaners: 0,
    cleanersAvailable: 0,
    bookedSlots: 0,
    openSlots: 0,
  });

  // --- DATA FETCHING ---
  const loadAvailabilityData = async () => {
    if (!loading) setLoading(true);
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
      setNetworkError(`Failed to load data. Error: ${error.message}`);
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
      if (cleaner.id !== 'unassigned' && cleaner.region && cleaner.region !== 'Unassigned') {
        regions.add(cleaner.region);
      }
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek]);
  const monthDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  // --- STATS CALCULATION ---
  useEffect(() => {
    // ... (This logic is correct from the last step)
    const filteredByRegion = availabilityData
      .filter(c => c.id !== 'unassigned')
      .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion);

    const uniqueCleaners = new Set(filteredByRegion.map(c => c.id));

    let datesToScan = [];
    if (view === 'daily') datesToScan = [selectedDay];
    else if (view === 'weekly') datesToScan = weekDates;
    else if (view === 'monthly') datesToScan = monthDays.filter(Boolean);

    let openSlots = 0;
    let bookedSlots = 0;
    const availableCleanerIds = new Set();
    
    datesToScan.forEach(date => {
        if(!date) return;
        const dayPrefix = getDayOfWeekAbbrev(date);
        const weekString = getMonday(date).toISOString().split('T')[0];
        
        const relevantData = availabilityData.filter(d => d.weekStarting === weekString);

        relevantData.forEach(item => {
            if (selectedRegion !== 'all' && item.region?.toLowerCase() !== selectedRegion) return;
            if (item.id === 'unassigned') return;

            HOURLY_SLOTS.forEach(hour => {
                const status = item[`${dayPrefix}_${hour}`];
                if (status === 'AVAILABLE') {
                    openSlots++;
                    availableCleanerIds.add(item.id);
                } else if (status?.startsWith('BOOKED')) {
                    bookedSlots++;
                }
            });
        });
    });

    setDynamicStats({
        totalCleaners: uniqueCleaners.size,
        cleanersAvailable: availableCleanerIds.size,
        bookedSlots: bookedSlots,
        openSlots: openSlots,
    });
  }, [view, selectedDay, currentWeek, currentMonth, availabilityData, selectedRegion]);


  // --- CORE LOGIC & EVENT HANDLERS ---
  const getCleanersForSlot = (date, blockIdOrHour) => {
    // ... (This function is correct from the previous step, no changes needed)
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
        } else if (isAvailableInBlock && c.id !== 'unassigned') {
            available.push(c);
        }
    });
    return { available, booked, total: available.length + booked.length };
  };

  const getAvailableCleanersForDay = (date) => {
    // ... (This function is correct, no changes needed)
     const dayPrefix = getDayOfWeekAbbrev(date);
    const weekString = getMonday(date).toISOString().split('T')[0];
    const availableCleaners = new Map();
    const cleanersForThisWeek = availabilityData.filter(c => c.weekStarting === weekString && c.id !== 'unassigned');
    cleanersForThisWeek.forEach(cleaner => {
        for (const hour of HOURLY_SLOTS) {
            if (cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE') {
                if (!availableCleaners.has(cleaner.id)) availableCleaners.set(cleaner.id, cleaner);
                break;
            }
        }
    });
    return Array.from(availableCleaners.values());
  };
  
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
  
  const handleViewChange = (newView) => {
     if (view === 'daily' && newView !== 'daily') {
      setCurrentWeek(getMonday(selectedDay));
      setCurrentMonth(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1));
    }
    setView(newView);
  };
  
  // --- RENDER FUNCTIONS FOR UI ELEMENTS ---
  const renderDatePicker = () => {
    // ... (This function is correct, no changes needed)
    const days = getCalendarDays(datePickerMonth);
    return createElement('div', { className: 'absolute top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4' },
      createElement('div', { className: 'flex items-center justify-between mb-3' },
        createElement('button', { onClick: () => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1)), className: 'px-2 py-1 hover:bg-gray-100 rounded-full' }, '‹'),
        createElement('div', { className: 'font-semibold text-sm' }, datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })),
        createElement('button', { onClick: () => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1)), className: 'px-2 py-1 hover:bg-gray-100 rounded-full' }, '›')
      ),
      createElement('div', { className: 'grid grid-cols-7 gap-1 text-center text-xs text-gray-500' }, ...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => createElement('div', { key: i, className: 'p-1' }, d))),
      createElement('div', { className: 'grid grid-cols-7 gap-1' },
        ...days.map((date, idx) => {
          if (!date) return createElement('div', { key: `empty-${idx}` });
          const isSelected = date.toDateString() === selectedDay.toDateString();
          return createElement('button', {
            key: idx,
            onClick: () => {
              if (view === 'daily') setSelectedDay(date);
              else if (view === 'weekly') setCurrentWeek(getMonday(date));
              else setCurrentMonth(date);
              setShowDatePicker(false);
            },
            className: `py-1 text-sm rounded-full ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`
          }, date.getDate());
        })
      )
    );
  };

  // --- TOP LEVEL RENDER ---
  if (loading && availabilityData.length === 0) {
    return createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' }, /* ... Loading spinner ... */);
  }

  const availableLabel = view === 'daily' ? 'Available Today' : view === 'monthly' ? 'Available This Month' : 'Available This Week';

  return createElement('div', { className: 'min-h-screen bg-gray-50 p-2 md:p-5' },
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
      createElement('button', { onClick: loadAvailabilityData, disabled: loading, className: 'flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm' }, loading ? 'Refreshing...' : 'Refresh')
    ),
      
    // AI Assistant Banner (RESTORED)
    createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-sm p-4 flex items-center gap-4 text-white' },
        createElement('div', { className: 'text-2xl' }, '🤖'),
        createElement('div', { className: 'flex-1' },
          createElement('div', { className: 'font-semibold text-sm sm:text-base' }, 'AI Assistant Active'),
          createElement('div', { className: 'text-xs sm:text-sm opacity-90' }, 'Click a slot for AI suggestions')
        ),
        createElement('button', { 
          className: 'px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-sm hover:bg-gray-50',
          onClick: () => alert('AI Assistant coming soon!')
        }, 'Ask AI')
      )
    ),

    // Stats Bar
    createElement('div', { className: 'max-w-7xl mx-auto mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4' },
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors', onClick: () => setShowCleanersModal(true) },
        createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'),
        createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.totalCleaners)
      ),
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, availableLabel),
        createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.cleanersAvailable)
      ),
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'),
        createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.bookedSlots)
      ),
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Open Slots'),
        createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.openSlots)
      )
    ),
      
    // Search Bar (RESTORED)
    createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        createElement('div', { className: 'relative' },
          createElement('span', { className: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400', style: { fontSize: '16px' } }, '🔍'),
          createElement('input', {
            type: 'text',
            placeholder: 'Search cleaner, region, or notes...',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: 'w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none'
          }),
          // Suggestions logic would go here if implemented
        )
      )
    ),

    // Controls Bar
    createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-4' },
        createElement('div', { className: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4' },
          createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center gap-3' },
            createElement('div', {className: 'flex items-center gap-2'},
              ['daily', 'weekly', 'monthly'].map(v =>
                createElement('button', {
                  key: v, onClick: () => handleViewChange(v),
                  className: `px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }, v.charAt(0).toUpperCase() + v.slice(1))
              )
            ),
            createElement('div', { className: 'flex gap-2 flex-wrap' },
              availableRegions.map(region => {
                const color = getRegionColor(region);
                const emoji = region === 'all' ? '' : getRegionEmoji(region.charAt(0).toUpperCase() + region.slice(1));
                const fullLabel = region === 'all' ? 'All Regions' : `${emoji} ${region.charAt(0).toUpperCase() + region.slice(1)}`;
                return createElement('button', {
                  key: region, onClick: () => setSelectedRegion(region.toLowerCase()),
                  className: `px-3 py-2.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-colors ${selectedRegion === region.toLowerCase() ? `bg-${color}-500 text-white` : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`}`
                }, fullLabel);
              })
            )
          ),
          createElement('div', { className: 'flex items-center gap-2 relative self-center' },
            createElement('button', { onClick: () => { if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() - 86400000)); else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() - 604800000)); else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)); }, className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, '←'),
            createElement('button', { onClick: () => { let initialDate = view === 'daily' ? selectedDay : view === 'weekly' ? currentWeek : currentMonth; setDatePickerMonth(initialDate); setShowDatePicker(!showDatePicker); }, className: 'px-2 py-2 font-semibold text-gray-800 w-36 sm:w-auto sm:min-w-[250px] text-center text-sm cursor-pointer hover:bg-gray-100 rounded-md border border-gray-300' },
              view === 'daily' ? selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
              view === 'weekly' ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
              currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            ),
             createElement('button', { onClick: () => { const today = new Date(); setSelectedDay(today); setCurrentWeek(getMonday(today)); setCurrentMonth(today); }, className: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium' }, 'Today'),
            createElement('button', { onClick: () => { if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() + 86400000)); else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() + 604800000)); else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)); }, className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, '→'),
            showDatePicker && renderDatePicker()
          )
        )
      )
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
