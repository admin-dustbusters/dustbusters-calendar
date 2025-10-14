const { useState, useEffect, useMemo } = React;

// Updated to use HTTPS
const N8N_WEBHOOK_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';

// Helper function to get Monday of the current week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Main Calendar Component
const DustBustersCalendar = () => {
  // State management
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

  // Constants
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourlySlots = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];

  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] }
  ];

  // Data loading
  const loadAvailabilityData = async () => {
    setLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Loaded data from n8n:', data);

      let cleaners = [];
      if (Array.isArray(data)) {
        cleaners = data;
      } else if (data.cleaners) {
        cleaners = data.cleaners;
      }

      setAvailabilityData(cleaners);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      setAvailabilityData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAvailabilityData();
    const interval = setInterval(loadAvailabilityData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str.replace(/\b\w+/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  };

  const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 'Sun' : dayAbbrev[dayIndex - 1];
  };

  // Calendar view helpers
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
    const startDay = firstDay.getDay() || 7;
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < (startDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  // Data processing
  const getCleanersForSlot = (date, blockIdOrHour) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    let filtered = availabilityData;

    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => {
        const cleanerRegions = c.regions || [c.region];
        return cleanerRegions.some(r => 
          r?.toLowerCase() === selectedRegion.toLowerCase()
        );
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.fullName?.toLowerCase().includes(query)
      );
    }

    const isHourly = hourlySlots.includes(blockIdOrHour);

    if (isHourly) {
      const available = filtered.filter(c => c[`${dayPrefix}_${blockIdOrHour}`] === 'AVAILABLE');
      const booked = filtered.filter(c => c[`${dayPrefix}_${blockIdOrHour}`]?.startsWith('BOOKED'));
      return { available, booked, total: available.length + booked.length };
    } else {
      const block = timeBlocks.find(b => b.id === blockIdOrHour);
      if (!block) return { available: [], booked: [], total: 0 };
      
      const available = filtered.filter(c =>
        block.hours.every(h => c[`${dayPrefix}_${h}`] === 'AVAILABLE')
      );
      const booked = filtered.filter(c =>
        block.hours.some(h => c[`${dayPrefix}_${h}`]?.startsWith('BOOKED'))
      );
      return { available, booked, total: available.length + booked.length };
    }
  };

  const getDayStats = (date) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    let filtered = availabilityData;
    
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => {
        const cleanerRegions = c.regions || [c.region];
        return cleanerRegions.some(r => 
          r?.toLowerCase() === selectedRegion.toLowerCase()
        );
      });
    }

    let available = 0, booked = 0;
    filtered.forEach(c => {
      hourlySlots.forEach(h => {
        const status = c[`${dayPrefix}_${h}`];
        if (status === 'AVAILABLE') available++;
        else if (status?.startsWith('BOOKED')) booked++;
      });
    });
    return { available, booked };
  };

  const getStats = () => {
    const stats = { available: 0, booked: 0 };
    availabilityData.forEach(c => {
      Object.keys(c).forEach(k => {
        if (k.includes('_')) {
          if (c[k] === 'AVAILABLE') stats.available++;
          else if (c[k]?.startsWith('BOOKED')) stats.booked++;
        }
      });
    });
    return stats;
  };

  // Memoized values
  const weekDates = useMemo(() => getWeekDates(), [currentWeek]);
  const monthDays = useMemo(() => getMonthDays(), [currentMonth]);
  const stats = useMemo(() => getStats(), [availabilityData]);

  const availableRegions = useMemo(() => {
    const regions = new Set();
    availabilityData.forEach(cleaner => {
      if (cleaner.region) regions.add(capitalizeWords(cleaner.region));
      if (cleaner.regions) {
        cleaner.regions.forEach(r => regions.add(capitalizeWords(r)));
      }
    });
    return ['All', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const getRegionColor = (region) => {
    const colors = {
      'all': 'teal',
      'charlotte': 'blue',
      'triad': 'green',
      'raleigh': 'yellow',
      'default': 'gray'
    };
    return colors[region?.toLowerCase()] || colors.default;
  };

  // Loading state
  if (loading && availabilityData.length === 0) {
    return React.createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-4xl mb-4' }, '🧹'),
        React.createElement('div', { className: 'text-xl font-semibold text-gray-700' }, 'Loading DustBusters Calendar...'),
        React.createElement('div', { className: 'text-sm text-gray-500 mt-2' }, 'Connecting to your data...')
      )
    );
  }

  // Main render
  return React.createElement('div', { className: 'min-h-screen bg-gray-50 p-5' },
    // Header
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('div', { className: 'text-3xl' }, '🧹'),
            React.createElement('div', null,
              React.createElement('h1', { className: 'text-2xl font-bold text-gray-800' }, 'DustBusters Calendar'),
              lastSync && React.createElement('p', { className: 'text-xs text-gray-500' },
                `Last updated ${lastSync.toLocaleTimeString()}`
              )
            )
          ),
          React.createElement('button', {
            onClick: loadAvailabilityData,
            disabled: loading,
            className: 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50'
          }, loading ? '↻ Refreshing...' : '↻ Refresh')
        )
      )
    ),

    // Stats
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'grid grid-cols-4 gap-4' },
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, availabilityData.length)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Available This Week'),
          React.createElement('div', { className: 'text-3xl font-bold text-green-600' },
            availabilityData.filter(c => Object.keys(c).some(k => k.includes('_') && c[k] === 'AVAILABLE')).length
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-blue-600' }, stats.booked)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Open Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, stats.available)
        )
      )
    ),

    // Controls
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'flex flex-wrap gap-4 items-center justify-between' },
          // View Toggle
          React.createElement('div', { className: 'flex rounded-lg bg-gray-100 p-1' },
            React.createElement('button', {
              onClick: () => setView('daily'),
              className: `px-4 py-2 rounded-lg ${view === 'daily' ? 'bg-white shadow' : 'hover:bg-white/50'}`
            }, 'Daily View'),
            React.createElement('button', {
              onClick: () => setView('weekly'),
              className: `px-4 py-2 rounded-lg ${view === 'weekly' ? 'bg-white shadow' : 'hover:bg-white/50'}`
            }, 'Weekly View'),
            React.createElement('button', {
              onClick: () => setView('monthly'),
              className: `px-4 py-2 rounded-lg ${view === 'monthly' ? 'bg-white shadow' : 'hover:bg-white/50'}`
            }, 'Monthly View')
          ),

          // Region Filter
          React.createElement('div', { className: 'flex gap-2' },
            availableRegions.map(region => 
              React.createElement('button', {
                key: region,
                onClick: () => setSelectedRegion(region.toLowerCase()),
                className: `px-4 py-2 rounded-lg ${
                  selectedRegion === region.toLowerCase() 
                    ? `bg-${getRegionColor(region)}-100 text-${getRegionColor(region)}-700 font-semibold`
                    : 'bg-gray-100 hover:bg-gray-200'
                }`
              }, region)
            )
          ),

          // Navigation
          React.createElement('div', { className: 'flex items-center gap-4

                      disabled: loading,
          className: 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50'
        }, loading ? '↻ Refreshing...' : '↻ Refresh')
