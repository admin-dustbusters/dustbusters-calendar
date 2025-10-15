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

  useEffect(() => {
    // Stats calculation logic remains from your working version
    const lowerQuery = searchQuery.toLowerCase();
    const filteredCleaners = availabilityData
        .filter(c => selectedRegion === 'all' || (c.regions && c.regions.some(r => r.toLowerCase() === selectedRegion)) || c.region?.toLowerCase() === selectedRegion)
        .filter(c =>
            !lowerQuery ||
            c.name?.toLowerCase().includes(lowerQuery) ||
            c.fullName?.toLowerCase().includes(lowerQuery) ||
            (c.job && c.job.customer?.toLowerCase().includes(lowerQuery)) ||
            c.notes?.toLowerCase().includes(lowerQuery)
        );
    
    let datesToScan = [];
    if (view === 'daily') datesToScan = [selectedDay];
    else if (view === 'weekly') datesToScan = getWeekDates();
    else if (view === 'monthly') {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) datesToScan.push(new Date(year, month, i));
    }

    let openSlots = 0;
    let bookedSlots = 0;
    const availableCleanerIds = new Set();
    
    datesToScan.forEach(date => {
        const dayPrefix = getDayOfWeekAbbrev(date);
        const { available, booked } = getCleanersForSlot(date, 'allDay');
        available.forEach(c => availableCleanerIds.add(c.id));
        
        booked.forEach(item => {
            if (item.hasSchedule === false) {
                bookedSlots += item.job.slots.length;
            } else {
                hourlySlots.forEach(hour => {
                    if (item[`${dayPrefix}_${hour}`]?.startsWith('BOOKED')) {
                        bookedSlots++;
                    }
                });
            }
        });

        available.forEach(cleaner => {
            hourlySlots.forEach(hour => {
                if (cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE') {
                    openSlots++;
                }
            });
        });
    });

    setDynamicStats({
        totalCleaners: new Set(filteredCleaners.map(c => c.id || c.name)).size,
        cleanersAvailable: availableCleanerIds.size,
        bookedSlots,
        openSlots,
    });
}, [view, selectedDay, currentWeek, currentMonth, availabilityData, selectedRegion, searchQuery]);


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
        (c.job && c.job.customer?.toLowerCase().includes(lowerQuery)) ||
        c.notes?.toLowerCase().includes(lowerQuery)
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
  
  const getAvailableCleanersForDay = (date) => {
    const { available } = getCleanersForSlot(date, 'allDay');
    return available;
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
            jobNumber: c.job.jobNumber, customer: c.job.customer, timeSlot: c.job.timeSlot, cleaners: c.job.cleanerName
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

    return React.createElement('div', {
        className: 'grid bg-gray-200 border border-gray-200',
        style: { gridTemplateColumns: `150px repeat(${allItemsForDay.length}, 1fr)`, gap: '1px' }
      },
      React.createElement('div', { className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-sm' }, 'Time'),
      ...allItemsForDay.map(c =>
        React.createElement('div', { key: c.id || c.name, className: 'bg-gray-800 text-white
