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
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const weekDates = getWeekDates();
  const monthDays = getMonthDays();

  // Updated cleaner filtering logic
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

  // Dynamic regions with proper capitalization
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

  const getRegionEmoji = (region) => {
    const emojis = {
      'Charlotte': '🔵',
      'Triad': '🟢',
      'Raleigh': '🟡',
      'Asheville': '🟣',
      'Wilmington': '🟠',
      'Durham': '🩷'
    };
    return emojis[region] || '📍';
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
        }, loading ? '↻ Refreshing...' : '↻ Refresh')
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
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' },
            availabilityData.filter(c => Object.keys(c).some(k => k.includes('_') && c[k] === 'AVAILABLE')).length
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, stats.booked)
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
            className: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400',
            style: { fontSize: '16px' }
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

    // View Selector & Navigation
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
          // View Toggle
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('button', {
              onClick: () => setView('weekly'),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`
            }, '📅 Weekly'),
            React.createElement('button', {
              onClick: () => setView('monthly'),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`
            }, '🗓️ Monthly'),
            React.createElement('button', {
              onClick: () => setView('hourly'),
              className: `px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'hourly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`
            }, '⏰ Hourly')
          ),
          
          // Navigation
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('button', {
              onClick: () => {
                if (view === 'monthly') {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setCurrentMonth(newMonth);
                } else {
                  const newWeek = new Date(currentWeek);
                  newWeek.setDate(newWeek.getDate() - 7);
                  setCurrentWeek(newWeek);
                }
              },
              className: 'p-2 hover:bg-gray-100 rounded-lg transition-colors'
            }, '←'),
            React.createElement('div', { className: 'text-lg font-semibold text-gray-800 min-w-[200px] text-center' },
              view === 'monthly'
                ? currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            ),
            React.createElement('button', {
              onClick: () => {
                if (view === 'monthly') {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCurrentMonth(newMonth);
                } else {
                  const newWeek = new Date(currentWeek);
                  newWeek.setDate(newWeek.getDate() + 7);
                  setCurrentWeek(newWeek);
                }
              },
              className: 'p-2 hover:bg-gray-100 rounded-lg transition-colors'
            }, '→')
          )
        ),

        // Region Filter
        React.createElement('div', { className: 'flex flex-wrap gap-2' },
          availableRegions.map(region =>
            React.createElement('button', {
              key: region,
              onClick: () => setSelectedRegion(region),
              className: `px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedRegion === region
                  ? `bg-${getRegionColor(region)}-500 text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`
            }, region === 'all' ? '🌐 All Regions' : `${getRegionEmoji(region)} ${region}`)
          )
        )
      )
    ),

    // Calendar Views
    React.createElement('div', { className: 'max-w-7xl mx-auto' },
      // Weekly View
      view === 'weekly' && React.createElement('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' },
        React.createElement('div', { className: 'grid grid-cols-8 border-b border-gray-200' },
          React.createElement('div', { className: 'p-4 bg-gray-50 font-semibold text-gray-700' }, 'Time'),
          weekDates.map((date, i) =>
            React.createElement('div', {
              key: i,
              className: 'p-4 bg-gray-50 text-center'
            },
              React.createElement('div', { className: 'font-semibold text-gray-700' }, dayNames[i]),
              React.createElement('div', { className: 'text-2xl text-gray-800 font-bold' }, date.getDate()),
              React.createElement('div', { className: 'text-xs text-gray-500' },
                date.toLocaleDateString('en-US', { month: 'short' })
              )
            )
          )
        ),
        timeBlocks.map(block =>
          React.createElement('div', {
            key: block.id,
            className: 'grid grid-cols-8 border-b border-gray-200 hover:bg-gray-50 transition-colors'
          },
            React.createElement('div', { className: 'p-4 bg-gray-50 border-r border-gray-200' },
              React.createElement('div', { className: 'font-semibold text-gray-700' }, `${block.emoji} ${block.label}`),
              React.createElement('div', { className: 'text-xs text-gray-500' }, block.time)
            ),
            weekDates.map((date, i) => {
              const { available, booked } = getCleanersForSlot(date, block.id);
              return React.createElement('div', {
                key: i,
                onClick: () => openSlotDetails(date, block.id),
                className: 'p-4 cursor-pointer hover:bg-blue-50 transition-colors'
              },
                React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'text-2xl font-bold text-green-600' }, available.length),
                  React.createElement('div', { className: 'text-xs text-gray-500' }, 'available'),
                  booked.length > 0 && React.createElement('div', { className: 'text-sm text-orange-600 mt-1' },
                    `${booked.length} booked`
                  )
                )
              );
            })
          )
        )
      ),

      // Monthly View
      view === 'monthly' && React.createElement('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' },
        React.createElement('div', { className: 'grid grid-cols-7 border-b border-gray-200' },
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
            React.createElement('div', {
              key: day,
              className: 'p-3 bg-gray-50 text-center font-semibold text-gray-700'
            }, day)
          )
        ),
        React.createElement('div', { className: 'grid grid-cols-7' },
          monthDays.map((date, i) =>
            React.createElement('div', {
              key: i,
              className: `min-h-[120px] p-3 border-b border-r border-gray-200 ${
                !date ? 'bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'
              }`
            },
              date && React.createElement('div', null,
                React.createElement('div', { className: 'font-bold text-gray-800 mb-2' }, date.getDate()),
                (() => {
                  const stats = getDayStats(date);
                  return React.createElement('div', { className: 'space-y-1' },
                    React.createElement('div', { className: 'text-xs' },
                      React.createElement('span', { className: 'text-green-600 font-semibold' }, stats.available),
                      React.createElement('span', { className: 'text-gray-500' }, ' avail')
                    ),
                    stats.booked > 0 && React.createElement('div', { className: 'text-xs' },
                      React.createElement('span', { className: 'text-orange-600 font-semibold' }, stats.booked),
                      React.createElement('span', { className: 'text-gray-500' }, ' booked')
                    )
                  );
                })()
              )
            )
          )
        )
      ),

      // Hourly View
      view === 'hourly' && React.createElement('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' },
        React.createElement('div', { className: 'grid grid-cols-8 border-b border-gray-200' },
          React.createElement('div', { className: 'p-4 bg-gray-50 font-semibold text-gray-700' }, 'Hour'),
          weekDates.map((date, i) =>
            React.createElement('div', {
              key: i,
              className: 'p-4 bg-gray-50 text-center'
            },
              React.createElement('div', { className: 'font-semibold text-gray-700' }, dayNames[i]),
              React.createElement('div', { className: 'text-xl text-gray-800 font-bold' }, date.getDate())
            )
          )
        ),
        hourlySlots.map(hour =>
          React.createElement('div', {
            key: hour,
            className: 'grid grid-cols-8 border-b border-gray-200 hover:bg-gray-50 transition-colors'
          },
            React.createElement('div', { className: 'p-3 bg-gray-50 border-r border-gray-200 font-medium text-gray-700' },
              hour
            ),
            weekDates.map((date, i) => {
              const { available, booked } = getCleanersForSlot(date, hour);
              return React.createElement('div', {
                key: i,
                onClick: () => openSlotDetails(date, hour),
                className: 'p-3 cursor-pointer hover:bg-blue-50 transition-colors text-center'
              },
                React.createElement('span', { className: 'text-lg font-bold text-green-600' }, available.length),
                booked.length > 0 && React.createElement('span', { className: 'text-sm text-orange-600 ml-2' },
                  `(${booked.length})`
                )
              );
            })
          )
        )
      )
    ),

    // Modal
    showModal && selectedSlot && React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5',
      onClick: () => setShowModal(false)
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('div', { className: 'sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('h2', { className: 'text-2xl font-bold text-gray-800' },
              `${selectedSlot.day} - ${selectedSlot.block.label}`
            ),
            React.createElement('p', { className: 'text-sm text-gray-500' },
              selectedSlot.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            )
          ),
          React.createElement('button', {
            onClick: () => setShowModal(false),
            className: 'text-gray-400 hover:text-gray-600 text-2xl'
          }, '×')
        ),
        
        React.createElement('div', { className: 'p-5' },
          // Summary
          React.createElement('div', { className: 'grid grid-cols-2 gap-4 mb-5' },
            React.createElement('div', { className: 'bg-green-50 rounded-lg p-4' },
              React.createElement('div', { className: 'text-3xl font-bold text-green-600' }, selectedSlot.available.length),
              React.createElement('div', { className: 'text-sm text-gray-600' }, 'Available Cleaners')
            ),
            React.createElement('div', { className: 'bg-orange-50 rounded-lg p-4' },
              React.createElement('div', { className: 'text-3xl font-bold text-orange-600' }, selectedSlot.booked.length),
              React.createElement('div', { className: 'text-sm text-gray-600' }, 'Booked Cleaners')
            )
          ),

          // Available Cleaners
          selectedSlot.available.length > 0 && React.createElement('div', { className: 'mb-5' },
            React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-3' }, '✅ Available Cleaners'),
            React.createElement('div', { className: 'space-y-2' },
              selectedSlot.available.map((cleaner, idx) =>
                React.createElement('div', {
                  key: idx,
                  className: 'bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between'
                },
                  React.createElement('div', null,
                    React.createElement('div', { className: 'font-semibold text-gray-800' }, cleaner.fullName || cleaner.name),
                    React.createElement('div', { className: 'text-sm text-gray-600' },
                      Array.isArray(cleaner.regions) 
                        ? cleaner.regions.map(r => capitalizeWords(r)).join(', ')
                        : capitalizeWords(cleaner.region || '')
                    )
                  ),
                  React.createElement('div', { className: 'text-2xl' }, '✅')
                )
              )
            )
          ),

          // Booked Cleaners
          selectedSlot.booked.length > 0 && React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-3' }, '📅 Booked Cleaners'),
            React.createElement('div', { className: 'space-y-2' },
              selectedSlot.booked.map((cleaner, idx) => {
                const dayPrefix = getDayOfWeekAbbrev(selectedSlot.date);
                let bookingInfo = '';
                
                if (selectedSlot.isHourly) {
                  bookingInfo = cleaner[`${dayPrefix}_${selectedSlot.block.label}`] || '';
                } else {
                  const block = timeBlocks.find(b => b.id === selectedSlot.block.id);
                  const bookedHours = block.hours.filter(h => 
                    cleaner[`${dayPrefix}_${h}`]?.startsWith('BOOKED')
                  );
                  if (bookedHours.length > 0) {
                    bookingInfo = cleaner[`${dayPrefix}_${bookedHours[0]}`] || '';
                  }
                }

                return React.createElement('div', {
                  key: idx,
                  className: 'bg-orange-50 border border-orange-200 rounded-lg p-3'
                },
                  React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('div', { className: 'font-semibold text-gray-800' }, cleaner.fullName || cleaner.name),
                    React.createElement('div', { className: 'text-2xl' }, '📅')
                  ),
                  React.createElement('div', { className: 'text-sm text-gray-600' },
                    Array.isArray(cleaner.regions) 
                      ? cleaner.regions.map(r => capitalizeWords(r)).join(', ')
                      : capitalizeWords(cleaner.region || '')
                  ),
                  bookingInfo && React.createElement('div', { className: 'text-xs text-orange-700 mt-2 font-medium' },
                    bookingInfo.replace('BOOKED: ', '')
                  )
                );
              })
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
