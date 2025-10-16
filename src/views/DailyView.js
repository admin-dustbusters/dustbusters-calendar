// src/views/DailyView.js - FIXED VERSION
console.log('Rendering WeeklyView with props:', { 
       weekDates, availabilityData, selectedRegion
     });

const { createElement } = React;
import { HOURLY_SLOTS } from '../config.js';
import { getMonday, getDayOfWeekAbbrev } from '../utils.js';

const DailyView = ({ availabilityData, selectedDay, selectedRegion, searchQuery, openSlotDetails }) => {
    const weekMonday = getMonday(selectedDay);
    const weekString = weekMonday.toISOString().split('T')[0];
    const dayPrefix = getDayOfWeekAbbrev(selectedDay);
    const lowerQuery = searchQuery.toLowerCase();

    console.log('🗓️ Daily View Debug:', {
        selectedDay: selectedDay.toISOString(),
        weekString,
        dayPrefix,
        totalData: availabilityData.length
    });

    // Step 1: Get ALL unique cleaners from the data
    const uniqueCleanersMap = new Map();
    availabilityData.forEach(item => {
        if (item.id !== 'unassigned' && !uniqueCleanersMap.has(item.id)) {
            uniqueCleanersMap.set(item.id, {
                id: item.id,
                name: item.name,
                fullName: item.fullName || item.name,
                region: item.region,
                notes: item.notes,
                phone: item.phone,
                email: item.email,
                rate: item.rate
            });
        }
    });

    console.log('👥 Unique cleaners found:', uniqueCleanersMap.size);

    // Step 2: Filter cleaners by region and search
    const filteredCleaners = Array.from(uniqueCleanersMap.values())
        .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion)
        .filter(c => 
            !lowerQuery || 
            c.name?.toLowerCase().includes(lowerQuery) || 
            c.fullName?.toLowerCase().includes(lowerQuery) ||
            c.region?.toLowerCase().includes(lowerQuery) ||
            c.notes?.toLowerCase().includes(lowerQuery)
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    console.log('✅ Filtered cleaners:', filteredCleaners.length);

    // Step 3: Get unassigned jobs for this week
    const unassignedJobsForWeek = availabilityData.find(
        c => c.id === 'unassigned' && c.weekStarting === weekString
    );

    // Step 4: Build display list
    const displayList = [...filteredCleaners];
    if (unassignedJobsForWeek) {
        displayList.push(unassignedJobsForWeek);
        console.log('📋 Added unassigned jobs section');
    }

    // Mobile view component
    const MobileView = () => {
        if (displayList.length === 0) {
            return createElement('div', { className: 'text-center py-12 text-gray-500' }, 
                'No cleaners found matching your filters.'
            );
        }

        return createElement('div', { className: 'space-y-4' },
            ...displayList.map(cleanerProfile => {
                // Find this cleaner's week data
                const weekData = availabilityData.find(
                    d => d.id === cleanerProfile.id && d.weekStarting === weekString
                );

                return createElement('div', {
                    key: cleanerProfile.id,
                    className: 'bg-white rounded-lg border border-gray-200 p-4'
                },
                    // Cleaner header
                    createElement('div', { className: 'flex items-center justify-between mb-4 pb-3 border-b' },
                        createElement('div', null,
                            createElement('div', { className: 'font-semibold text-gray-900' }, cleanerProfile.name),
                            createElement('div', { className: 'text-xs text-gray-500' }, cleanerProfile.region)
                        ),
                        createElement('div', { className: 'text-xs px-2 py-1 bg-gray-100 rounded' }, cleanerProfile.id)
                    ),
                    // Hourly slots
                    createElement('div', { className: 'grid grid-cols-4 gap-2' },
                        ...HOURLY_SLOTS.map(hour => {
                            const fieldName = `${dayPrefix}_${hour}`;
                            const status = weekData ? weekData[fieldName] : null;
                            
                            const isAvailable = status === 'AVAILABLE';
                            const isBooked = status?.startsWith('BOOKED');
                            
                            let bgColor = 'bg-gray-100';
                            let textColor = 'text-gray-400';
                            let displayText = hour;
                            
                            if (isAvailable) {
                                bgColor = 'bg-green-100';
                                textColor = 'text-green-700';
                            } else if (isBooked) {
                                bgColor = cleanerProfile.id === 'unassigned' ? 'bg-yellow-100' : 'bg-red-100';
                                textColor = cleanerProfile.id === 'unassigned' ? 'text-yellow-800' : 'text-red-700';
                                displayText = '🔴';
                            }
                            
                            return createElement('button', {
                                key: hour,
                                onClick: () => openSlotDetails(selectedDay, hour),
                                className: `${bgColor} ${textColor} py-2 px-1 rounded text-xs font-medium hover:opacity-80 transition`
                            }, displayText);
                        })
                    )
                );
            })
        );
    };

    // Desktop view
    const DesktopView = () => {
        if (displayList.length === 0) {
            return createElement('div', { className: 'text-center py-12 text-gray-500' }, 
                'No cleaners found matching your filters.'
            );
        }

        return createElement('div', {
            className: 'grid gap-px bg-gray-300 border border-gray-300',
            style: { gridTemplateColumns: `150px repeat(${displayList.length}, 1fr)` }
        },
            // Header row - Time label
            createElement('div', { 
                className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-sm sticky top-0 z-10' 
            }, 'Time'),
            
            // Header row - Cleaner names
            ...displayList.map(cleanerProfile =>
                createElement('div', { 
                    key: `header-${cleanerProfile.id}`,
                    className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-xs sm:text-sm sticky top-0 z-10' 
                },
                    createElement('div', { className: 'font-medium truncate' }, cleanerProfile.name),
                    createElement('div', { className: 'text-xs font-normal opacity-80 mt-1 truncate' }, cleanerProfile.region)
                )
            ),
            
            // Data rows - for each hour
            ...HOURLY_SLOTS.flatMap(hour => {
                const cells = [];
                
                // Time label cell
                cells.push(
                    createElement('div', { 
                        key: `time-${hour}`,
                        className: 'bg-gray-700 text-white p-3 sm:p-4 flex items-center justify-center font-medium text-sm' 
                    }, hour)
                );
                
                // Data cell for each cleaner
                displayList.forEach(cleanerProfile => {
                    // Find this cleaner's specific week data
                    const weekData = availabilityData.find(
                        d => d.id === cleanerProfile.id && d.weekStarting === weekString
                    );

                    const fieldName = `${dayPrefix}_${hour}`;
                    const status = weekData ? weekData[fieldName] : null;
                    
                    const isAvailable = status === 'AVAILABLE';
                    const isBooked = status?.startsWith('BOOKED');
                    
                    let cellContent = '—';
                    let cellColor = 'bg-gray-200';
                    let textColor = 'text-gray-500';

                    if (isAvailable) {
                        cellColor = 'bg-green-500';
                        cellContent = '✓';
                        textColor = 'text-white';
                    } else if (isBooked) {
                        cellColor = cleanerProfile.id === 'unassigned' ? 'bg-yellow-400' : 'bg-red-500';
                        textColor = cleanerProfile.id === 'unassigned' ? 'text-yellow-900' : 'text-white';
                        const jobInfo = status.replace('BOOKED ', '');
                        cellContent = createElement('div', { 
                            className: 'text-xs font-semibold leading-tight p-1 truncate',
                            title: jobInfo
                        }, jobInfo);
                    } else if (!weekData) {
                        // No submission for this week
                        cellColor = 'bg-gray-100';
                        cellContent = '—';
                        textColor = 'text-gray-400';
                    }

                    cells.push(
                        createElement('div', {
                            key: `${cleanerProfile.id}-${hour}`,
                            onClick: () => openSlotDetails(selectedDay, hour),
                            className: `cursor-pointer hover:opacity-80 transition-all flex items-center justify-center text-center min-h-[60px] ${cellColor} ${textColor}`
                        }, cellContent)
                    );
                });
                
                return cells;
            })
        );
    };
    
    return createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7' },
        // Date display
        createElement('div', { className: 'mb-4 pb-4 border-b' },
            createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 
                selectedDay.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                })
            ),
            createElement('p', { className: 'text-sm text-gray-500 mt-1' }, 
                `Showing ${displayList.length} cleaner${displayList.length !== 1 ? 's' : ''}`
            )
        ),
        
        // Desktop view
        createElement('div', { className: 'hidden lg:block overflow-x-auto' },
            createElement('div', { className: 'min-w-[1000px]' }, 
                createElement(DesktopView)
            )
        ),
        
        // Mobile view
        createElement('div', { className: 'block lg:hidden' }, 
            createElement(MobileView)
        )
    );
};

export default DailyView;
