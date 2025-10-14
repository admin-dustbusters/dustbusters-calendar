

const { useState, useEffect } = React;
const { Calendar, RefreshCw, ChevronLeft, ChevronRight, Search, Sparkles } = window.lucide;

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
  const [statsModal, setStatsModal] = useState(null);

  const SHEET_ID = '1USRZFHCeoo3toVGdyJnQ3LwN2PLCp7fyTXEQM5yZiV0';
  const SHEET_NAME = 'Live Availability Matrix';
  // NEW: n8n Calendar Data API endpoint
  const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE'; // You'll get this after importing the workflow

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

  const getCleanersForSlot = (date, blockIdOrHour) => {
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
      const available = filtered.filter(cleaner => 
        cleaner[`${dayPrefix}_${blockIdOrHour}`] === 'AVAILABLE'
      );
      const booked = filtered.filter(cleaner => 
        cleaner[`${dayPrefix}_${blockIdOrHour}`]?.startsWith('BOOKED')
      );
      return { available, booked, total: available.length + booked.length };
    } else {
      const block = timeBlocks.find(b => b.id === blockIdOrHour);
      const available = filtered.filter(cleaner => 
        block.hours.every(hour => cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE')
      );
      const booked = filtered.filter(cleaner => 
        block.hours.some(hour => cleaner[`${dayPrefix}_${hour}`]?.startsWith('BOOKED'))
      );
      return { available, booked, total: available.length + booked.length };
    }
  };

  const getDayStats = (date) => {
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

  const getStats = () => {
    const stats = { available: 0, booked: 0 };
    availabilityData.forEach(cleaner => {
      Object.keys(cleaner).forEach(key => {
        if (key.includes('_')) {
          const value = cleaner[key];
          if (value === 'AVAILABLE') stats.available++;
          else if (value?.startsWith('BOOKED')) stats.booked++;
        }
      });
    });
    return stats;
  };

  const getAvailableCleanersThisWeek = () => {
    const weekDates = getWeekDates();
    const cleanersData = {};
    
    let filtered = availabilityData;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region.toLowerCase() === selectedRegion);
    }

    filtered.forEach(cleaner => {
      let hasAvailability = false;
      weekDates.forEach(date => {
        const dayPrefix = getDayOfWeekAbbrev(date);
        hourlySlots.forEach(hour => {
          if (cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE') {
            hasAvailability = true;
          }
        });
      });
      if (hasAvailability) {
        cleanersData[cleaner.id] = cleaner;
      }
    });
    
    return Object.values(cleanersData);
  };

  const getBookedSlotsDetails = () => {
    const weekDates = getWeekDates();
    const bookedSlots = [];
    
    let filtered = availabilityData;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region.toLowerCase() === selectedRegion);
    }

    filtered.forEach(cleaner => {
      weekDates.forEach(date => {
        const dayPrefix = getDayOfWeekAbbrev(date);
        hourlySlots.forEach(hour => {
          if (cleaner[`${dayPrefix}_${hour}`]?.startsWith('BOOKED')) {
            bookedSlots.push({
              cleaner: cleaner.name,
              date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              time: hour,
              bookingId: cleaner[`${dayPrefix}_${hour}`]
            });
          }
        });
      });
    });
    
    return bookedSlots;
  };

  const getOpenSlotsDetails = () => {
    const weekDates = getWeekDates();
    const openSlots = [];
    
    let filtered = availabilityData;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(c => c.region.toLowerCase() === selectedRegion);
    }

    filtered.forEach(cleaner => {
      weekDates.forEach(date => {
        const dayPrefix = getDayOfWeekAbbrev(date);
        hourlySlots.forEach(hour => {
          if (cleaner[`${dayPrefix}_${hour}`] === 'AVAILABLE') {
            openSlots.push({
              cleaner: cleaner.name,
              region: cleaner.region,
              date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              time: hour,
              rate: cleaner.rate
            });
          }
        });
      });
    });
    
    return openSlots;
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧹</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">DustBusters Scheduling Calendar</h1>
              <p className="text-xs text-gray-500">
                {lastSync && `Last updated ${lastSync.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <button
            onClick={loadAvailabilityData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-sm p-4 flex items-center gap-4 text-white">
          <Sparkles className="w-6 h-6" />
          <div className="flex-1">
            <div className="font-semibold">AI Assistant Active</div>
            <div className="text-sm opacity-90">Click any time slot to get AI-powered scheduling suggestions</div>
          </div>
          <button className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-sm hover:bg-gray-50">
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
          <button onClick={() => setStatsModal('available')} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow text-left">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Available This Week</div>
            <div className="text-3xl font-bold text-gray-800">{getAvailableCleanersThisWeek().length}</div>
          </button>
          <button onClick={() => setStatsModal('booked')} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow text-left">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Booked Slots</div>
            <div className="text-3xl font-bold text-gray-800">{stats.booked}</div>
          </button>
          <button onClick={() => setStatsModal('open')} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow text-left">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Open Slots</div>
            <div className="text-3xl font-bold text-gray-800">{stats.available}</div>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Search cleaners by name, region, or notes..."
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
            <button
              onClick={() => setView('daily')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                view === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily View
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                view === 'weekly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly View
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                view === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly View
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRegion('all')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  selectedRegion === 'all'
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
              >
                All Regions
              </button>
              <button
                onClick={() => setSelectedRegion('charlotte')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  selectedRegion === 'charlotte'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                🔵 Charlotte
              </button>
              <button
                onClick={() => setSelectedRegion('triad')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  selectedRegion === 'triad'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                🟢 Triad
              </button>
              <button
                onClick={() => setSelectedRegion('raleigh')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  selectedRegion === 'raleigh'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                🟡 Raleigh
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (view === 'daily') goToPreviousDay();
                  else if (view === 'weekly') goToPreviousWeek();
                  else goToPreviousMonth();
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 font-semibold text-gray-800 min-w-[250px] text-center">
                {view === 'daily' && selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {view === 'weekly' && `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                {view === 'monthly' && currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Today
              </button>
              <button
                onClick={() => {
                  if (view === 'daily') goToNextDay();
                  else if (view === 'weekly') goToNextWeek();
                  else goToNextMonth();
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
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
                const filteredCleaners = availabilityData
                  .filter(c => selectedRegion === 'all' || c.region.toLowerCase() === selectedRegion)
                  .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));
                
                return (
                  <div className={`grid gap-px bg-gray-300 border border-gray-300`} style={{ gridTemplateColumns: `150px repeat(${filteredCleaners.length}, 1fr)` }}>
                    <div className="bg-gray-800 text-white p-4 font-semibold text-center text-sm">
                      Time
                    </div>
                    {filteredCleaners.map((cleaner) => (
                      <div key={cleaner.id} className="bg-gray-800 text-white p-4 font-semibold text-center text-sm">
                        <div className="font-medium">{cleaner.name}</div>
                        <div className="text-xs font-normal opacity-80 mt-1">{cleaner.region}</div>
                      </div>
                    ))}
                    
                    {hourlySlots.map((hour) => (
                      <React.Fragment key={hour}>
                        <div className="bg-gray-700 text-white p-4 flex items-center justify-center font-medium text-sm">
                          {hour}
                        </div>
                        {filteredCleaners.map((cleaner) => {
                          const dayPrefix = getDayOfWeekAbbrev(selectedDay);
                          const status = cleaner[`${dayPrefix}_${hour}`];
                          const isAvailable = status === 'AVAILABLE';
                          const isBooked = status?.startsWith('BOOKED');
                          
                          return (
                            <div
                              key={`${cleaner.id}-${hour}`}
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
          <div className="bg-white rounded-xl shadow-sm p-7 overflow-x-auto">
            <div className="min-w-[1200px]">
              <div className="grid grid-cols-8 gap-px bg-gray-300 border border-gray-300 mb-px">
                <div className="bg-gray-800 text-white p-4 font-semibold text-center text-sm">
                  Time Slot
                </div>
                {dayNames.map((day, idx) => (
                  <div key={idx} className="bg-gray-800 text-white p-4 font-semibold text-center text-sm">
                    {day}
                    <div className="text-xs font-normal opacity-80 mt-1">
                      {weekDates[idx].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>

              {timeBlocks.map((block) => (
                <div key={block.id} className="grid grid-cols-8 gap-px bg-gray-300 border-l border-r border-b border-gray-300">
                  <div className="bg-gray-700 text-white p-4 flex flex-col justify-center">
                    <div className="font-medium text-sm">{block.emoji} {block.label}</div>
                    <div className="text-xs opacity-80 mt-1">{block.time}</div>
                  </div>
                  {weekDates.map((date, dayIdx) => {
                    const { available, booked, total } = getCleanersForSlot(date, block.id);
                    return (
                      <div
                        key={dayIdx}
                        onClick={() => openSlotDetails(date, block.id)}
                        className="bg-white p-3 min-h-[100px] relative cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {total > 0 && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {total}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {available.slice(0, 6).map((cleaner) => (
                            <div
                              key={cleaner.id}
                              className="inline-block px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:scale-105 transition-transform cursor-pointer"
                            >
                              {cleaner.name}
                            </div>
                          ))}
                          {booked.slice(0, 3).map((cleaner) => (
                            <div
                              key={cleaner.id}
                              className="inline-block px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium"
                            >
                              {cleaner.name}
                            </div>
                          ))}
                          {total === 0 && (
                            <div className="text-gray-400 text-xs italic">No availability</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly View */}
      {view === 'monthly' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-7">
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-gray-800 text-white p-3 font-semibold text-center text-sm rounded-lg">
                  {day}
                </div>
              ))}
              
              {monthDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="bg-gray-50 rounded-lg"></div>;
                }
                
                const dayStats = getDayStats(date);
                const total = dayStats.available + dayStats.booked;
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

      {/* Available Cleaners Modal */}
      {statsModal === 'available' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-2xl font-bold text-gray-800">Available Cleaners This Week</div>
              <button onClick={() => setStatsModal(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="space-y-3">
              {getAvailableCleanersThisWeek().map((cleaner) => (
                <div key={cleaner.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{cleaner.fullName}</div>
                      <div className="text-sm text-gray-600 mt-1">{cleaner.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded mb-2">{cleaner.region}</div>
                      <div className="text-sm font-semibold text-gray-800">${cleaner.rate}/hr</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStatsModal(null)} className="mt-6 w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Booked Slots Modal */}
      {statsModal === 'booked' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-2xl font-bold text-gray-800">Booked Slots This Week</div>
              <button onClick={() => setStatsModal(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="space-y-3">
              {getBookedSlotsDetails().map((slot, idx) => (
                <div key={idx} className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{slot.cleaner}</div>
                      <div className="text-sm text-gray-600 mt-1">{slot.date} at {slot.time}</div>
                    </div>
                    <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">{slot.bookingId}</div>
                  </div>
                </div>
              ))}
              {getBookedSlotsDetails().length === 0 && <div className="text-gray-400 text-center py-8">No booked slots this week</div>}
            </div>
            <button onClick={() => setStatsModal(null)} className="mt-6 w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Open Slots Modal */}
      {statsModal === 'open' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-2xl font-bold text-gray-800">Open Slots This Week</div>
              <button onClick={() => setStatsModal(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="space-y-3">
              {getOpenSlotsDetails().map((slot, idx) => (
                <div key={idx} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{slot.cleaner}</div>
                      <div className="text-sm text-gray-600 mt-1">{slot.date} at {slot.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded mb-2">{slot.region}</div>
                      <div className="text-sm font-semibold text-gray-800">${slot.rate}/hr</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStatsModal(null)} className="mt-6 w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {selectedSlot.day} {selectedSlot.isHourly ? selectedSlot.block.label : selectedSlot.block.label}
            </div>
            <div className="text-sm text-gray-600 mb-6">
              {selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • {selectedSlot.isHourly ? selectedSlot.block.time : selectedSlot.block.time}
            </div>

            {/* Available Cleaners */}
            <div className="mb-6">
              <h3 className="font-semibold text-green-700 mb-3 text-lg">
                ✅ Available ({selectedSlot.available.length})
              </h3>
              <div className="space-y-3">
                {selectedSlot.available.map((cleaner) => (
                  <div key={cleaner.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">{cleaner.fullName}</div>
                      <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{cleaner.region}</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{cleaner.phone}</div>
                    <div className="text-sm text-gray-600">${cleaner.rate}/hour</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booked Cleaners */}
            {selectedSlot.booked.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-red-700 mb-3 text-lg">
                  🔴 Booked ({selectedSlot.booked.length})
                </h3>
                <div className="space-y-2">
                  {selectedSlot.booked.map((cleaner) => (
                    <div key={cleaner.id} className="bg-red-50 rounded-lg p-3 opacity-60">
                      <div className="font-medium text-gray-900">{cleaner.fullName}</div>
                      <div className="text-xs text-red-600">Already booked</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => alert('AI booking assistant coming soon!')}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                🤖 Book with AI Assist
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
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

export default DustBustersCalendar;

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(DustBustersCalendar));
