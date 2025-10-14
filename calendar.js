const { useState, useEffect, useMemo } = React;

// The n8n webhook URL is correctly kept from your original file.
const N8N_WEBHOOK_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';

const DustBustersCalendar = () => {
  // All your state and logic are preserved.
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

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

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
    // Sunday is 0, so we adjust to match the typical calendar layout.
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const weekDates = getWeekDates();
  const monthDays = getMonthDays();

  const getCleanersForSlot = (date, blockIdOrHour) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    
    const weekMonday = getMonday(date);
    const weekString = weekMonday.toISOString().split('T')[0];
    
    let filtered = availabilityData.filter(c => {
      if (c.weekStarting) {
        return c.weekStarting === weekString;
      }
      return true;
    });
    
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region?.toLowerCase() === selectedRegion);
    }
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const isHourly = hourlySlots.includes(blockIdOrHour);
    
    if (isHourly) {
      const fieldName = `${dayPrefix}_${blockIdOrHour}`;
      const available = filtered.filter(c => c[fieldName] === 'AVAILABLE');
      const booked = filtered.filter(c => c[fieldName] && typeof c[fieldName] === 'string' && c[fieldName].startsWith('BOOKED'));
      return { available, booked, total: available.length + booked.length };
    } else {
      const block = timeBlocks.find(b => b.id === blockIdOrHour);
      const available = filtered.filter(c => block.hours.every(h => c[`${dayPrefix}_${h}`] === 'AVAILABLE'));
      const booked = filtered.filter(c => block.hours.some(h => c[`${dayPrefix}_${h}`]?.startsWith('BOOKED')));
      return { available, booked, total: available.length + booked.length };
    }
  };

  const getDayStats = (date) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    let filtered = availabilityData;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region?.toLowerCase() === selectedRegion);
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

  const stats = getStats();

  const availableRegions = useMemo(() => {
    const regions = new Set();
    availabilityData.forEach(cleaner => {
      if (cleaner.region) regions.add(cleaner.region);
      if (cleaner.regions && Array.isArray(cleaner.regions)) {
        cleaner.regions.forEach(r => regions.add(r));
      }
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const getRegionColor = (region) => {
    const colors = {
      'all': 'teal', 'charlotte': 'blue', 'triad': 'green', 'raleigh': 'yellow',
      'asheville': 'purple', 'wilmington': 'orange', 'durham': 'pink', 'default': 'gray'
    };
    return colors[region?.toLowerCase()] || colors.default;
  };

  const getRegionEmoji = (region) => {
    const emojis = {
      'Charlotte': '🔵', 'Triad': '🟢', 'Raleigh': '🟡', 'Asheville': '🟣',
      'Wilmington': '🟠', 'Durham': '🩷'
    };
    return emojis[region] || '📍';
  };

  if (loading && availabilityData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🧹</div>
          <div className="text-xl font-semibold text-gray-700">Loading DustBusters Calendar...</div>
          <div className="text-sm text-gray-500 mt-2">Connecting to your data...</div>
        </div>
      </div>
    );
  }

  // The entire return statement is now using JSX for the new visual style.
  return (
    <div className="min-h-screen bg-gray-50 p-5">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧹</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">DustBusters Scheduling Calendar</h1>
              {lastSync && <p className="text-xs text-gray-500">Last updated {lastSync.toLocaleTimeString()}</p>}
            </div>
          </div>
          <button
            onClick={loadAvailabilityData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-sm p-4 flex items-center gap-4 text-white">
          <div className="text-2xl">🤖</div>
          <div className="flex-1">
            <div className="font-semibold">AI Assistant Active</div>
            <div className="text-sm opacity-90">Click any time slot to get AI-powered scheduling suggestions</div>
          </div>
          <button 
            className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-sm hover:bg-gray-50"
            onClick={() => alert('AI Assistant coming soon!')}
          >
            Ask AI
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Cleaners</div>
            <div className="text-3xl font-bold text-gray-800">{availabilityData.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Available This Week</div>
            <div className="text-3xl font-bold text-gray-800">
              {availabilityData.filter(c => Object.keys(c).some(k => k.includes('_') && c[k] === 'AVAILABLE')).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Booked Slots</div>
            <div className="text-3xl font-bold text-gray-800">{stats.booked}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Open Slots</div>
            <div className="text-3xl font-bold text-gray-800">{stats.available}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" style={{ fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search cleaners by name, region, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* View Selector & Region Tabs & Navigation */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex gap-3 mb-4">
            {['daily', 'weekly', 'monthly'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)} View
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              {availableRegions.map(region => {
                const color = getRegionColor(region);
                const emoji = region === 'all' ? '' : getRegionEmoji(region.charAt(0).toUpperCase() + region.slice(1));
                const label = region === 'all' ? 'All Regions' : `${emoji} ${region.charAt(0).toUpperCase() + region.slice(1)}`;
                
                return (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      selectedRegion === region 
                        ? `bg-${color}-500 text-white` 
                        : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() - 86400000));
                  else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() - 604800000));
                  else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                ←
              </button>
              <div className="px-4 py-2 font-semibold text-gray-800 min-w-[250px] text-center text-sm">
                {view === 'daily' ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) :
                 view === 'weekly' ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` :
                 currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={() => {
                  const today = new Date();
                  setSelectedDay(today);
                  setCurrentWeek(getMonday(today));
                  setCurrentMonth(today);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Today
              </button>
              <button
                onClick={() => {
                  if (view === 'daily') setSelectedDay(new Date(selectedDay.getTime() + 86400000));
                  else if (view === 'weekly') setCurrentWeek(new Date(currentWeek.getTime() + 604800000));
                  else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Daily View */}
      {view === 'daily' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-7 overflow-x-auto">
            <div className="min-w-[1000px]">
              {(() => {
                let filtered = availabilityData;
                if (selectedRegion !== 'all') {
                  filtered = filtered.filter(c => c.region?.toLowerCase() === selectedRegion);
                }
                if (searchQuery) {
                  filtered = filtered.filter(c => 
                    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                }
                
                if (filtered.length === 0) {
                  return <div className="text-center py-12 text-gray-500">No cleaners found matching your filters</div>;
                }
                
                return (
                  <div 
                    className="grid gap-px bg-gray-300 border border-gray-300"
                    style={{ gridTemplateColumns: `150px repeat(${filtered.length}, 1fr)` }}
                  >
                    <div className="bg-gray-800 text-white p-4 font-semibold text-center text-sm">Time</div>
                    {filtered.map(c => (
                      <div key={c.id} className="bg-gray-800 text-white p-4 font-semibold text-center text-sm">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs font-normal opacity-80 mt-1">{c.region}</div>
                      </div>
                    ))}
                    {hourlySlots.map(hour => (
                      <React.Fragment key={hour}>
                        <div className="bg-gray-700 text-white p-4 flex items-center justify-center font-medium text-sm">{hour}</div>
                        {filtered.map(c => {
                          const dayPrefix = getDayOfWeekAbbrev(selectedDay);
                          const status = c[`${dayPrefix}_${hour}`];
                          const isAvailable = status === 'AVAILABLE';
                          const isBooked = status?.startsWith('BOOKED');
                          
                          return (
                            <div
                              key={`${c.id}-${hour}`}
                              onClick={() => openSlotDetails(selectedDay, hour)}
                              className={`p-4 cursor-pointer hover:opacity-80 transition-all flex items-center justify-center ${
                                isAvailable ? 'bg-green-500' : isBooked ? 'bg-red-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className="text-white text-center font-bold text-lg">
                                {isAvailable ? '✓' : isBooked ? '✗' : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Weekly View */}
      {view === 'weekly' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-8 bg-blue-600" style={{ gridTemplateColumns: '150px repeat(7, 1fr)' }}>
              <div className="p-3 font-bold text-white text-center border-r border-blue-500">Time</div>
              {weekDates.map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className={`p-3 text-center border-r border-blue-500 ${isToday ? 'bg-yellow-400 text-gray-900' : 'text-white'}`}>
                    <div className="font-bold text-sm">{dayNames[i]}</div>
                    <div className="text-xs">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                );
              })}
            </div>
            {timeBlocks.map((block) => (
              <div key={block.id} className="grid grid-cols-8" style={{ gridTemplateColumns: '150px repeat(7, 1fr)' }}>
                <div className="p-4 bg-gray-50 font-semibold border-r-2 border-gray-200 flex flex-col justify-center items-center">
                  <div className="text-2xl mb-1">{block.emoji}</div>
                  <div className="text-sm">{block.label}</div>
                  <div className="text-xs text-gray-500">{block.time}</div>
                </div>
                {weekDates.map((date, dayIdx) => {
                  const { available, booked } = getCleanersForSlot(date, block.id);
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={dayIdx}
                      onClick={() => openSlotDetails(date, block.id)}
                      className={`p-3 border-r border-gray-200 min-h-[100px] ${isToday ? 'bg-yellow-50' : ''} hover:bg-gray-50 cursor-pointer relative`}
                    >
                      <div className="mb-2 text-xs">
                        <span className="font-bold text-green-700">{available.length} Available</span>
                        {booked.length > 0 && <span className="text-orange-600 ml-2"> • {booked.length} Booked</span>}
                      </div>
                      <div className="space-y-1">
                        {available.slice(0, 3).map(c => (
                          <div key={c.id} className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1 truncate" title={c.name}>
                            {c.name}
                          </div>
                        ))}
                        {available.length > 3 && <div className="text-xs text-gray-600 font-medium">+{available.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Monthly View */}
      {view === 'monthly' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-7">
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-800 text-white p-3 font-semibold text-center text-sm rounded-lg">{day}</div>
              ))}
              {monthDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="bg-gray-50 rounded-lg"></div>;
                }
                const dayStats = getDayStats(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDay(date);
                      setView('daily');
                    }}
                    className={`bg-white border-2 rounded-lg p-3 min-h-[100px] cursor-pointer hover:border-blue-500 transition-colors ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 mb-2">{date.getDate()}</div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">Available</span>
                        <span className="font-semibold text-green-700">{dayStats.available}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-600">Booked</span>
                        <span className="font-semibold text-red-700">{dayStats.booked}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedSlot && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {selectedSlot.day} {selectedSlot.block.label}
            </div>
            <div className="text-sm text-gray-600 mb-6">
              {`${selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${selectedSlot.block.time}`}
            </div>
            <div className="mb-6">
              <h3 className="font-semibold text-green-700 mb-3 text-lg">
                ✅ Available ({selectedSlot.available.length})
              </h3>
              <div className="space-y-3">
                {selectedSlot.available.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">{c.fullName || c.name}</div>
                      <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{c.region}</div>
                    </div>
                    <div className="text-sm text-gray-600">{c.phone || 'No phone'}</div>
                    <div className="text-sm text-gray-600">{c.rate ? `$${c.rate}/hour` : 'Rate not set'}</div>
                  </div>
                ))}
              </div>
            </div>
            {selectedSlot.booked.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-red-700 mb-3 text-lg">
                  🔴 Booked ({selectedSlot.booked.length})
                </h3>
                <div className="space-y-2">
                  {selectedSlot.booked.map(c => (
                    <div key={c.id} className="bg-red-50 rounded-lg p-3 opacity-60">
                      <div className="font-medium text-gray-900">{c.fullName || c.name}</div>
                      <div className="text-xs text-red-600">Already booked</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => alert('AI booking assistant coming soon!')}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
              >
                🤖 Book with AI Assist
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
