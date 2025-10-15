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
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [networkError, setNetworkError] = useState(null);
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
    d.setHours(0, 0, 0, 0);
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

  const parseBookingDetails = (bookingString) => {
    if (!bookingString || !bookingString.startsWith('BOOKED')) {
      return null;
    }
    const parts = bookingString.split('|').map(p => p.trim());
    if (parts.length < 5) return null;
    const jobNumberMatch = parts[0].match(/#(\S+)/);
    return {
      jobNumber: jobNumberMatch ? jobNumberMatch[1] : 'N/A',
      customer: parts[1] || 'Unknown',
      region: parts[2] || 'Unknown',
      timeSlot: parts[3] || 'N/A',
      cleaners: parts[4] || 'Unknown'
    };
  };

  const parseDateFromString = (str) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lowerStr = str.toLowerCase().trim();
    if (lowerStr === 'today') return today;
    if (lowerStr === 'tomorrow') {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (lowerStr === 'yesterday') {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d;
    }
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = daysOfWeek.findIndex(day => lowerStr.includes(day));
    if (dayIndex !== -1) {
      let date = new Date(today);
      const currentDay = date.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0 && !lowerStr.includes('last')) diff += 7;
      if (diff > 0 && lowerStr.includes('last')) diff -= 7;
      date.setDate(date.getDate() + diff);
      return date;
    }
    try {
      const parsed = new Date(lowerStr);
      if (!isNaN(parsed.getTime()) && (/\d/.test(lowerStr) || lowerStr.match(/[a-z]{3,}/))) {
        if (parsed.getFullYear() > 1980) {
          parsed.setHours(0, 0, 0, 0);
          return parsed;
        }
      }
    } catch (e) {}
    const match = lowerStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      const month = parseInt(match[1], 10) - 1;
      const day = parseInt(match[2], 10);
      const year = today.getFullYear();
      let date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      if (date < today) date.setFullYear(year + 1);
      return date;
    }
    return null;
  };

  const handleSuggestionClick = (suggestion) => {
    switch (suggestion.type) {
      case 'date':
        const date = suggestion.value;
        setSelectedDay(date);
        setCurrentWeek(getMonday(date));
        setCurrentMonth(date);
        setView('daily');
        setSearchQuery('');
        break;
      case 'cleaner':
      case 'notes':
        setSearchQuery(suggestion.value);
        break;
      case 'region':
        setSelectedRegion(suggestion.value.toLowerCase());
        setSearchQuery('');
        break;
    }
    setShowSuggestions(false);
  };

  const hourlySlots = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'];

  const loadAvailabilityData = async () => {
    setLoading(true);
    setNetworkError(null);
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
      setNetworkError(`Failed to load data. Please check connection. Error: ${error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAvailabilityData();
    const interval = setInterval(loadAvailabilityData, 60000);
    return () => clearInterval(interval);
  }, []);

  const availableRegions = useMemo(() => {
    const regions = new Set();
    availabilityData.forEach(cleaner => {
      if (cleaner.region && typeof cleaner.region === 'string' && cleaner.region.trim() !== '' && cleaner.region !== 'Unknown') {
        regions.add(cleaner.region);
      }
      if (cleaner.regions && Array.isArray(cleaner.regions)) {
        cleaner.regions.forEach(r => {
          if (r && typeof r === 'string' && r.trim() !== '' && r !== 'Unknown') {
            regions.add(r);
          }
        });
      }
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const suggestions = [];
    const lowerQuery = searchQuery.toLowerCase();
    const parsedDate = parseDateFromString(lowerQuery);
    if (parsedDate) {
      suggestions.push({
        type: 'date',
        value: parsedDate,
        label: `📅 Go to date: ${parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
      });
    }
    const uniqueCleaners = Array.from(new Map(availabilityData.map(c => [c.id || c.name, c])).values());
    uniqueCleaners
      .filter(c => (c.fullName || c.name)?.toLowerCase().includes(lowerQuery))
      .slice(0, 3)
      .forEach(c => {
        suggestions.push({
          type: 'cleaner',
          value: c.fullName || c.name,
          label: `👤 Cleaner: ${c.fullName || c.name}`
        });
      });
    availableRegions
      .filter(r => r !== 'all' && r.toLowerCase().includes(lowerQuery))
      .slice(0, 2)
      .forEach(r => {
        suggestions.push({
          type: 'region',
          value: r,
          label: `📍 Filter by region: ${r.charAt(0).toUpperCase() + r.slice(1)}`
        });
      });
    suggestions.push({
      type: 'notes',
      value: searchQuery,
      label: `📝 Search notes for: "${searchQuery}"`
    });
    setSearchSuggestions(suggestions);
  }, [searchQuery, availabilityData, availableRegions]);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-11pm', hours: ['5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'] },
  ];

  const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 'Sun' : dayAbbrev[dayIndex - 1];
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

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
    const dateString = date.toISOString().split('T')[0];
    const lowerQuery = searchQuery.toLowerCase();
  
    const blockHours = blockIdOrHour === 'allDay' ? hourlySlots :
      hourlySlots.includes(blockIdOrHour) ? [blockIdOrHour] :
      timeBlocks.find(b => b.id === blockIdOrHour)?.hours || [];
  
    const availableCleaners = [];
    const bookedCleaners = [];
  
    const initiallyFiltered = availabilityData
      .filter(c => selectedRegion === 'all' || (c.regions && c.regions.some(r => r.toLowerCase() === selectedRegion)) || c.region?.toLowerCase() === selectedRegion)
      .filter(c =>
        !lowerQuery ||
        c.name?.toLowerCase().includes(lowerQuery) ||
        c.fullName?.toLowerCase().includes(lowerQuery) ||
        (c.job && c.job.customer?.toLowerCase().includes(lowerQuery))
      );
  
    initiallyFiltered.forEach(item => {
      if (item.weekStarting && item.weekStarting === weekString) {
        const isAvailable = blockHours.every(h => item[`${dayPrefix}_${h}`] === 'AVAILABLE');
        const isBooked = blockHours.some(h => item[`${dayPrefix}_${h}`]?.startsWith('BOOKED'));
  
        if (isAvailable) {
          availableCleaners.push(item);
        } else if (isBooked) {
          bookedCleaners.push(item);
        }
      } else if (item.hasSchedule === false && item.job) {
        if (item.job.date === dateString) {
          const jobOverlaps = blockHours.some(blockHour => item.job.slots.includes(blockHour));
          if (jobOverlaps) {
            bookedCleaners.push(item);
          }
        }
      }
    });
  
    const uniqueAvailable = Array.from(new Map(availableCleaners.map(c => [c.id, c])).values());
    const uniqueBooked = Array.from(new Map(bookedCleaners.map(c => [c.id || c.job.jobNumber, c])).values());
  
    return { available: uniqueAvailable, booked: uniqueBooked, total: uniqueAvailable.length + uniqueBooked.length };
  };

  const openSlotDetails = (date, blockIdOrHour) => {
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

  const handleViewChange = (newView) => {
    if (view === 'daily') {
      setCurrentWeek(getMonday(selectedDay));
      setCurrentMonth(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1));
    } else if (view === 'weekly') {
      setSelectedDay(currentWeek);
      setCurrentMonth(new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1));
    } else if (view === 'monthly') {
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      setSelectedDay(firstDayOfMonth);
      setCurrentWeek(getMonday(firstDayOfMonth));
    }
    setView(newView);
  };

  const getRegionColor = (region) => {
    const lowerRegion = region?.toLowerCase();
    const specificColors = {
      'all': 'teal', 'charlotte': 'yellow', 'raleigh': 'stone', 'triad': 'purple',
    };
    if (specificColors[lowerRegion]) return specificColors[lowerRegion];
    const fallbackColors = ['pink', 'indigo', 'cyan', 'lime', 'orange'];
    let hash = 0;
    if (lowerRegion) {
      for (let i = 0; i < lowerRegion.length; i++) {
        hash = lowerRegion.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    const index = Math.abs(hash % fallbackColors.length);
    return fallbackColors[index];
  };

  const getRegionEmoji = (region) => {
    const emojis = {
      'Charlotte': '🟡', 'Triad': '🟣', 'Raleigh': '🟤', 'Asheville': '⛰️', 'Wilmington': '🌊', 'Durham': '🐂'
    };
    return emojis[region] || '📍';
  };
  
  const renderDailyView = () => {
    const dayPrefix = getDayOfWeekAbbrev(selectedDay);
    const { available, booked } = getCleanersForSlot(selectedDay, 'allDay');
    const allItemsForDay = Array.from(new Map([...available, ...booked].map(c => [c.id || c.name, c])).values());

    if (allItemsForDay.length === 0) {
      return React.createElement('div', { className: 'text-center py-12 text-gray-500' }, 'No cleaners found for this day.');
    }

    const mergedData = allItemsForDay.map(c => {
      const bookingGroups = [];
      let currentGroup = null;
      hourlySlots.forEach((hour) => {
        let bookingDetails = null;
        if (c.hasSchedule === false && c.job && c.job.date === selectedDay.toISOString().split('T')[0] && c.job.slots.includes(hour)) {
          bookingDetails = {
            jobNumber: c.job.jobNumber,
            customer: c.job.customer,
            timeSlot: c.job.timeSlot,
            cleaners: c.job.cleanerName
          };
        } else if (c.weekStarting) {
          const status = c[`${dayPrefix}_${hour}`];
          bookingDetails = parseBookingDetails(status);
        }

        if (bookingDetails) {
          if (!currentGroup || currentGroup.jobNumber !== bookingDetails.jobNumber) {
            currentGroup = { ...bookingDetails, startHour: hour, slots: [hour] };
            bookingGroups.push(currentGroup);
          } else {
            currentGroup.slots.push(hour);
          }
        } else {
          currentGroup = null;
        }
      });
      return { cleaner: c, bookingGroups };
    });

    return React.createElement('div', { className: 'grid bg-gray-200 border border-gray-200',
        style: { gridTemplateColumns: `150px repeat(${allItemsForDay.length}, 1fr)`, gap: '1px' }
      },
      React.createElement('div', { className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-sm' }, 'Time'),
      ...allItemsForDay.map(c =>
        React.createElement('div', { key: c.id || c.name, className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-xs sm:text-sm' },
          React.createElement('div', { className: 'font-medium' }, c.fullName || c.name),
          React.createElement('div', { className: 'text-xs font-normal opacity-80 mt-1' }, c.region)
        )
      ),
      hourlySlots.map((hour) =>
        React.createElement(React.Fragment, { key: hour },
          React.createElement('div', { className: 'bg-gray-700 text-white p-3 sm:p-4 flex items-center justify-center font-medium text-sm' }, hour),
          ...mergedData.map(({ cleaner, bookingGroups }) => {
            const bookingGroup = bookingGroups.find(bg => bg.slots.includes(hour));
            if (bookingGroup && bookingGroup.startHour !== hour) return null;
            if (bookingGroup) {
              const spanCount = bookingGroup.slots.length;
              return React.createElement('div', {
                key: `${cleaner.id}-${hour}`,
                onClick: () => openSlotDetails(selectedDay, hour),
                className: 'bg-red-500 p-2 cursor-pointer hover:opacity-80 transition-all flex flex-col items-center justify-center text-white relative',
                style: { gridRow: `span ${spanCount}` }
              },
                React.createElement('div', { className: 'font-bold text-sm' }, `Job #${bookingGroup.jobNumber}`),
                React.createElement('div', { className: 'text-xs mt-1' }, bookingGroup.customer),
                React.createElement('div', { className: 'text-xs opacity-90' }, bookingGroup.timeSlot)
              );
            }
            const status = cleaner.weekStarting ? cleaner[`${dayPrefix}_${hour}`] : 'UNAVAILABLE';
            const isAvailable = status === 'AVAILABLE';
            return React.createElement('div', {
              key: `${cleaner.id}-${hour}`,
              onClick: () => openSlotDetails(selectedDay, hour),
              className: `p-3 sm:p-4 cursor-pointer hover:opacity-80 transition-all flex items-center justify-center ${isAvailable ? 'bg-green-500' : 'bg-white'}`
            },
              React.createElement('div', { className: 'text-center font-bold text-lg', style: {color: isAvailable ? 'white' : '#cbd5e1'} }, isAvailable ? '✓' : '—')
            );
          }).filter(Boolean)
        )
      )
    );
  };
  
  if (loading && availabilityData.length === 0) {
    return React.createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-4xl mb-4' }, '🧹'),
        React.createElement('div', { className: 'text-xl font-semibold text-gray-700' }, 'Loading DustBusters Calendar...'),
        networkError 
            ? React.createElement('div', { className: 'mt-4 p-3 bg-red-100 text-red-700 text-sm rounded-md' }, networkError)
            : React.createElement('div', { className: 'text-sm text-gray-500 mt-2' }, 'Connecting to your data...')
      )
    );
  }
  
  const availableLabel =
    view === 'daily' ? 'Available Today' :
    view === 'monthly' ? 'Available This Month' :
    'Available This Week';

  return React.createElement('div', { className: 'min-h-screen bg-gray-50 p-2 md:p-5' },
    networkError && React.createElement('div', { className: 'max-w-7xl mx-auto mb-4' }, 
        React.createElement('div', { className: 'p-4 bg-red-100 text-red-800 rounded-lg shadow-md' }, networkError)
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center justify-between' },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('div', { className: 'text-2xl sm:text-3xl' }, '🧹'),
          React.createElement('div', null,
            React.createElement('h1', { className: 'text-lg sm:text-2xl font-bold text-gray-800' }, 'DustBusters Calendar'),
            lastSync && React.createElement('p', { className: 'text-xs text-gray-500' }, `Last updated ${lastSync.toLocaleTimeString()}`)
          )
        ),
        React.createElement('button', {
          onClick: loadAvailabilityData,
          disabled: loading,
          className: 'flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm'
        }, loading ? 'Refreshing...' : 'Refresh')
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-sm p-4 flex items-center gap-4 text-white' },
        React.createElement('div', { className: 'text-2xl' }, '🤖'),
        React.createElement('div', { className: 'flex-1' },
          React.createElement('div', { className: 'font-semibold text-sm sm:text-base' }, 'AI Assistant Active'),
          React.createElement('div', { className: 'text-xs sm:text-sm opacity-90' }, 'Click a slot for AI suggestions')
        ),
        React.createElement('button', { className: 'px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-sm hover:bg-gray-50', onClick: () => alert('AI Assistant coming soon!')}, 'Ask AI')
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      React.createElement('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-4' },
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors',
            onClick: () => { setCleanerModalRegionFilter('all'); setShowCleanersModal(true); }
          },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'),
          React.createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.totalCleaners)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, availableLabel),
          React.createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.cleanersAvailable)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'),
          React.createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.bookedSlots)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Open Slots'),
          React.createElement('div', { className: 'text-2xl sm:text-3xl font-bold text-gray-800' }, dynamicStats.openSlots)
        )
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        React.createElement('div', { className: 'relative' },
          React.createElement('span', { className: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400', style: { fontSize: '16px' }}, '🔍'),
          React.createElement('input', { type: 'text', placeholder: 'Search cleaner, region, or date...', value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onFocus: () => setShowSuggestions(true), onBlur: () => setTimeout(() => setShowSuggestions(false), 150),
            className: 'w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none'
          }),
          renderSearchSuggestions()
        )
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-4' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-4' },
        React.createElement('div', { className: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4' },
          React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center gap-3' },
            React.createElement('div', {className: 'flex items-center gap-2'},
              ['daily', 'weekly', 'monthly'].map(v =>
                React.createElement('button', { key: v, onClick: () => handleViewChange(v),
                  className: `px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }, v.charAt(0).toUpperCase() + v.slice(1))
              )
            ),
            React.createElement('div', { className: 'flex gap-2 flex-wrap' },
              availableRegions.map(region => {
                const color = getRegionColor(region);
                const emoji = region === 'all' ? '' : getRegionEmoji(region.charAt(0).toUpperCase() + region.slice(1));
                const fullLabel = region === 'all' ? 'All Regions' : `${emoji} ${region.charAt(0).toUpperCase() + region.slice(1)}`;
                return React.createElement('button', { key: region, onClick: () => setSelectedRegion(region.toLowerCase()),
                  className: `px-3 py-2.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-colors ${ selectedRegion === region.toLowerCase() ? `bg-${color}-500 text-white` : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100` }`
                }, fullLabel);
              })
            )
          ),
          React.createElement('div', { className: 'flex items-center gap-2 relative self-center' },
            React.createElement('button', { onClick: () => { if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() - 86400000)); else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() - 604800000)); else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)); },
              className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
            }, '←'),
            React.createElement('button', { onClick: () => { let initialDate; if (view === 'daily') initialDate = selectedDay; else if (view === 'weekly') initialDate = currentWeek; else initialDate = currentMonth; setDatePickerMonth(initialDate); setShowDatePicker(!showDatePicker); },
                className: 'px-2 py-2 font-semibold text-gray-800 w-36 sm:w-auto sm:min-w-[250px] text-center text-sm cursor-pointer hover:bg-gray-100 rounded-md border border-gray-300'
            },
              view === 'daily' ? selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
              view === 'weekly' ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
              currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            ),
             React.createElement('button', { onClick: () => { const today = new Date(); setSelectedDay(today); setCurrentWeek(getMonday(today)); setCurrentMonth(today); },
              className: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium'
            }, 'Today'),
            React.createElement('button', { onClick: () => { if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() + 86400000)); else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() + 604800000)); else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)); },
              className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
            }, '→'),
            showDatePicker && renderDatePicker()
          )
        )
      )
    ),
    view === 'weekly' && React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7 overflow-x-auto' },
        React.createElement('div', { className: 'min-w-[1200px]' },
          React.createElement('div', { className: 'grid grid-cols-8 gap-px bg-gray-300 border border-gray-300 mb-px' },
            React.createElement('div', { className: 'bg-gray-800 text-white p-4 font-semibold text-center text-sm' }, 'Time Slot'),
            ...dayNames.map((day, idx) => {
              const date = weekDates[idx];
              const isToday = date.toDateString() === new Date().toDateString();
              return React.createElement('div', { key: idx, onClick: () => { setSelectedDay(date); setView('daily'); },
                className: `p-3 sm:p-4 font-semibold text-center text-sm cursor-pointer hover:opacity-80 transition-colors ${isToday ? 'bg-yellow-300 text-yellow-800' : 'bg-gray-800 text-white hover:bg-blue-500'}`
              }, day.substring(0,3), React.createElement('div', { className: 'text-xs font-normal mt-1' }, date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })));
            })
          ),
          ...timeBlocks.map((block) =>
            React.createElement('div', { key: block.id, className: 'grid grid-cols-8 gap-px bg-gray-300 border-l border-r border-b border-gray-300' },
              React.createElement('div', { className: 'bg-gray-700 text-white p-4 flex flex-col justify-center' },
                React.createElement('div', { className: 'font-medium text-sm' }, `${block.emoji} ${block.label}`),
                React.createElement('div', { className: 'text-xs opacity-80 mt-1' }, block.time)
              ),
              ...weekDates.map((date, dayIdx) => {
                const { available, booked } = getCleanersForSlot(date, block.id);
                const total = available.length + booked.length;
                const isToday = date.toDateString() === new Date().toDateString();
                return React.createElement('div', { key: dayIdx, onClick: () => openSlotDetails(date, block.id),
                  className: `p-2 sm:p-3 min-h-[90px] sm:min-h-[100px] relative cursor-pointer hover:bg-gray-100 transition-colors ${isToday ? 'bg-yellow-50' : 'bg-white'}`
                },
                  total > 0 && React.createElement('div', { className: 'absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full' }, total),
                  React.createElement('div', { className: 'flex flex-wrap gap-1' },
                    ...available.slice(0, 4).map((cleaner) => React.createElement('div', { key: cleaner.id, className: 'inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium', title: cleaner.name }, cleaner.name)),
                    ...booked.slice(0, 4).map((item) => React.createElement('div', { key: item.id || item.job.jobNumber, className: 'inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium', title: item.hasSchedule === false ? `${item.job.cleanerName} - ${item.job.customer}` : item.name },
                        item.hasSchedule === false ? item.job.customer : item.name
                    )),
                    total === 0 && React.createElement('div', { className: 'text-gray-400 text-xs italic' }, 'No activity')
                  )
                );
              })
            )
          )
        )
      )
    ),
    view === 'daily' && React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7' },
        React.createElement('div', { className: 'overflow-x-auto' },
          React.createElement('div', { className: 'min-w-[1000px]' }, renderDailyView())
        )
      )
    ),
    view === 'monthly' && React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7' },
        React.createElement('div', { className: 'grid grid-cols-7 gap-1 sm:gap-2' },
          ...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => React.createElement('div', { key: day, className: 'bg-gray-800 text-white p-2 sm:p-3 font-semibold text-center text-xs sm:text-sm rounded-lg' }, day)),
          ...monthDays.map((date, idx) => {
            if (!date) return React.createElement('div', { key: `empty-${idx}`, className: 'bg-gray-50 rounded-lg' });
            const { available, booked } = getCleanersForSlot(date, 'allDay');
            const isToday = date.toDateString() === new Date().toDateString();
            return React.createElement('div', { key: idx, onClick: () => { setSelectedDay(date); setView('daily'); },
              className: `border-2 rounded-lg p-2 min-h-[80px] sm:min-h-[120px] cursor-pointer hover:border-blue-500 transition-colors ${isToday ? 'border-yellow-400 bg-yellow-100' : 'border-gray-200 bg-white'}`
            },
              React.createElement('div', { className: `font-semibold mb-2 text-sm ${isToday ? 'text-yellow-700' : 'text-gray-800'}` }, date.getDate()),
              (available.length > 0 || booked.length > 0) && React.createElement('div', { className: 'flex flex-wrap gap-1' },
                ...available.slice(0, 3).map(cleaner => React.createElement('div', { key: cleaner.id, className: 'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs font-bold', title: cleaner.name }, getInitials(cleaner.name))),
                ...booked.slice(0, 3).map(item => React.createElement('div', { key: item.id || item.job.jobNumber, className: 'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-red-100 text-red-800 rounded-full text-xs font-bold', title: item.hasSchedule === false ? item.job.customer : item.name }, getInitials(item.hasSchedule === false ? item.job.customer : item.name))),
                (available.length + booked.length > 3) && React.createElement('div', { className: 'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-xs font-medium' }, `+${(available.length + booked.length) - 3}`)
              )
            );
          })
        )
      )
    ),
    showModal && selectedSlot && React.createElement('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4', onClick: () => setShowModal(false) },
      React.createElement('div', { className: 'bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto p-6 md:p-8', onClick: (e) => e.stopPropagation() },
        React.createElement('div', { className: 'text-xl md:text-2xl font-bold text-gray-800 mb-2' }, `${selectedSlot.day} ${selectedSlot.block.label}`),
        React.createElement('div', { className: 'text-sm text-gray-600 mb-6' }, `${selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${selectedSlot.block.time}`),
        React.createElement('div', { className: 'mb-6' },
          React.createElement('h3', { className: 'font-semibold text-green-700 mb-3 text-lg' }, `✅ Available (${selectedSlot.available.length})`),
          React.createElement('div', { className: 'space-y-3' },
            selectedSlot.available.length > 0 ? selectedSlot.available.map(c =>
              React.createElement('div', { key: c.id, className: 'bg-gray-50 rounded-lg p-4' },
                React.createElement('div', { className: 'flex justify-between items-start mb-2' },
                  React.createElement('div', { className: 'font-semibold text-gray-900' }, c.fullName || c.name),
                  React.createElement('div', { className: 'text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded' }, c.region)
                ),
                React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, c.phone || 'No phone'),
                React.createElement('div', { className: 'text-sm text-gray-600' }, c.rate ? (typeof c.rate === 'number' ? `$${c.rate}/hour` : `${c.rate}`) : 'Rate not set')
              )
            ) : React.createElement('div', {className: 'text-sm text-gray-500'}, 'No cleaners available for this slot.')
          )
        ),
        selectedSlot.booked.length > 0 && React.createElement('div', { className: 'mb-6' },
          React.createElement('h3', { className: 'font-semibold text-red-700 mb-3 text-lg' }, `🔴 Booked (${selectedSlot.booked.length})`),
          React.createElement('div', { className: 'space-y-3' },
            selectedSlot.booked.map(c => {
              const isStickyNote = c.hasSchedule === false;
              let bookingDetails;
              if (isStickyNote) {
                bookingDetails = {
                  jobNumber: c.job.jobNumber, customer: c.job.customer, region: c.region || 'Unknown', timeSlot: c.job.timeSlot, address: c.job.address
                };
              } else {
                const dayPrefix = getDayOfWeekAbbrev(selectedSlot.date);
                const firstBookedHour = selectedSlot.isHourly ? selectedSlot.block.label : selectedSlot.block.hours.find(h => c[`${dayPrefix}_${h}`]?.startsWith('BOOKED'));
                const bookingString = c[`${dayPrefix}_${firstBookedHour}`];
                bookingDetails = parseBookingDetails(bookingString);
              }
              return React.createElement('div', { key: c.id || c.job.jobNumber, className: 'bg-red-50 rounded-lg p-4 border-2 border-red-200' },
                React.createElement('div', { className: 'flex justify-between items-start mb-2' },
                  React.createElement('div', { className: 'font-semibold text-gray-900' }, c.fullName || c.name),
                  React.createElement('div', { className: 'text-xs px-2 py-1 bg-red-200 text-red-800 rounded font-bold' }, bookingDetails ? `Job #${bookingDetails.jobNumber}` : 'Booked')
                ),
                bookingDetails && React.createElement('div', { className: 'space-y-1 mt-3 text-sm' },
                  React.createElement('div', { className: 'text-gray-700' }, React.createElement('span', { className: 'font-semibold' }, '👤 Customer: '), bookingDetails.customer),
                  React.createElement('div', { className: 'text-gray-700' }, React.createElement('span', { className: 'font-semibold' }, '📍 Region: '), bookingDetails.region),
                  React.createElement('div', { className: 'text-gray-700' }, React.createElement('span', { className: 'font-semibold' }, '⏰ Time: '), bookingDetails.timeSlot),
                  bookingDetails.address && React.createElement('div', { className: 'text-gray-700' }, React.createElement('span', { className: 'font-semibold' }, '🏠 Address: '), bookingDetails.address)
                )
              );
            })
          )
        ),
        React.createElement('div', { className: 'flex flex-col sm:flex-row gap-3 mt-6' },
          React.createElement('button', { onClick: () => alert('AI booking assistant coming soon!'), className: 'flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700' }, '🤖 Book with AI Assist'),
          React.createElement('button', { onClick: () => setShowModal(false), className: 'px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300' }, 'Close')
        )
      )
    ),
    showCleanersModal && React.createElement(/* Cleaner modal JSX... */)
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
