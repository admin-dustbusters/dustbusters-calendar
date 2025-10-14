// ... previous code ...
  React.createElement('button', {
    onClick: loadAvailabilityData,
    disabled: loading,
    className: 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50'
  }, loading ? '↻ Refreshing...' : '↻ Refresh')
      )
    ),

    // Navigation Controls
    React.createElement('div', { className: 'max-w-7xl mx-auto mb-5' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-5' },
        React.createElement('div', { className: 'flex flex-wrap gap-4 items-center justify-between' },
          // View Toggle
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

          // Navigation Buttons
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
root.
