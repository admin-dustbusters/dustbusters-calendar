const { useState, useEffect } = React;

// YOUR WEBHOOK URL
const N8N_WEBHOOK_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';

const DustBustersCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [view, setView] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [cleaners, setCleaners] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Loaded:', data);
      setCleaners(data.cleaners || []);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error:', error);
      alert('Could not load data!');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
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
    setCurrentWeek(getMonday(new Date()));
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
  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm' },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm' },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-9pm' },
  ];

  const filteredCleaners = cleaners.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || 
      c.region?.toLowerCase() === selectedRegion.toLowerCase();
    return matchesSearch && matchesRegion;
  });

  const regions = ['all', ...new Set(cleaners.map(c => c.region).filter(Boolean))];

  if (loading && cleaners.length === 0) {
    return React.createElement('div', { 
      className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center' 
    },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-6xl mb-4 animate-bounce' }, '🧹'),
        React.createElement('div', { className: 'text-2xl font-bold text-gray-800' }, 'Loading DustBusters Calendar...'),
        React.createElement('div', { className: 'text-sm text-gray-600 mt-2' }, 'Connecting to your data...')
      )
    );
  }

  return React.createElement('div', { 
    className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4' 
  },
    // Header
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-6' },
      React.createElement('div', { 
        className: 'bg-white rounded-2xl shadow-lg p-6 border-2 border-indigo-200' 
      },
        React.createElement('div', { className: 'flex items-center justify-between flex-wrap gap-4' },
          React.createElement('div', { className: 'flex items-center gap-4' },
            React.createElement('div', { className: 'text-5xl' }, '🧹'),
            React.createElement('div', null,
              React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' }, 'DustBusters Calendar'),
              React.createElement('p', { className: 'text-sm text-gray-500' }, 
                lastSync ? `Last updated ${lastSync.toLocaleTimeString()}` : 'Loading...'
              )
            )
          ),
          React.createElement('button', {
            onClick: loadData,
            disabled: loading,
            className: 'flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50'
          }, 
            React.createElement('span', null, loading ? '↻ Refreshing...' : '↻ Refresh')
          )
        )
      )
    ),

    // Stats Cards
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-6' },
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
        React.createElement('div', { className: 'bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500' },
          React.createElement('div', { className: 'text-xs font-bold text-gray-500 uppercase mb-1' }, 'Total Cleaners'),
          React.createElement('div', { className: 'text-4xl font-bold text-blue-600' }, cleaners.length)
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500' },
          React.createElement('div', { className: 'text-xs font-bold text-gray-500 uppercase mb-1' }, 'Charlotte'),
          React.createElement('div', { className: 'text-4xl font-bold text-green-600' }, 
            cleaners.filter(c => c.region === 'Charlotte').length
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500' },
          React.createElement('div', { className: 'text-xs font-bold text-gray-500 uppercase mb-1' }, 'Triad'),
          React.createElement('div', { className: 'text-4xl font-bold text-purple-600' }, 
            cleaners.filter(c => c.region === 'Triad').length
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500' },
          React.createElement('div', { className: 'text-xs font-bold text-gray-500 uppercase mb-1' }, 'Raleigh'),
          React.createElement('div', { className: 'text-4xl font-bold text-orange-600' }, 
            cleaners.filter(c => c.region === 'Raleigh').length
          )
        )
      )
    ),

    // Filters
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-6' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-md p-5' },
        React.createElement('div', { className: 'flex gap-4 flex-wrap' },
          React.createElement('input', {
            type: 'text',
            placeholder: '🔍 Search cleaners...',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: 'flex-1 min-w-[200px] px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500'
          }),
          React.createElement('select', {
            value: selectedRegion,
            onChange: (e) => setSelectedRegion(e.target.value),
            className: 'px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-white'
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
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-6' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-md p-5' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('button', {
            onClick: goToPreviousWeek,
            className: 'px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors'
          }, '← Previous Week'),
          React.createElement('div', { className: 'text-center' },
            React.createElement('div', { className: 'text-xl font-bold text-gray-800' },
              `${weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            ),
            React.createElement('button', {
              onClick: goToToday,
              className: 'text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-1'
            }, 'Jump to Today')
          ),
          React.createElement('button', {
            onClick: goToNextWeek,
            className: 'px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors'
          }, 'Next Week →')
        )
      )
    ),

    // Calendar Grid
    React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-lg overflow-hidden border-2 border-indigo-200' },
        // Calendar Header
        React.createElement('div', { className: 'grid grid-cols-8 bg-gradient-to-r from-indigo-600 to-purple-600' },
          React.createElement('div', { className: 'p-4 font-bold text-white border-r border-indigo-400' }, 'Time'),
          weekDates.map((date, i) => {
            const isToday = date.toDateString() === new Date().toDateString();
            return React.createElement('div', { 
              key: i, 
              className: `p-4 text-center border-r border-indigo-400 ${isToday ? 'bg-yellow-300 text-gray-900' : 'text-white'}`
            },
              React.createElement('div', { className: 'font-bold' }, dayNames[i]),
              React.createElement('div', { className: 'text-sm' }, 
                date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              )
            );
          })
        ),
        
        // Calendar Body
        timeBlocks.map((block, blockIdx) =>
          React.createElement('div', { 
            key: block.id, 
            className: `grid grid-cols-8 ${blockIdx !== timeBlocks.length - 1 ? 'border-b-2 border-gray-200' : ''}` 
          },
            React.createElement('div', { 
              className: 'p-4 bg-gray-50 font-semibold text-gray-700 border-r-2 border-gray-200 flex flex-col justify-center'
            },
              React.createElement('div', { className: 'text-2xl mb-1' }, block.emoji),
              React.createElement('div', null, block.label),
              React.createElement('div', { className: 'text-xs text-gray-500' }, block.time)
            ),
            weekDates.map((date, dayIdx) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return React.createElement('div', {
                key: dayIdx,
                className: `p-3 border-r border-gray-200 min-h-[120px] ${isToday ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors`
              },
                React.createElement('div', { className: 'text-xs font-bold text-gray-600 mb-2' },
                  `${filteredCleaners.length} Available`
                ),
                React.createElement('div', { className: 'space-y-1' },
                  filteredCleaners.slice(0, 3).map(cleaner =>
                    React.createElement('div', {
                      key: cleaner.id,
                      className: 'text-xs bg-green-100 border border-green-300 rounded px-2 py-1 text-green-800'
                    }, cleaner.name)
                  ),
                  filteredCleaners.length > 3 && 
                    React.createElement('div', { className: 'text-xs text-gray-500 font-medium pt-1' },
                      `+${filteredCleaners.length - 3} more`
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
