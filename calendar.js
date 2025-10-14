const { useState, useEffect, useMemo } = React;

// Updated to use HTTPS
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

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadAvailabilityData = async () => {
    setLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Loaded data from n8n:', data);

      let cleaners = [];
      if (Array.isArray(data)) {
        cleaners = data[0]?.cleaners || [];
      } else if (data.cleaners) {
        cleaners = data.cleaners;
      }

      // Process cleaners to ensure proper capitalization and data format
      cleaners = cleaners.map(cleaner => ({
        ...cleaner,
        name: capitalizeWords(cleaner.name || ''),
        fullName: capitalizeWords(cleaner.fullName || cleaner.name || '')
      }));

      console.log('Cleaners parsed:', cleaners);
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

  // Helper function to capitalize words
  const capitalizeWords = (str) => {
    return str.replace(/\b\w+/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourlySlots = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];

  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] }
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
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const weekDates = getWeekDates();
  const monthDays = getMonthDays();

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
      if (cleaner.region) {
        regions.add(capitalizeWords(cleaner.region));
      }
      if (cleaner.regions && Array.isArray(cleaner.regions)) {
        cleaner.regions.forEach(r => {
          if (r) regions.add(capitalizeWords(r));
        });
      }
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const getRegionColor = (region) => {
    const colors = {
      'all': 'teal',
      'charlotte': 'blue',
      'triad': 'green',
      'raleigh': 'yellow',
      'asheville': 'purple',
      'wilmington': 'orange',
      'durham': 'pink',
      'default': 'gray'
    };
    return colors[region?.toLowerCase()] || colors.default;
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

    // Search
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'relative' },
          React.createElement('span', {
            className: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400'
          }, '🔍'),
          React.createElement('input', {
            type: 'text',
            placeholder: 'Search cleaners by name, region, or notes...',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: 'w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none'
          })
        )
      )
    ),

    // View Controls
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'flex flex-wrap gap-4 items-center justify-between' },
          // View Toggle
          React.createElement('div', { className: 'flex rounded-lg bg-gray-100 p-1' },
            React.createElement('button', {
              onClick: () => setView('daily'),
              className: `px-4 py-2 
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
              }, capitalizeWords(region))
            )
          ),

          // Navigation
          React.createElement('div', { className: 'flex items-center gap-4' },
            React.createElement('button', {
              onClick: () => {
                const today = new Date();
                setCurrentWeek(getMonday(today));
                setCurrentMonth(today);
                setSelectedDay(today);
              },
              className: 'px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg'
            }, 'Today'),
            React.createElement('div', { className: 'flex gap-2' },
              React.createElement('button', {
                onClick: () => {
                  if (view === 'weekly') {
                    const newDate = new Date(currentWeek);
                    newDate.setDate(newDate.getDate() - 7);
                    setCurrentWeek(newDate);
                  } else if (view === 'monthly') {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentMonth(newDate);
                  } else {
                    const newDate = new Date(selectedDay);
                    newDate.setDate(newDate.getDate() - 1);
                    setSelectedDay(newDate);
                  }
                },
                className: 'p-2 rounded-lg hover:bg-gray-100'
              }, '←'),
              React.createElement('button', {
                onClick: () => {
                  if (view === 'weekly') {
                    const newDate = new Date(currentWeek);
                    newDate.setDate(newDate.getDate() + 7);
                    setCurrentWeek(newDate);
                  } else if (view === 'monthly') {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentMonth(newDate);
                  } else {
                    const newDate = new Date(selectedDay);
                    newDate.setDate(newDate.getDate() + 1);
                    setSelectedDay(newDate);
                  }
                },
                className: 'p-2 rounded-lg hover:bg-gray-100'
              }, '→')
            )
          )
        )
      )
    ),

    // Calendar Grid
    React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' },
        React.createElement('div', { className: 'p-5' },
          view === 'weekly' && React.createElement('div', { className: 'grid grid-cols-8 gap-4' },
            React.createElement('div', { className: 'font-semibold' }, 'Time'),
            ...weekDates.map(date => 
              React.createElement('div', { 
                key: date.toISOString(),
                className: 'text-center font-semibold'
              },
                React.createElement('div', null, dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]),
                React.createElement('div', { className: 'text-sm text-gray-500' },
                  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                )
              )
            )
          ),
          
          // Weekly view time blocks
          view === 'weekly' && timeBlocks.map(block => 
            React.createElement('div', {
              key: block.id,
              className: 'grid grid-cols-8 gap-4 py-4 border-t border-gray-100 first:border-0'
            },
              React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement('span', null, block.emoji),
                React.createElement('div', null,
                  React.createElement('div', { className: 'font-medium' }, block.label),
                  React.createElement('div', { className: 'text-sm text-gray-500' }, block.time)
                )
              ),
              ...weekDates.map(date => {
                const { available, booked } = getCleanersForSlot(date, block.id);
                return React.createElement('div', {
                  key: date.toISOString(),
                  className: 'rounded-lg border-2 border-gray-100 p-2 text-center hover:border-blue-500 cursor-pointer transition-colors',
                  onClick: () => openSlotDetails(date, block.id)
                },
                  React.createElement('div', { className: 'font-semibold text-green-600' },
                    `${available.length} Available`
                  ),
                  booked.length > 0 && React.createElement('div', { className: 'text-sm text-gray-500' },
                    `${booked.length} Booked`
                  )
                );
              })
            )
          ),

          // Daily view
          view === 'daily' && React.createElement('div', null,
            React.createElement('div', { className: 'text-xl font-semibold mb-4' },
              selectedDay.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })
            ),
            React.createElement('div', { className: 'space-y-4' },
              timeBlocks.map(block => {
                const { available, booked } = getCleanersForSlot(selectedDay, block.id);
                return React.createElement('div', {
                  key: block.id,
                  className: 'p-4 rounded-lg border-2 border-gray-100 hover:border-blue-500 cursor-pointer transition-colors',
                  onClick: () => openSlotDetails(selectedDay, block.id)
                },
                  React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-lg font-semibold flex items-center gap-2' },
                        React.createElement('span', null, block.emoji),
                        React.createElement('span', null, block.label)
                      ),
                      React.createElement('div', { className: 'text-sm text-gray-500' }, block.time)
                    ),
                    React.createElement('div', { className: 'text-right' },
                      React.createElement('div', { className: 'text-lg font-semibold text-green-600' },
                        `${available.length} Available`
                      ),
                      booked.length > 0 && React.createElement('div', { className: 'text-sm text-gray-500' },
                        `${booked.length} Booked`
                      )
                    )
                  )
                );
              })
            )
          ),

          // Monthly view
          view === 'monthly' && React.createElement('div', null,
            React.createElement('div', { className: 'text-xl font-semibold mb-4 text-center' },
              currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            ),
            React.createElement('div', { className: 'grid grid-cols-7 gap-4' },
              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day =>
                React.createElement('div', {
                  key: day,
                  className: 'text-center font-semibold text-gray-500'
                }, day)
              ),
              monthDays.map((date, index) =>
                React.createElement('div', {
                  key: index,
                  className: `min-h-[100px] p-2 rounded-lg ${
                    date ? 'border-2 border-gray-100 hover:border-blue-500 cursor-pointer' : ''
                  }`
                },
                  date && React.createElement('div', null,
                    React.createElement('div', { className: 'font-semibold' }, date.getDate()),
                    (() => {
                      const stats = getDayStats(date);
                      return React.createElement('div', { className: 'mt-2 text-sm' },
                        stats.available > 0 && React.createElement('div', { className: 'text-green-600' },
                          `${stats.available} Available`
                        ),
                        stats.booked > 0 && React.createElement('div', { className: 'text-gray-500' },
                          `${stats.booked} Booked`
                        )
                      );
                    })()
                  )
                )
              )
            )
          )
        )
      )
    ),

    // Modal
    showModal && React.createElement('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center p-4'
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto'
      },
        React.createElement('div', { className: 'p-6' },
          React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('div', null,
              React.createElement('h3', { className: 'text-xl font-semibold' },
                selectedSlot.day
              ),
              React.createElement('p', { className: 'text-gray-500' },
                selectedSlot.isHourly
                  ? selectedSlot.block.time
                  : `${selectedSlot.block.label} (${selectedSlot.block.time})`
              )
            ),
            React.createElement('button', {
              onClick: () => setShowModal(false),
              className: 'p-2 hover:bg-gray-100 rounded-lg'
            }, '×')
          ),
          
          // Available Cleaners
          selectedSlot.available.length > 0 && React.createElement('div', { className: 'mb-6' },
            React.createElement('h4', { className: 'font-semibold text-green-600 mb-3' },
              'Available Cleaners'
            ),
            React.createElement('div', { className: 'space-y-3' },
              selectedSlot.available.map(c => 
                React.createElement('div', {
                  key: c.id,
                  className: 'p-3 rounded-lg border-2 border-gray-100'
                },
                  React.createElement('div', { className: 'flex justify-between items-start mb-2' },
                    React.createElement('div', { className: 'font-semibold text-gray-900' },
                      capitalizeWords(c.fullName || c.name)
                    ),
                    React.createElement('div', {
                      className: `text-xs px-2 py-1 rounded bg-${getRegionColor(c.region)}-100 text-${getRegionColor(c.region)}-700`
                    }, capitalizeWords(c.region))
                  ),
                  React.createElement('div', { className: 'text-sm text-gray-500 space-y-1' },
                    c.phone && React.createElement('div', null, `📱 ${c.phone}`),
                    c.email && React.createElement('div', null, `📧 ${c.email}`),
                    c.rate && React.createElement('div', null, `💰 ${c.rate}`)
                  )
                )
              )
            )
          ),
          
          // Booked Cleaners
          selectedSlot.booked.length > 0 && React.createElement('div', null,
            React.createElement('h4', { className: 'font-semibold text-gray-600 mb-3' },
              'Booked Cleaners'
            ),
            React.createElement('div', { className: 'space-y-3' },
              selectedSlot.booked.map(c => 
                React.createElement('div', {
                  key: c.id,
                  className: 'p-3 rounded-lg border-2 border-gray-100 opacity-75'
                },
                  React.createElement('div', { className: 'flex justify-between items-start mb-2' },
                    React.createElement('div', { className: 'font-semibold text-gray-900' },
                      capitalizeWords(c.fullName || c.name)
                    ),
                    React.createElement('div', {
                      className: `text-xs px-2 py-1 rounded bg-${getRegionColor(c.region)}-100 text-${getRegionColor(c.region)}-700`
                    }, capitalizeWords(c.region))
                  ),
                  React.createElement('div', { className: 'text-sm text-gray-500' },
                    'Currently Booked'
                  )
                )
              )
            )
          )
        )
      )
    )
  );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
