const { useState, useEffect, useMemo } = React;

const N8N_WEBHOOK_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';

// ... (keep all your existing code until the render section)

// At the end of the file, replace the last return statement with this complete version:
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
        React.createElement('div', { className: 'flex flex-wrap gap-4 items-center justify-between' },
          React.createElement('div', { className: 'flex rounded-lg bg-gray-100 p-1' },
            React.createElement('button', {
              onClick: () => setView('daily'),
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
    )
  )
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
