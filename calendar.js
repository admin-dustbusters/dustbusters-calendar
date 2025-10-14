const { useState, useEffect } = React;

// YOUR WEBHOOK URL
const N8N_WEBHOOK_URL = 'http://dustbusters-n8n.duckdns.org:5678/webhook/calendar-data';

const DustBustersCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [view, setView] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);

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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded data from n8n:', data);
      
      setAvailabilityData(data.cleaners || []);
      setLastSync(new Date());
      
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't alert, just log - calendar will show with 0 cleaners
    }
    setLoading(false);
  };

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

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(getMonday(today));
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

  const weekDates = getWeekDates();
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm' },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm' },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-9pm' },
  ];

  const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 'Sun' : dayAbbrev[dayIndex - 1];
  };

  const getCleanersForSlot = (date, blockId) => {
    const dayPrefix = getDayOfWeekAbbrev(date);
    
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

    // Since we don't have availability data yet, just return all as available
    return { available: filtered, booked: [], total: filtered.length };
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

  const stats = getStats();
  const regions = ['all', ...new Set(availabilityData.map(c => c.region).filter(Boolean))];

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
        },
          React.createElement('span', null, loading ? '↻ Refreshing...' : '↻ Refresh')
        )
      )
    ),

    // Stats Bar
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'grid grid-cols-4 gap-4' },
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Total Cleaners'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, availabilityData.length)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Hired Cleaners'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, 
            availabilityData.filter(c => c.status === 'Hired').length
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Booked Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, stats.booked)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
          React.createElement('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, 'Open Slots'),
          React.createElement('div', { className: 'text-3xl font-bold text-gray-800' }, stats.available || availabilityData.length * 21)
        )
      )
    ),

    // Filters
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        React.createElement('div', { className: 'flex gap-4 flex-wrap' },
          React.createElement('input', {
            type: 'text',
            placeholder: '🔍 Search cleaners...',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: 'flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          }),
          React.createElement('select', {
            value: selectedRegion,
            onChange: (e) => setSelectedRegion(e.target.value),
            className: 'px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
          },
            regions.map(region =>
              React.createElement('option', { key: region, value: region },
                region === 'all' ? '📍 All Regions' : `📍 ${region}`
              )
            )
          )
        )
      )
    ),

    // Week Navigation
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('button', {
            onClick: goToPreviousWeek,
            className: 'px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold'
          }, '← Previous'),
          React.createElement('div', { className: 'text-center' },
            React.createElement('div', { className: 'font-bold text-lg' },
              `${weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            ),
            React.createElement('button', {
              onClick: goToToday,
              className: 'text-sm text-blue-600 hover:text-blue-800 font-medium'
            }, 'Today')
          ),
          React.createElement('button', {
            onClick: goToNextWeek,
            className: 'px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold'
          }, 'Next →')
        )
      )
    ),

    // Calendar Grid
    React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' },
        // Header Row
        React.createElement('div', { className: 'grid grid-cols-8 bg-blue-600' },
          React.createElement('div', { className: 'p-3 font-bold text-white text-center border-r border-blue-500' }, 'Time'),
          weekDates.map((date, i) => {
            const isToday = date.toDateString() === new Date().toDateString();
            return React.createElement('div', { 
              key: i, 
              className: `p-3 text-center border-r border-blue-500 ${isToday ? 'bg-yellow-400 text-gray-900' : 'text-white'}`
            },
              React.createElement('div', { className: 'font-bold' }, dayNames[i]),
              React.createElement('div', { className: 'text-xs' }, 
                date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              )
            );
          })
        ),
        
        // Time Block Rows
        timeBlocks.map((block, blockIdx) =>
          React.createElement('div', { 
            key: block.id, 
            className: `grid grid-cols-8 ${blockIdx < timeBlocks.length - 1 ? 'border-b border-gray-200' : ''}` 
          },
            React.createElement('div', { 
              className: 'p-4 bg-gray-50 font-semibold border-r border-gray-200 flex flex-col justify-center items-center'
            },
              React.createElement('div', { className: 'text-2xl mb-1' }, block.emoji),
              React.createElement('div', { className: 'text-sm' }, block.label),
              React.createElement('div', { className: 'text-xs text-gray-500' }, block.time)
            ),
            weekDates.map((date, dayIdx) => {
              const { available, booked } = getCleanersForSlot(date, block.id);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return React.createElement('div', {
                key: dayIdx,
                className: `p-3 border-r border-gray-200 min-h-[100px] ${isToday ? 'bg-yellow-50' : ''} hover:bg-gray-50 cursor-pointer`
              },
                React.createElement('div', { className: 'mb-2' },
                  React.createElement('span', { className: 'text-xs font-bold text-green-700' },
                    `${available.length} Available`
                  ),
                  booked.length > 0 && React.createElement('span', { className: 'text-xs text-orange-600 ml-2' },
                    ` • ${booked.length} Booked`
                  )
                ),
                React.createElement('div', { className: 'space-y-1' },
                  available.slice(0, 3).map(cleaner =>
                    React.createElement('div', {
                      key: cleaner.id,
                      className: 'text-xs bg-green-100 border border-green-300 rounded px-2 py-1 truncate',
                      title: cleaner.name
                    }, cleaner.name)
                  ),
                  available.length > 3 && 
                    React.createElement('div', { className: 'text-xs text-gray-600 font-medium' },
                      `+${available.length - 3} more`
                    )
                )
              );
            })
          )
        )
      )
    )
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
