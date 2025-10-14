const { useState, useEffect, useMemo } = React;

const N8N_WEBHOOK_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';

const DustBustersCalendar = () => {
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());

  const [showCleanersModal, setShowCleanersModal] = useState(false);
  const [cleanerModalRegionFilter, setCleanerModalRegionFilter] = useState('all');
  
  // States for new stat modals
  const [showAvailableModal, setShowAvailableModal] = useState(false);
  const [showBookedModal, setShowBookedModal] = useState(false);
  const [showOpenSlotsModal, setShowOpenSlotsModal] = useState(false);


  const [dynamicStats, setDynamicStats] = useState({
    totalCleaners: 0,
    cleanersAvailable: 0,
    bookedSlots: 0,
    openSlots: 0,
  });

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
  
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(' ');
    if (parts.length > 1 && parts[parts.length - 1]) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const hourlySlots = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];

  const loadAvailabilityData = async () => {
    setLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let cleaners = [];
      if (Array.isArray(data)) {
        cleaners = data[0]?.cleaners || [];
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
  
  const filteredDataInView = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filteredCleaners = availabilityData
      .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion)
      .filter(c => 
        !lowerQuery || 
        c.name?.toLowerCase().includes(lowerQuery) || 
        c.fullName?.toLowerCase().includes(lowerQuery) ||
        c.region?.toLowerCase().includes(lowerQuery) ||
        c.notes?.toLowerCase().includes(lowerQuery)
      );

    let datesToScan = [];
    if (view === 'daily') {
      datesToScan = [selectedDay];
    } else if (view === 'weekly') {
      datesToScan = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeek);
        date.setDate(date.getDate() + i);
        return date;
      });
    } else if (view === 'monthly') {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      datesToScan = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    }
    
    return { filteredCleaners, datesToScan };
  }, [view, selectedDay, currentWeek, currentMonth, availabilityData, selectedRegion, searchQuery]);

  useEffect(() => {
    const { filteredCleaners, datesToScan } = filteredDataInView;
    let openSlots = 0;
    let bookedSlots = 0;
    const availableCleanerIds = new Set();
    
    const weekCleanerMap = new Map();
    filteredCleaners.forEach(cleaner => {
        const weekKey = cleaner.weekStarting || 'no_week';
        if (!weekCleanerMap.has(weekKey)) weekCleanerMap.set(weekKey, []);
        weekCleanerMap.get(weekKey).push(cleaner);
    });

    datesToScan.forEach(date => {
      const dayPrefix = getDayOfWeekAbbrev(date);
      const weekString = getMonday(date).toISOString().split('T')[0];
      const cleanersForThisWeek = weekCleanerMap.get(weekString) || [];

      cleanersForThisWeek.forEach(cleaner => {
        hourlySlots.forEach(hour => {
          const status = cleaner[`${dayPrefix}_${hour}`];
          if (status === 'AVAILABLE') {
            openSlots++;
            availableCleanerIds.add(cleaner.id);
          } else if (status?.startsWith('BOOKED')) {
            bookedSlots++;
          }
        });
      });
    });
    
    setDynamicStats({
      totalCleaners: new Set(filteredCleaners.map(c => c.id)).size,
      cleanersAvailable: availableCleanerIds.size,
      bookedSlots: bookedSlots,
      openSlots: openSlots,
    });
  }, [filteredDataInView]);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] },
  ];

  const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 'Sun' : dayAbbrev[dayIndex - 1];
  };

  const getWeekDates = () => Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + i);
    return date;
  });
  
  const getCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const weekDates = getWeekDates();
  const monthDays = getCalendarDays(currentMonth);

  const getCleanersForSlot = (date, blockIdOrHour) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    const weekMonday = getMonday(date);
    const weekString = weekMonday.toISOString().split('T')[0];
    const lowerQuery = searchQuery.toLowerCase();
    let filtered = availabilityData
      .filter(c => c.weekStarting ? c.weekStarting === weekString : true)
      .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion)
      .filter(c => !lowerQuery || c.name?.toLowerCase().includes(lowerQuery) || c.fullName?.toLowerCase().includes(lowerQuery) || c.region?.toLowerCase().includes(lowerQuery) || c.notes?.toLowerCase().includes(lowerQuery));
    const isHourly = hourlySlots.includes(blockIdOrHour);
    if (isHourly) {
      const fieldName = `${dayPrefix}_${blockIdOrHour}`;
      const available = filtered.filter(c => c[fieldName] === 'AVAILABLE');
      const booked = filtered.filter(c => c[fieldName]?.startsWith('BOOKED'));
      return { available, booked, total: available.length + booked.length };
    } else {
      const block = timeBlocks.find(b => b.id === blockIdOrHour);
      const available = filtered.filter(c => block.hours.every(h => c[`${dayPrefix}_${h}`] === 'AVAILABLE'));
      const booked = filtered.filter(c => block.hours.some(h => c[`${dayPrefix}_${h}`]?.startsWith('BOOKED')));
      return { available, booked, total: available.length + booked.length };
    }
  };
  
  const getAvailableCleanersForDay = (date) => {
    const { filteredCleaners } = filteredDataInView;
    const dayPrefix = getDayOfWeekAbbrev(date);
    const weekString = getMonday(date).toISOString().split('T')[0];
    const availableCleaners = new Map();
    const cleanersForThisWeek = filteredCleaners.filter(c => c.weekStarting ? c.weekStarting === weekString : true);
    cleanersForThisWeek.forEach(cleaner => {
        for (const hour of hourlySlots) {
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

  const openSlotDetails = (date, blockIdOrHour) => {
    const { available, booked } = getCleanersForSlot(date, blockIdOrHour);
    const isHourly = hourlySlots.includes(blockIdOrHour);
    setSelectedSlot({
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
      date: date,
      block: isHourly ? { label: blockIdOrHour, time: blockIdOrHour } : timeBlocks.find(b => b.id === blockIdOrHour),
      available, booked, isHourly
    });
    setShowModal(true);
  };
  
  const handleViewChange = (newView) => {
    if (newView === 'daily') {
      if (view === 'weekly') setSelectedDay(currentWeek);
      else if (view === 'monthly' && (selectedDay.getFullYear() !== currentMonth.getFullYear() || selectedDay.getMonth() !== currentMonth.getMonth())) setSelectedDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    } else if (newView === 'weekly') {
      if (view === 'daily') setCurrentWeek(getMonday(selectedDay));
      else if (view === 'monthly') setCurrentWeek(getMonday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)));
    } else if (newView === 'monthly') {
      if (view === 'daily') setCurrentMonth(selectedDay);
      else if (view === 'weekly') setCurrentMonth(currentWeek);
    }
    setView(newView);
  };

  const availableRegions = useMemo(() => {
    const regions = new Set();
    availabilityData.forEach(cleaner => {
      if (cleaner.region && typeof cleaner.region === 'string' && cleaner.region.trim() !== '') regions.add(cleaner.region);
      if (cleaner.regions && Array.isArray(cleaner.regions)) cleaner.regions.forEach(r => { if (r && typeof r === 'string' && r.trim() !== '') regions.add(r); });
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const getRegionColor = (region) => {
    const lowerRegion = region?.toLowerCase();
    const specificColors = { 'all': 'teal', 'charlotte': 'yellow', 'raleigh': 'stone', 'triad': 'purple' };
    if (specificColors[lowerRegion]) return specificColors[lowerRegion];
    const fallbackColors = ['pink', 'indigo', 'cyan', 'lime', 'orange'];
    let hash = 0;
    if (lowerRegion) for (let i = 0; i < lowerRegion.length; i++) hash = lowerRegion.charCodeAt(i) + ((hash << 5) - hash);
    return fallbackColors[Math.abs(hash % fallbackColors.length)];
  };

  const getRegionEmoji = (region) => ({ 'Charlotte': '🟡', 'Triad': '🟣', 'Raleigh': '🟤', 'Asheville': '⛰️', 'Wilmington': '🌊', 'Durham': '🐂' }[region] || '📍');

  const renderDatePicker = () => {
    const days = getCalendarDays(datePickerMonth);
    return React.createElement('div', { className: 'absolute top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4' },
      React.createElement('div', { className: 'flex items-center justify-between mb-3' },
        React.createElement('button', { onClick: () => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1)), className: 'px-2 py-1 hover:bg-gray-100 rounded-full' }, '‹'),
        React.createElement('div', { className: 'font-semibold text-sm' }, datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })),
        React.createElement('button', { onClick: () => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1)), className: 'px-2 py-1 hover:bg-gray-100 rounded-full' }, '›')
      ),
      React.createElement('div', { className: 'grid grid-cols-7 gap-1 text-center text-xs text-gray-500' }, ...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => React.createElement('div', { key: i, className: 'p-1' }, d))),
      React.createElement('div', { className: 'grid grid-cols-7 gap-1' },
        ...days.map((date, idx) => {
          if (!date) return React.createElement('div', { key: `empty-${idx}` });
          return React.createElement('button', {
            key: idx,
            onClick: () => {
              if (view === 'daily') setSelectedDay(date);
              else if (view === 'weekly') setCurrentWeek(getMonday(date));
              else setCurrentMonth(date);
              setShowDatePicker(false);
            },
            className: `py-1 text-sm rounded-full ${date.toDateString() === selectedDay.toDateString() ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`
          }, date.getDate());
        })
      )
    );
  };
  
  const renderCleanersModal = () => { /* ... existing code ... */ };

  // --- NEW: MODAL RENDER FUNCTIONS ---
  const renderStatDetailModal = (title, data, renderItem, onClose) => {
    return React.createElement('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4', onClick: onClose },
      React.createElement('div', { className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col p-8', onClick: e => e.stopPropagation() },
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-800 mb-6' }, title),
        React.createElement('div', { className: 'overflow-y-auto space-y-3' }, data.length > 0 ? data.map(renderItem) : React.createElement('p', { className: 'text-gray-500' }, 'No data to display for the current selection.')),
        React.createElement('button', { onClick: onClose, className: 'mt-6 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 self-center' }, 'Close')
      )
    );
  };

  const renderAvailableModal = () => {
    const { filteredCleaners, datesToScan } = filteredDataInView;
    const availableCleanersMap = new Map();
    const weekCleanerMap = new Map();
    filteredCleaners.forEach(c => {
        const weekKey = c.weekStarting || 'no_week';
        if (!weekCleanerMap.has(weekKey)) weekCleanerMap.set(weekKey, []);
        weekCleanerMap.get(weekKey).push(c);
    });

    datesToScan.forEach(date => {
      const dayPrefix = getDayOfWeekAbbrev(date);
      const weekString = getMonday(date).toISOString().split('T')[0];
      const cleanersForThisWeek = weekCleanerMap.get(weekString) || [];
      cleanersForThisWeek.forEach(cleaner => {
        if (hourlySlots.some(hour => cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE')) {
          if (!availableCleanersMap.has(cleaner.id)) availableCleanersMap.set(cleaner.id, cleaner);
        }
      });
    });
    
    return renderStatDetailModal(
      `Available Cleaners (${availableLabel.split(' ')[2]})`,
      Array.from(availableCleanersMap.values()),
      (c) => React.createElement('div', { key: c.id, className: 'bg-gray-50 rounded-lg p-4' },
        React.createElement('div', { className: 'flex justify-between' },
          React.createElement('div', { className: 'font-semibold text-gray-900' }, c.fullName || c.name),
          React.createElement('div', { className: 'text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded' }, c.region)
        ),
        React.createElement('div', { className: 'text-sm text-gray-600' }, c.phone || 'No phone')
      ),
      () => setShowAvailableModal(false)
    );
  };

  const renderSlotsModal = (type) => {
    const { filteredCleaners, datesToScan } = filteredDataInView;
    const slots = [];
    const weekCleanerMap = new Map();
    filteredCleaners.forEach(c => {
        const weekKey = c.weekStarting || 'no_week';
        if (!weekCleanerMap.has(weekKey)) weekCleanerMap.set(weekKey, []);
        weekCleanerMap.get(weekKey).push(c);
    });
    
    datesToScan.forEach(date => {
      const dayPrefix = getDayOfWeekAbbrev(date);
      const weekString = getMonday(date).toISOString().split('T')[0];
      const cleanersForThisWeek = weekCleanerMap.get(weekString) || [];
      cleanersForThisWeek.forEach(cleaner => {
        hourlySlots.forEach(hour => {
          const status = cleaner[`${dayPrefix}_${hour}`];
          if ((type === 'open' && status === 'AVAILABLE') || (type === 'booked' && status?.startsWith('BOOKED'))) {
            slots.push({ id: `${cleaner.id}-${dayPrefix}-${hour}`, date, hour, cleaner });
          }
        });
      });
    });

    return renderStatDetailModal(
      `${type === 'open' ? 'Open' : 'Booked'} Slots`,
      slots,
      (slot) => React.createElement('div', { key: slot.id, className: 'bg-gray-50 rounded-lg p-3' },
        React.createElement('div', { className: 'font-semibold' }, `${slot.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${slot.hour}`),
        React.createElement('div', { className: 'text-sm text-gray-600' }, `Cleaner: ${slot.cleaner.name} (${slot.cleaner.region})`)
      ),
      () => type === 'open' ? setShowOpenSlotsModal(false) : setShowBookedModal(false)
    );
  };


  if (loading && availabilityData.length === 0) {
    return React.createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-4xl mb-4' }, '🧹'),
        React.createElement('div', { className: 'text-xl font-semibold text-gray-700' }, 'Loading DustBusters Calendar...'),
        React.createElement('div', { className: 'text-sm text-gray-500 mt-2' }, 'Connecting to your data...')
      )
    );
  }
  
  const availableLabel =
    view === 'daily' ? 'Available Today' :
    view === 'monthly' ? 'Available This Month' :
    'Available This Week';

  return React.createElement('div', { className: 'min-h-screen bg-gray-50 p-5' },
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 flex items-center justify-between' },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('div', { className: 'text-3xl' }, '🧹'),
          React.createElement('div', null,
            React.createElement('h1', { className: 'text-2xl font-bold text-gray-800' }, 'DustBusters Scheduling Calendar'),
            lastSync && React.createElement('p', { className: 'text-xs text-gray-500' }, 
              `Last updated ${lastSync.toLocaleTimeString()}`
            )
          )
        ),
        React.createElement('button', {
          onClick: loadAvailabilityData,
          disabled: loading,
          className: 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50'
        },
          loading ? '↻ Refreshing...' : '↻ Refresh'
        )
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-sm p-4 flex items-center gap-4 text-white' },
        React.createElement('div', { className: 'text-2xl' }, '🤖'),
        React.createElement('div', { className: 'flex-1' },
          React.createElement('div', { className: 'font-semibold' }, 'AI Assistant Active'),
          React.createElement('div', { className: 'text-sm opacity-90' }, 'Click any time slot to get AI-powered scheduling suggestions')
        ),
        React.createElement('button', { 
          className: 'px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-sm hover:bg-gray-50',
          onClick: () => alert('AI Assistant coming soon!')
        }, 'Ask AI')
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'grid grid-cols-4 gap-4' },
        React.createElement('div', { 
            className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors',
            onClick: () => { setCleanerModalRegionFilter('all'); setShowCleanersModal(true); }
          },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.totalCleaners)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors', onClick: () => setShowAvailableModal(true) },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, availableLabel),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.cleanersAvailable)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors', onClick: () => setShowBookedModal(true) },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.bookedSlots)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-colors', onClick: () => setShowOpenSlotsModal(true) },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Open Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.openSlots)
        )
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'relative' },
          React.createElement('span', { className: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400', style: { fontSize: '16px' } }, '🔍'),
          React.createElement('input', { type: 'text', placeholder: 'Search cleaners by name, region, or notes...', value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: 'w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none' })
        )
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        React.createElement('div', { className: 'flex gap-3 mb-4' },
          ['daily', 'weekly', 'monthly'].map(v => React.createElement('button', { key: v, onClick: () => handleViewChange(v), className: `px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}` }, `${v.charAt(0).toUpperCase() + v.slice(1)} View`))
        ),
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', { className: 'flex gap-3 flex-wrap' },
            availableRegions.map(region => {
              const color = getRegionColor(region);
              const emoji = region === 'all' ? '' : getRegionEmoji(region.charAt(0).toUpperCase() + region.slice(1));
              const label = region === 'all' ? 'All Regions' : `${emoji} ${region.charAt(0).toUpperCase() + region.slice(1)}`;
              return React.createElement('button', { key: region, onClick: () => setSelectedRegion(region.toLowerCase()), className: `px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${selectedRegion === region.toLowerCase() ? `bg-${color}-500 text-white` : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`}` }, label);
            })
          ),
          React.createElement('div', { className: 'flex items-center gap-2 relative' },
            React.createElement('button', { onClick: () => {
              if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() - 86400000));
              else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() - 604800000));
              else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
            }, className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, '←'),
            React.createElement('button', { onClick: () => {
              let initialDate;
              if (view === 'daily') initialDate = selectedDay;
              else if (view === 'weekly') initialDate = currentWeek;
              else initialDate = currentMonth;
              setDatePickerMonth(initialDate);
              setShowDatePicker(!showDatePicker);
            }, className: 'px-4 py-2 font-semibold text-gray-800 min-w-[250px] text-center text-sm cursor-pointer hover:bg-gray-100 rounded-md' },
              view === 'daily' ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) :
              view === 'weekly' ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` :
              currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            ),
             React.createElement('button', { onClick: () => {
              const today = new Date();
              setSelectedDay(today);
              setCurrentWeek(getMonday(today));
              setCurrentMonth(today);
            }, className: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium' }, 'Today'),
            React.createElement('button', { onClick: () => {
              if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() + 86400000));
              else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() + 604800000));
              else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
            }, className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, '→'),
            showDatePicker && renderDatePicker()
          )
        )
      )
    ),
    view === 'daily' && React.createElement('div', { className: 'max-w-7xl mx-auto' }, /* ... daily view JSX ... */ ),
    view === 'weekly' && React.createElement('div', { className: 'max-w-7xl mx-auto' }, /* ... weekly view JSX ... */ ),
    view === 'monthly' && React.createElement('div', { className: 'max-w-7xl mx-auto' }, /* ... monthly view JSX ... */ ),
    showModal && selectedSlot && React.createElement('div', { /* ... slot detail modal ... */ }),
    showCleanersModal && renderCleanersModal(),
    showAvailableModal && renderAvailableModal(),
    showBookedModal && renderSlotsModal('booked'),
    showOpenSlotsModal && renderSlotsModal('open')
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
