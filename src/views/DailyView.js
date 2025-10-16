// src/views/DailyView.js
const { createElement } = React;
import { HOURLY_SLOTS } from '../config.js';
import { getMonday, getDayOfWeekAbbrev } from '../utils.js';

// Mobile view is a sub-component for clarity
const DailyViewMobile = ({ filteredData, selectedDay, openSlotDetails }) => {
    const dayPrefix = getDayOfWeekAbbrev(selectedDay);

    if (filteredData.length === 0) {
        return createElement('div', { className: 'text-center py-12 text-gray-500' }, 'No cleaners or jobs found for this day.');
    }

    return createElement('div', { className: 'space-y-4' },
        ...filteredData.map(c => {
            return createElement('div', { key: c.id, className: 'bg-gray-50 rounded-lg p-4' },
                createElement('div', { className: 'flex justify-between items-center mb-3' },
                    createElement('div', null,
                        createElement('div', { className: 'font-bold text-gray-800' }, c.name),
                        createElement('div', { className: 'text-xs text-gray-500' }, c.region)
                    ),
                    createElement('button', {
                      onClick: () => openSlotDetails(selectedDay, 'morning'), 
                      className: 'px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md'
                    }, 'Details')
                ),
                createElement('div', { className: 'grid grid-cols-4 sm:grid-cols-7 gap-1 text-center' },
                    ...HOURLY_SLOTS.map(hour => {
                        const status = c[`${dayPrefix}_${hour}`];
                        const isAvailable = status === 'AVAILABLE';
                        const isBooked = status?.startsWith('BOOKED');
                        let bgColor = 'bg-gray-200';
                        if (isAvailable) bgColor = 'bg-green-400';
                        if (isBooked) bgColor = c.id === 'unassigned' ? 'bg-yellow-400' : 'bg-red-400';

                        return createElement('div', { key: `${c.id}-${hour}` },
                            createElement('div', { className: 'text-xs text-gray-500 mb-1' }, hour),
                            createElement('div', { className: `w-full h-3 rounded ${bgColor}` })
                        );
                    })
                )
            );
        })
    );
};


const DailyView = ({ availabilityData, selectedDay, selectedRegion, searchQuery, openSlotDetails }) => {
    const weekMonday = getMonday(selectedDay);
    const weekString = weekMonday.toISOString().split('T')[0];
    const lowerQuery = searchQuery.toLowerCase();
    
    // Filter the data for the current day and filters
    const filtered = availabilityData
        .filter(c => c.weekStarting === weekString || c.id === 'unassigned') // Match week or be unassigned
        .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion || c.id === 'unassigned')
        .filter(c => 
            c.id === 'unassigned' ||
            !lowerQuery || 
            c.name?.toLowerCase().includes(lowerQuery) || 
            c.fullName?.toLowerCase().includes(lowerQuery) ||
            c.region?.toLowerCase().includes(lowerQuery) ||
            c.notes?.toLowerCase().includes(lowerQuery)
        );

    const desktopView = () => {
        if (filtered.length === 0) {
            return createElement('div', { className: 'text-center py-12 text-gray-500' }, 'No cleaners or jobs found for this day.');
        }
        return createElement('div', {
            className: 'grid gap-px bg-gray-300 border border-gray-300',
            style: { gridTemplateColumns: `150px repeat(${filtered.length}, 1fr)` }
        },
            createElement('div', { className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-sm' }, 'Time'),
            ...filtered.map(c =>
                createElement('div', { key: c.id, className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-xs sm:text-sm' },
                    createElement('div', { className: 'font-medium' }, c.name),
                    createElement('div', { className: 'text-xs font-normal opacity-80 mt-1' }, c.region)
                )
            ),
            ...HOURLY_SLOTS.flatMap(hour =>
                [
                    createElement('div', { key: `time-${hour}`, className: 'bg-gray-700 text-white p-3 sm:p-4 flex items-center justify-center font-medium text-sm' }, hour),
                    ...filtered.map(c => {
                        const dayPrefix = getDayOfWeekAbbrev(selectedDay);
                        const status = c[`${dayPrefix}_${hour}`];
                        const isAvailable = status === 'AVAILABLE';
                        const isBooked = status?.startsWith('BOOKED');
                        
                        let cellContent = '—';
                        let cellColor = 'bg-gray-300';
                        let textColor = 'text-gray-800';

                        if (isAvailable) {
                            cellColor = 'bg-green-500';
                            cellContent = '✓';
                            textColor = 'text-white';
                        } else if (isBooked) {
                            cellColor = c.id === 'unassigned' ? 'bg-yellow-400' : 'bg-red-500';
                            textColor = c.id === 'unassigned' ? 'text-yellow-900' : 'text-white';
                            const jobInfo = status.replace('BOOKED ', '');
                            cellContent = createElement('div', { className: 'text-xs font-semibold leading-tight p-1' }, jobInfo);
                        }

                        return createElement('div', {
                            key: `${c.id}-${hour}`,
                            onClick: () => openSlotDetails(selectedDay, hour),
                            className: `cursor-pointer hover:opacity-80 transition-all flex items-center justify-center text-center ${cellColor} ${textColor}`
                        }, cellContent);
                    })
                ]
            )
        );
    };
    
    return createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7' },
        createElement('div', { className: 'hidden lg:block overflow-x-auto' },
            createElement('div', { className: 'min-w-[1000px]' }, desktopView())
        ),
        createElement('div', { className: 'block lg:hidden' }, 
            createElement(DailyViewMobile, { filteredData: filtered, selectedDay, openSlotDetails })
        )
    );
};

export default DailyView;
