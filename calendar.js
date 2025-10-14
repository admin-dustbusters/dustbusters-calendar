import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo for stats
import { Calendar, RefreshCw, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react';

const DustBustersCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [view, setView] = useState('weekly'); // 'daily', 'weekly', 'monthly'
  const [loading, setLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // NEW: State for each stat modal
  const [showTotalCleanersModal, setShowTotalCleanersModal] = useState(false);
  const [showAvailableCleanersModal, setShowAvailableCleanersModal] = useState(false);
  const [showBookedSlotsModal, setShowBookedSlotsModal] = useState(false);
  const [showOpenSlotsModal, setShowOpenSlotsModal] = useState(false);


  const SHEET_ID = '1USRZFHCeoo3toVGdyJnQ3LwN2PLCp7fyTXEQM5yZiV0';
  const SHEET_NAME = 'Live Availability Matrix';
  const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE'; 

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadAvailabilityData = async () => {
    setLoading(true);
    try {
      const mockData = generateMockData();
      setAvailabilityData(mockData);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  function generateMockData() {
    // This function is unchanged
    const cleaners = [
      { id: 'C01', name: 'Ashley', fullName: 'Ashley Johnson', region: 'Charlotte', phone: '704-555-0101', rate: 35 },
      { id: 'C02', name: 'Kim', fullName: 'Kim Martinez', region: 'Charlotte', phone: '704-555-0102', rate: 35 },
      { id: 'C03', name: 'Sarah', fullName: 'Sarah Williams', region: 'Triad', phone: '336-555-0103', rate: 32 },
      { id: 'C04', name: 'Jessica', fullName: 'Jessica Brown', region: 'Triad', phone: '336-555-0104', rate: 32 },
      { id: 'C05', name: 'Emily', fullName: 'Emily Davis', region: 'Raleigh', phone: '919-555-0105', rate: 33 },
      { id: 'C06', name: 'Maria', fullName: 'Maria Garcia', region: 'Charlotte', phone: '704-555-0106', rate: 35 },
      { id: 'C07', name: 'Jennifer', fullName: 'Jennifer Wilson', region: 'Raleigh', phone: '919-555-0107', rate: 33 },
      { id: 'C08', name: 'Amanda', fullName: 'Amanda Taylor', region: 'Triad', phone: '336-555-0108', rate: 32 },
      { id: 'C09', name: 'Lisa', fullName: 'Lisa Anderson', region: 'Charlotte', phone: '704-555-0109', rate: 35 },
      { id: 'C10', name: 'Taylor', fullName: 'Taylor Thomas', region: 'Charlotte', phone: '704-555-0110', rate: 35 },
      { id: 'C11', name: 'Nicole', fullName: 'Nicole Moore', region: 'Triad', phone: '336-555-0111', rate: 32 },
      { id: 'C12', name: 'Emma', fullName: 'Emma Jackson', region: 'Charlotte', phone: '704-555-0112', rate: 35 },
    ];

    const hours = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return cleaners.map(cleaner => {
      const availability = {};
      days.forEach(day => {
        hours.forEach(hour => {
          const rand = Math.random();
          if (rand > 0.75) {
            availability[`${day}_${hour}`] = 'BOOKED #1234';
          } else if (rand > 0.15) {
            availability[`${day}_${hour}`] = 'AVAILABLE';
          } else {
            availability[`${day}_${hour}`] = 'UNAVAILABLE';
          }
        });
      });
      return { ...cleaner, ...availability };
    });
  }

  useEffect(() => {
    loadAvailabilityData();
    const interval = setInterval(loadAvailabilityData, 60000);
    return () => clearInterval(interval);
  }, []);

  // All navigation functions are unchanged
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDay);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDay(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDay);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDay(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(getMonday(today));
    setCurrentMonth(today);
    setSelectedDay(today);
  };

  // All helper functions are unchanged
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const weekDates = getWeekDates();
  const monthDays = getMonthDays();
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourlySlots = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];

  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] },
  ];

  const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 'Sun' : dayAbbrev[dayIndex - 1];
  };

  // These functions are still used by the calendar views and modals, unchanged
  const getCleanersForSlot = (date, blockIdOrHour) => {
    // ... Unchanged ...
    const dayPrefix = getDayOfWeekAbbrev(date);
    let filtered = availabilityData;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region.toLowerCase() === selectedRegion);
    }
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const isHourly = hourlySlots.includes(blockIdOrHour);
    if (isHourly) {
      const available = filtered.filter(cleaner => cleaner[`${dayPrefix}_${blockIdOrHour}`] === 'AVAILABLE');
      const booked = filtered.filter(cleaner => cleaner[`${dayPrefix}_${blockIdOrHour}`]?.startsWith('BOOKED'));
      return { available, booked, total: available.length + booked.length };
    } else {
      const block = timeBlocks.find(b => b.id === blockIdOrHour);
      const available = filtered.filter(cleaner => block.hours.every(hour => cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE'));
      const booked = filtered.filter(cleaner => block.hours.some(hour => cleaner[`${dayPrefix}_${hour}`]?.startsWith('BOOKED')));
      return { available, booked, total: available.length + booked.length };
    }
  };

  const getDayStats = (date) => {
    // ... Unchanged ...
    const dayPrefix = getDayOfWeekAbbrev(date);
    let filtered = availabilityData;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region.toLowerCase() === selectedRegion);
    }
    let available = 0;
    let booked = 0;
    filtered.forEach(cleaner => {
      hourlySlots.forEach(hour => {
        const status = cleaner[`${dayPrefix}_${hour}`];
        if (status === 'AVAILABLE') available++;
        else if (status?.startsWith('BOOKED')) booked++;
      });
    });
    return { available, booked };
  };

  const openSlotDetails = (date, blockIdOrHour) => {
    // ... Unchanged ...
    const { available, booked } = getCleanersForSlot(date, blockIdOrHour);
    const isHourly = hourlySlots.includes(blockIdOrHour);
    setSelectedSlot({
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
      date: date,
      block: isHourly ? { label: blockIdOrHour, time: blockIdOrHour } : timeBlocks.find(b => b.id === blockIdOrHour),
      available,
      booked,
      isHourly
    });
    setShowModal(true);
  };

  // NEW: DYNAMIC STATS CALCULATION
  // This calculates stats based on the current view and filters.
  const dynamicStats = useMemo(() => {
    const datesInView = view === 'daily' ? [selectedDay] : view === 'weekly' ? getWeekDates() : getMonthDays().filter(Boolean);
    const dayPrefixesInView = datesInView.map(getDayOfWeekAbbrev);

    const filteredCleaners = availabilityData
        .filter(c => selectedRegion === 'all' || c.region.toLowerCase() === selectedRegion)
        .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

    let openSlots = 0;
    let bookedSlots = 0;
    const availableCleaners = new Set();
    const openSlotsList = [];
    const bookedSlotsList = [];

    filteredCleaners.forEach(cleaner => {
        let isCleanerAvailableInView = false;
        datesInView.forEach(date => {
            const dayPrefix = getDayOfWeekAbbrev(date);
            hourlySlots.forEach(hour => {
                const status = cleaner[`${dayPrefix}_${hour}`];
                if (status === 'AVAILABLE') {
                    openSlots++;
                    isCleanerAvailableInView = true;
                    openSlotsList.push({ cleaner, date, hour });
                } else if (status?.startsWith('BOOKED')) {
                    bookedSlots++;
                    bookedSlotsList.push({ cleaner, date, hour, status });
                }
            });
        });
        if (isCleanerAvailableInView) {
            availableCleaners.add(cleaner);
        }
    });

    return {
        totalCleaners: filteredCleaners,
        availableCleaners: Array.from(availableCleaners),
        bookedSlots,
        openSlots,
        openSlotsList,
        bookedSlotsList
    };
  }, [availabilityData, view, selectedDay, currentWeek, currentMonth, selectedRegion, searchQuery]);
  
  const availableLabel = view === 'daily' ? 'Available Today' : view === 'weekly' ? 'Available This Week' : 'Available This Month';

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      {/* Header is unchanged */}
      <div className="max-w-7xl mx-auto mb-5">
        {/* ... */}
      </div>

      {/* AI Assistant Banner is unchanged */}
      <div className="max-w-7xl mx-auto mb-5">
        {/* ... */}
      </div>

      {/* MODIFIED: Stats Bar - Now clickable and uses dynamicStats */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div onClick={() => setShowTotalCleanersModal(true)} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Cleaners</div>
            <div className="text-3xl font-bold text-gray-800">{dynamicStats.totalCleaners.length}</div>
          </div>
          <div onClick={() => setShowAvailableCleanersModal(true)} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{availableLabel}</div>
            <div className="text-3xl font-bold text-gray-800">{dynamicStats.availableCleaners.length}</div>
          </div>
          <div onClick={() => setShowBookedSlotsModal(true)} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Booked Slots</div>
            <div className="text-3xl font-bold text-gray-800">{dynamicStats.bookedSlots}</div>
          </div>
          <div onClick={() => setShowOpenSlotsModal(true)} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Open Slots</div>
            <div className="text-3xl font-bold text-gray-800">{dynamicStats.openSlots}</div>
          </div>
        </div>
      </div>

      {/* Search Bar is unchanged */}
      <div className="max-w-7xl mx-auto mb-5">
        {/* ... */}
      </div>

      {/* View Selector & Controls are unchanged */}
      <div className="max-w-7xl mx-auto mb-5">
        {/* ... */}
      </div>

      {/* All Calendar Views (Daily, Weekly, Monthly) are unchanged */}
      {view === 'daily' && ( /* ... unchanged ... */ )}
      {view === 'weekly' && ( /* ... unchanged ... */ )}
      {view === 'monthly' && ( /* ... unchanged ... */ )}

      {/* Original Slot Detail Modal is unchanged */}
      {showModal && selectedSlot && ( /* ... unchanged ... */ )}

      {/* NEW: Modals for Stats */}
      {showTotalCleanersModal && (
        <StatModal title="Total Cleaners" onClose={() => setShowTotalCleanersModal(false)}>
            {dynamicStats.totalCleaners.map(cleaner => (
                <CleanerInfo key={cleaner.id} cleaner={cleaner} />
            ))}
        </StatModal>
      )}

      {showAvailableCleanersModal && (
        <StatModal title="Available Cleaners" onClose={() => setShowAvailableCleanersModal(false)}>
            {dynamicStats.availableCleaners.map(cleaner => (
                <CleanerInfo key={cleaner.id} cleaner={cleaner} />
            ))}
        </StatModal>
      )}

      {showBookedSlotsModal && (
        <StatModal title="Booked Slots" onClose={() => setShowBookedSlotsModal(false)}>
            {dynamicStats.bookedSlotsList.map((slot, index) => (
                <SlotInfo key={index} slot={slot} type="booked" />
            ))}
        </StatModal>
      )}

      {showOpenSlotsModal && (
        <StatModal title="Open Slots" onClose={() => setShowOpenSlotsModal(false)}>
            {dynamicStats.openSlotsList.map((slot, index) => (
                <SlotInfo key={index} slot={slot} type="open" />
            ))}
        </StatModal>
      )}
    </div>
  );
};

// NEW: Helper components for the stat modals
const StatModal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
            <div className="overflow-y-auto space-y-3">
                {children}
            </div>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 self-center">
                Close
            </button>
        </div>
    </div>
);

const CleanerInfo = ({ cleaner }) => (
    <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
            <div className="font-semibold text-gray-900">{cleaner.fullName}</div>
            <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{cleaner.region}</div>
        </div>
        <div className="text-sm text-gray-600 mb-1">{cleaner.phone}</div>
        <div className="text-sm text-gray-600">${cleaner.rate}/hour</div>
    </div>
);

const SlotInfo = ({ slot, type }) => (
    <div className={`rounded-lg p-3 ${type === 'booked' ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className="font-semibold">{slot.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {slot.hour}</div>
        <div className="text-sm text-gray-600">Cleaner: {slot.cleaner.name} ({slot.cleaner.region})</div>
        {type === 'booked' && <div className="text-xs text-red-700 font-medium">{slot.status}</div>}
    </div>
);


export default DustBustersCalendar;
