// src/views/DailyView.js
const { createElement } = React;
import { HOURLY_SLOTS } from '../config.js';
import { getMonday, getDayOfWeekAbbrev } from '../utils.js';

// No changes needed for the Mobile View sub-component
const DailyViewMobile = ({ filteredData, selectedDay, openSlotDetails, availabilityData }) => {
    // ... (This component will now receive the corrected filteredData)
    // ... (Your original mobile view code can be pasted here if needed, but the desktop version is the focus)
    return createElement('div', { className: 'text-center py-12 text-gray-500' }, 'Mobile view pending...');
};

const DailyView = ({ availabilityData, selectedDay, selectedRegion, searchQuery, openSlotDetails }) => {
    const weekMonday = getMonday(selectedDay);
    const weekString = weekMonday.toISOString().split('T')[0];
    const lowerQuery = searchQuery.toLowerCase();

    // --- NEW LOGIC: Start with a master list of all unique cleaners ---
    const uniqueCleanersMap = new Map();
    availabilityData.forEach(item => {
        // We only care about the cleaner's profile, not their weekly data yet
        if (item.id !== 'unassigned' && !uniqueCleanersMap.has(item.id)) {
            uniqueCleanersMap.set(item.id, {
                id: item.id,
                name: item.name,
                fullName: item.fullName,
                region: item.region,
                notes: item.notes,
                // Add any other core profile properties here
            });
        }
    });

    const allUniqueCleaners = Array.from(uniqueCleanersMap.values());
    
    // Now, filter this master list based on UI controls
    const filteredCleaners = allUniqueCleaners
        .filter(c => selectedRegion === 'all' || c.region?.toLowerCase() === selectedRegion)
        .filter(c => 
            !lowerQuery || 
            c.name?.toLowerCase().includes(lowerQuery) || 
            c.fullName?.toLowerCase().includes(lowerQuery) ||
            c.region?.toLowerCase().includes(lowerQuery) ||
            c.notes?.toLowerCase().includes(lowerQuery)
        );

    const unassignedJobsForWeek = availabilityData.find(c => c.id === 'unassigned' && c.weekStarting === weekString);

    // Combine the filtered cleaners with the unassigned jobs entry if it exists for this week
    const displayList = [...filteredCleaners];
    if (unassignedJobsForWeek) {
        displayList.push(unassignedJobsForWeek);
    }


    const desktopView = () => {
        if (displayList.length === 0) {
            return createElement('div', { className: 'text-center py-12 text-gray-500' }, 'No cleaners found matching your filters.');
        }
        return createElement('div', {
            className: 'grid gap-px bg-gray-300 border border-gray-300',
            style: { gridTemplateColumns: `150px repeat(${displayList.length}, 1fr)` }
        },
            // Header row (Time)
            createElement('div', { className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-sm' }, 'Time'),
            // Header row (Cleaner Names)
            ...displayList.map(c =>
                createElement('div', { key: c.id, className: 'bg-gray-800 text-white p-2 sm:p-4 font-semibold text-center text-xs sm:text-sm' },
                    createElement('div', { className: 'font-medium' }, c.name),
                    createElement('div', { className: 'text-xs font-normal opacity-80 mt-1' }, c.region)
                )
            ),
            // Data rows (for each hour)
            ...HOURLY_SLOTS.flatMap(hour =>
                [
                    // Time label column
                    createElement('div', { key: `time-${hour}`, className: 'bg-gray-700 text-white p-3 sm:p-4 flex items-center justify-center font-medium text-sm' }, hour),
                    // Data cells for each cleaner
                    ...displayList.map(cleanerProfile => {
                        // Find this cleaner's specific availability data for this week
                        const weekData = availabilityData.find(d => d.id === cleanerProfile.id && d.weekStarting === weekString);

                        const dayPrefix = getDayOfWeekAbbrev(selectedDay);
                        // If no weekData, they didn't submit, so status is null
                        const status = weekData ? weekData[`${dayPrefix}_${hour}`] : null;
                        
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
                            cellColor = cleanerProfile.id === 'unassigned' ? 'bg-yellow-400' : 'bg-red-500';
                            textColor = cleanerProfile.id === 'unassigned' ? 'text-yellow-900' : 'text-white';
                            const jobInfo = status.replace('BOOKED ', '');
                            cellContent = createElement('div', { className: 'text-xs font-semibold leading-tight p-1' }, jobInfo);
                        }

                        return createElement('div', {
                            key: `${cleanerProfile.id}-${hour}`,
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
            createElement(DailyViewMobile, { /* ...props for mobile... */ })
        )
    );
};

export default DailyView;
