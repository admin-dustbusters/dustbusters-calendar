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
      .filter(c => !lowerQuery || c.name?.toLowerCase().includes(lowerQuery) || c.fullName?.toLowerCase().includes(lowerQuery) || c.region?.toLowerCase().includes(lowerQuery) || c.notes?.toLowerCase().includes(lowerQuery));
    let datesToScan = [];
    if (view === 'daily') {
      datesToScan = [selectedDay];
    } else if (view === 'weekly') {
      datesToScan = Array.from({ length: 7 }, (_, i) => { const d = new Date(currentWeek); d.setDate(d.getDate() + i); return d; });
    } else if (view === 'monthly') {
      const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      datesToScan = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    }
    return { filteredCleaners, datesToScan };
  }, [view, selectedDay, currentWeek, currentMonth, availabilityData, selectedRegion, searchQuery]);

  useEffect(() => {
    const { filteredCleaners, datesToScan } = filteredDataInView;
    let openSlots = 0, bookedSlots = 0;
    const availableCleanerIds = new Set();
    const weekCleanerMap = new Map();
    filteredCleaners.forEach(c => {
        const weekKey = c.weekStarting || 'no_week';
        if (!weekCleanerMap.has(weekKey)) weekCleanerMap.set(weekKey, []);
        weekCleanerMap.get(weekKey).push(c);
    });
    datesToScan.forEach(date => {
      const dayPrefix = getDayOfWeekAbbrev(date);
      const weekString = getMonday(date).toISOString().split('T')[0];
      (weekCleanerMap.get(weekString) || []).forEach(cleaner => {
        hourlySlots.forEach(hour => {
          const status = cleaner[`${dayPrefix}_${hour}`];
          if (status === 'AVAILABLE') { openSlots++; availableCleanerIds.add(cleaner.id); }
          else if (status?.startsWith('BOOKED')) bookedSlots++;
        });
      });
    });
    setDynamicStats({
      totalCleaners: new Set(filteredCleaners.map(c => c.id)).size,
      cleanersAvailable: availableCleanerIds.size,
      bookedSlots, openSlots,
    });
  }, [filteredDataInView]);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeBlocks = [ { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] }, { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] }, { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] } ];
  const getDayOfWeekAbbrev = date => date.getDay() === 0 ? 'Sun' : dayAbbrev[date.getDay() - 1];
  const getWeekDates = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(currentWeek); d.setDate(d.getDate() + i); return d; });
  const getCalendarDays = date => { const y = date.getFullYear(), m = date.getMonth(), d = []; for (let i = 0; i < new Date(y, m, 1).getDay(); i++) d.push(null); for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) d.push(new Date(y, m, i)); return d; };
  const weekDates = getWeekDates();
  const monthDays = getCalendarDays(currentMonth);

  const getCleanersForSlot = (date, blockIdOrHour) => {
    const dayPrefix = getDayOfWeekAbbrev(date), weekString = getMonday(date).toISOString().split('T')[0], lowerQuery = searchQuery.toLowerCase();
    let filtered = availabilityData.filter(c => (c.weekStarting ? c.weekStarting === weekString : true) && (selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion) && (!lowerQuery || c.name?.toLowerCase().includes(lowerQuery) || c.fullName?.toLowerCase().includes(lowerQuery) || c.region?.toLowerCase().includes(lowerQuery) || c.notes?.toLowerCase().includes(lowerQuery)));
    const isHourly = hourlySlots.includes(blockIdOrHour);
    if (isHourly) { const field = `${dayPrefix}_${blockIdOrHour}`; return { available: filtered.filter(c => c[field] === 'AVAILABLE'), booked: filtered.filter(c => c[field]?.startsWith('BOOKED')) }; }
    else { const block = timeBlocks.find(b => b.id === blockIdOrHour); return { available: filtered.filter(c => block.hours.every(h => c[`${dayPrefix}_${h}`] === 'AVAILABLE')), booked: filtered.filter(c => block.hours.some(h => c[`${dayPrefix}_${h}`]?.startsWith('BOOKED'))) }; }
  };
  
  const getAvailableCleanersForDay = date => { const { filteredCleaners } = filteredDataInView; const dayPrefix = getDayOfWeekAbbrev(date), weekString = getMonday(date).toISOString().split('T')[0], available = new Map(), cleanersForWeek = filteredCleaners.filter(c => c.weekStarting ? c.weekStarting === weekString : true); cleanersForWeek.forEach(c => { for (const h of hourlySlots) if (c[`${dayPrefix}_${h}`] === 'AVAILABLE') { if (!available.has(c.id)) available.set(c.id, c); break; } }); return Array.from(available.values()); };
  const openSlotDetails = (date, blockIdOrHour) => { const { available, booked } = getCleanersForSlot(date, blockIdOrHour); setSelectedSlot({ day: date.toLocaleDateString('en-US', { weekday: 'long' }), date, block: hourlySlots.includes(blockIdOrHour) ? { label: blockIdOrHour, time: blockIdOrHour } : timeBlocks.find(b => b.id === blockIdOrHour), available, booked, isHourly: hourlySlots.includes(blockIdOrHour) }); setShowModal(true); };
  const handleViewChange = v => { if (v === 'daily') { if (view === 'weekly') setSelectedDay(currentWeek); else if (view === 'monthly' && (selectedDay.getFullYear() !== currentMonth.getFullYear() || selectedDay.getMonth() !== currentMonth.getMonth())) setSelectedDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)); } else if (v === 'weekly') { if (view === 'daily') setCurrentWeek(getMonday(selectedDay)); else if (view === 'monthly') setCurrentWeek(getMonday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))); } else if (v === 'monthly') { if (view === 'daily') setCurrentMonth(selectedDay); else if (view === 'weekly') setCurrentMonth(currentWeek); } setView(v); };
  const availableRegions = useMemo(() => { const r = new Set(); availabilityData.forEach(c => { if (c.region?.trim()) r.add(c.region); if (Array.isArray(c.regions)) c.regions.forEach(reg => { if (reg?.trim()) r.add(reg); }); }); return ['all', ...Array.from(r).sort()]; }, [availabilityData]);
  const getRegionColor = r => { const l = r?.toLowerCase(), s = { 'all': 'teal', 'charlotte': 'yellow', 'raleigh': 'stone', 'triad': 'purple' }; if (s[l]) return s[l]; const f = ['pink', 'indigo', 'cyan', 'lime', 'orange']; let h = 0; if (l) for (let i = 0; i < l.length; i++) h = l.charCodeAt(i) + ((h << 5) - h); return f[Math.abs(h % f.length)]; };
  const getRegionEmoji = r => ({ 'Charlotte': '🟡', 'Triad': '🟣', 'Raleigh': '🟤', 'Asheville': '⛰️', 'Wilmington': '🌊', 'Durham': '🐂' }[r] || '📍');

  const handleSmartSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;
      const parsedDate = new Date(query);
      if (!isNaN(parsedDate.getTime()) && (query.match(/[a-zA-Z]/) || query.match(/\//) || query.match(/-/))) {
        setSelectedDay(parsedDate);
        setCurrentWeek(getMonday(parsedDate));
        setCurrentMonth(parsedDate);
        setView('daily');
        return;
      }
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthIndex = monthNames.findIndex(m => query.toLowerCase().startsWith(m));
      if (monthIndex !== -1) {
          const newMonth = new Date(new Date().getFullYear(), monthIndex, 1);
          setCurrentMonth(newMonth);
          setView('monthly');
          return;
      }
    }
  };

  const smartSearchResults = useMemo(() => {
    if (!searchQuery) return null;
    const lowerQuery = searchQuery.toLowerCase();
    const uniqueCleaners = Array.from(new Map(availabilityData.map(c => [c.id, c])).values());
    const matchingCleaners = uniqueCleaners.filter(c => c.name?.toLowerCase().includes(lowerQuery) || c.fullName?.toLowerCase().includes(lowerQuery) || c.region?.toLowerCase().includes(lowerQuery) || c.notes?.toLowerCase().includes(lowerQuery));
    if (matchingCleaners.length > 0 && matchingCleaners.length < uniqueCleaners.length) {
      return matchingCleaners.map(cleaner => {
        const availableDates = new Set();
        availabilityData.filter(entry => entry.id === cleaner.id).forEach(entry => {
          if (!entry.weekStarting) return;
          const weekStart = new Date(entry.weekStarting + 'T00:00:00');
          for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dayPrefix = getDayOfWeekAbbrev(date);
            if (hourlySlots.some(hour => entry[`${dayPrefix}_${hour}`] === 'AVAILABLE')) {
              availableDates.add(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }
          }
        });
        return { ...cleaner, availableDates: Array.from(availableDates) };
      });
    }
    return null;
  }, [searchQuery, availabilityData]);

  const renderDatePicker = () => { /* ... existing code, intentionally compacted ... */ };
  const renderCleanersModal = () => { /* ... existing code, intentionally compacted ... */ };
  const renderStatDetailModal = (title, data, renderItem, onClose) => { /* ... existing code, intentionally compacted ... */ };
  const renderAvailableModal = () => { /* ... existing code, intentionally compacted ... */ };
  const renderSlotsModal = (type) => { /* ... existing code, intentionally compacted ... */ };

  if (loading && availabilityData.length === 0) { return React.createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' }, React.createElement('div', { className: 'text-center' }, React.createElement('div', { className: 'text-4xl mb-4' }, '🧹'), React.createElement('div', { className: 'text-xl font-semibold text-gray-700' }, 'Loading DustBusters Calendar...'), React.createElement('div', { className: 'text-sm text-gray-500 mt-2' }, 'Connecting to your data...'))); }
  
  const availableLabel = view === 'daily' ? 'Available Today' : view === 'monthly' ? 'Available This Month' : 'Available This Week';

  return React.createElement('div', { className: 'min-h-screen bg-gray-50 p-5' },
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 flex items-center justify-between' }, React.createElement('div', { className: 'flex items-center gap-3' }, React.createElement('div', { className: 'text-3xl' }, '🧹'), React.createElement('div', null, React.createElement('h1', { className: 'text-2xl font-bold text-gray-800' }, 'DustBusters Scheduling Calendar'), lastSync && React.createElement('p', { className: 'text-xs text-gray-500' }, `Last updated ${lastSync.toLocaleTimeString()}`))), React.createElement('button', { onClick: loadAvailabilityData, disabled: loading, className: 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50' }, loading ? '↻ Refreshing...' : '↻ Refresh'))),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' }, React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-sm p-4 flex items-center gap-4 text-white' }, React.createElement('div', { className: 'text-2xl' }, '🤖'), React.createElement('div', { className: 'flex-1' }, React.createElement('div', { className: 'font-semibold' }, 'AI Assistant Active'), React.createElement('div', { className: 'text-sm opacity-90' }, 'Click any time slot to get AI-powered scheduling suggestions')), React.createElement('button', { className: 'px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-sm hover:bg-gray-50', onClick: () => alert('AI Assistant coming soon!') }, 'Ask AI'))),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' }, React.createElement('div', { className: 'grid grid-cols-4 gap-4' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50', onClick: () => { setCleanerModalRegionFilter('all'); setShowCleanersModal(true); } }, React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'), React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.totalCleaners)), React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50', onClick: () => setShowAvailableModal(true) }, React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, availableLabel), React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.cleanersAvailable)), React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50', onClick: () => setShowBookedModal(true) }, React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'), React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.bookedSlots)), React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50', onClick: () => setShowOpenSlotsModal(true) }, React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Open Slots'), React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, dynamicStats.openSlots)))),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' }, React.createElement('div', { className: 'relative' }, React.createElement('span', { className: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400', style: { fontSize: '16px' } }, '🔍'), React.createElement('input', { type: 'text', placeholder: 'Search by name/region or type a date/month and press Enter...', value: searchQuery, onChange: e => setSearchQuery(e.target.value), onKeyDown: handleSmartSearch, className: 'w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none' })), smartSearchResults && React.createElement('div', { className: 'mt-4 border-t pt-4' }, React.createElement('h3', { className: 'text-sm font-semibold text-gray-600 mb-2' }, `Found ${smartSearchResults.length} matching cleaner(s):`), React.createElement('div', { className: 'space-y-3' }, ...smartSearchResults.map(cleaner => React.createElement('div', { key: cleaner.id, className: 'bg-gray-50 p-3 rounded-lg' }, React.createElement('p', { className: 'font-semibold' }, `${cleaner.name} (${cleaner.region})`), cleaner.availableDates.length > 0 ? React.createElement('p', { className: 'text-xs text-green-700' }, `Available on: ${cleaner.availableDates.join(', ')}`) : React.createElement('p', { className: 'text-xs text-gray-500' }, 'No upcoming availability found in loaded data.'))))))),
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' }, React.createElement('div', { className: 'flex gap-3 mb-4' }, ['daily', 'weekly', 'monthly'].map(v => React.createElement('button', { key: v, onClick: () => handleViewChange(v), className: `px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}` }, `${v.charAt(0).toUpperCase() + v.slice(1)} View`))), React.createElement('div', { className: 'flex items-center justify-between' }, React.createElement('div', { className: 'flex gap-3 flex-wrap' }, availableRegions.map(region => { const color = getRegionColor(region), emoji = region === 'all' ? '' : getRegionEmoji(region.charAt(0).toUpperCase() + region.slice(1)), label = region === 'all' ? 'All Regions' : `${emoji} ${region.charAt(0).toUpperCase() + region.slice(1)}`; return React.createElement('button', { key: region, onClick: () => setSelectedRegion(region.toLowerCase()), className: `px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${selectedRegion === region.toLowerCase() ? `bg-${color}-500 text-white` : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`}` }, label); })), React.createElement('div', { className: 'flex items-center gap-2 relative' }, React.createElement('button', { onClick: () => { if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() - 86400000)); else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() - 604800000)); else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)); }, className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, '←'), React.createElement('button', { onClick: () => { let initialDate; if (view === 'daily') initialDate = selectedDay; else if (view === 'weekly') initialDate = currentWeek; else initialDate = currentMonth; setDatePickerMonth(initialDate); setShowDatePicker(!showDatePicker); }, className: 'px-4 py-2 font-semibold text-gray-800 min-w-[250px] text-center text-sm cursor-pointer hover:bg-gray-100 rounded-md' }, view === 'daily' ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : view === 'weekly' ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })), React.createElement('button', { onClick: () => { const today = new Date(); setSelectedDay(today); setCurrentWeek(getMonday(today)); setCurrentMonth(today); }, className: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium' }, 'Today'), React.createElement('button', { onClick: () => { if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() + 86400000)); else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() + 604800000)); else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)); }, className: 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, '→'), showDatePicker && renderDatePicker()))))),
    view === 'daily' && React.createElement('div', { className: 'max-w-7xl mx-auto' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-7 overflow-x-auto' }, React.createElement('div', { className: 'min-w-[1000px]' }, (() => { const weekString = getMonday(selectedDay).toISOString().split('T')[0], lowerQuery = searchQuery.toLowerCase(); let filtered = availabilityData.filter(c => (c.weekStarting ? c.weekStarting === weekString : true) && (selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion) && (!lowerQuery || c.name?.toLowerCase().includes(lowerQuery) || c.fullName?.toLowerCase().includes(lowerQuery) || c.region?.toLowerCase().includes(lowerQuery) || c.notes?.toLowerCase().includes(lowerQuery))); if (filtered.length === 0) return React.createElement('div', { className: 'text-center py-12 text-gray-500' }, 'No cleaners found for this day.'); return React.createElement('div', { className: 'grid gap-px bg-gray-300 border border-gray-300', style: { gridTemplateColumns: `150px repeat(${filtered.length}, 1fr)` } }, React.createElement('div', { className: 'bg-gray-800 text-white p-4 font-semibold text-center text-sm' }, 'Time'), ...filtered.map(c => React.createElement('div', { key: c.id, className: 'bg-gray-800 text-white p-4 font-semibold text-center text-sm' }, React.createElement('div', { className: 'font-medium' }, c.name), React.createElement('div', { className: 'text-xs font-normal opacity-80 mt-1' }, c.region))), ...hourlySlots.flatMap(hour => [React.createElement('div', { key: `time-${hour}`, className: 'bg-gray-700 text-white p-4 flex items-center justify-center font-medium text-sm' }, hour), ...filtered.map(c => { const dayPrefix = getDayOfWeekAbbrev(selectedDay), status = c[`${dayPrefix}_${hour}`], isAvailable = status === 'AVAILABLE', isBooked = status?.startsWith('BOOKED'); return React.createElement('div', { key: `${c.id}-${hour}`, onClick: () => openSlotDetails(selectedDay, hour), className: `p-4 cursor-pointer hover:opacity-80 transition-all flex items-center justify-center ${isAvailable ? 'bg-green-500' : isBooked ? 'bg-red-500' : 'bg-gray-300'}` }, React.createElement('div', { className: 'text-white text-center font-bold text-lg' }, isAvailable ? '✓' : isBooked ? '✗' : '—')); })])); })()))),
    view === 'weekly' && React.createElement('div', { className: 'max-w-7xl mx-auto' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-7 overflow-x-auto' }, React.createElement('div', { className: 'min-w-[1200px]' }, React.createElement('div', { className: 'grid grid-cols-8 gap-px bg-gray-300 border border-gray-300 mb-px' }, React.createElement('div', { className: 'bg-gray-800 text-white p-4 font-semibold text-center text-sm' }, 'Time Slot'), ...dayNames.map((day, idx) => { const date = weekDates[idx]; return React.createElement('div', { key: idx, onClick: () => { setSelectedDay(date); setView('daily'); }, className: 'bg-gray-800 text-white p-4 font-semibold text-center text-sm cursor-pointer hover:bg-blue-500 transition-colors' }, day, React.createElement('div', { className: 'text-xs font-normal opacity-80 mt-1' }, date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))); })), ...timeBlocks.map(block => React.createElement('div', { key: block.id, className: 'grid grid-cols-8 gap-px bg-gray-300 border-l border-r border-b border-gray-300' }, React.createElement('div', { className: 'bg-gray-700 text-white p-4 flex flex-col justify-center' }, React.createElement('div', { className: 'font-medium text-sm' }, `${block.emoji} ${block.label}`), React.createElement('div', { className: 'text-xs opacity-80 mt-1' }, block.time)), ...weekDates.map((date, dayIdx) => { const { available, booked } = getCleanersForSlot(date, block.id); const total = available.length + booked.length; return React.createElement('div', { key: dayIdx, onClick: () => openSlotDetails(date, block.id), className: 'bg-white p-3 min-h-[100px] relative cursor-pointer hover:bg-gray-50 transition-colors' }, total > 0 && React.createElement('div', { className: 'absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full' }, total), React.createElement('div', { className: 'flex flex-wrap gap-1' }, ...available.slice(0, 6).map(c => React.createElement('div', { key: c.id, className: 'inline-block px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:scale-105 transition-transform cursor-pointer', title: c.name }, c.name)), ...booked.slice(0, 3).map(c => React.createElement('div', { key: c.id, className: 'inline-block px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium', title: c.name }, c.name)), total === 0 && React.createElement('div', { className: 'text-gray-400 text-xs italic' }, 'No availability'))); }))))))),
    view === 'monthly' && React.createElement('div', { className: 'max-w-7xl mx-auto' }, React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-7' }, React.createElement('div', { className: 'grid grid-cols-7 gap-2' }, ...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => React.createElement('div', { key: day, className: 'bg-gray-800 text-white p-3 font-semibold text-center text-sm rounded-lg' }, day)), ...monthDays.map((date, idx) => { if (!date) return React.createElement('div', { key: `empty-${idx}`, className: 'bg-gray-50 rounded-lg' }); const availableCleaners = getAvailableCleanersForDay(date), isToday = date.toDateString() === new Date().toDateString(); return React.createElement('div', { key: idx, onClick: () => { setSelectedDay(date); setView('daily'); }, className: `border-2 rounded-lg p-2 min-h-[120px] cursor-pointer hover:border-blue-500 transition-colors ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}` }, React.createElement('div', { className: 'font-semibold text-gray-800 mb-2 text-sm' }, date.getDate()), React.createElement('div', { className: 'flex flex-wrap gap-1' }, ...availableCleaners.slice(0, 5).map(c => React.createElement('div', { key: c.id, className: 'w-6 h-6 flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs font-bold', title: c.name }, getInitials(c.name))), availableCleaners.length > 5 && React.createElement('div', { className: 'w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-xs font-medium' }, `+${availableCleaners.length - 5}`))); })))),
    showModal && selectedSlot && React.createElement('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4', onClick: () => setShowModal(false) }, React.createElement('div', { className: 'bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8', onClick: e => e.stopPropagation() }, React.createElement('div', { className: 'text-2xl font-bold text-gray-800 mb-2' }, `${selectedSlot.day} ${selectedSlot.block.label}`), React.createElement('div', { className: 'text-sm text-gray-600 mb-6' }, `${selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${selectedSlot.block.time}`), React.createElement('div', { className: 'mb-6' }, React.createElement('h3', { className: 'font-semibold text-green-700 mb-3 text-lg' }, `✅ Available (${selectedSlot.available.length})`), React.createElement('div', { className: 'space-y-3' }, selectedSlot.available.length > 0 ? selectedSlot.available.map(c => React.createElement('div', { key: c.id, className: 'bg-gray-50 rounded-lg p-4' }, React.createElement('div', { className: 'flex justify-between items-start mb-2' }, React.createElement('div', { className: 'font-semibold text-gray-900' }, c.fullName || c.name), React.createElement('div', { className: 'text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded' }, c.region)), React.createElement('div', { className: 'text-sm text-gray-600 mb-1' }, c.phone || 'No phone'), React.createElement('div', { className: 'text-sm text-gray-600' }, c.rate ? `${c.rate}/hour` : 'Rate not set'))) : React.createElement('div', { className: 'text-sm text-gray-500' }, 'No cleaners available for this slot.'))), selectedSlot.booked.length > 0 && React.createElement('div', { className: 'mb-6' }, React.createElement('h3', { className: 'font-semibold text-red-700 mb-3 text-lg' }, `🔴 Booked (${selectedSlot.booked.length})`), React.createElement('div', { className: 'space-y-2' }, selectedSlot.booked.map(c => React.createElement('div', { key: c.id, className: 'bg-red-50 rounded-lg p-3 opacity-60' }, React.createElement('div', { className: 'font-medium text-gray-900' }, c.fullName || c.name), React.createElement('div', { className: 'text-xs text-red-600' }, 'Already booked'))))), React.createElement('div', { className: 'flex gap-3 mt-6' }, React.createElement('button', { onClick: () => alert('AI booking assistant coming soon!'), className: 'flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700' }, '🤖 Book with AI Assist'), React.createElement('button', { onClick: () => setShowModal(false), className: 'px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300' }, 'Close')))),
    showCleanersModal && renderCleanersModal(),
    showAvailableModal && renderAvailableModal(),
    showBookedModal && renderSlotsModal('booked'),
    showOpenSlotsModal && renderSlotsModal('open')
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
