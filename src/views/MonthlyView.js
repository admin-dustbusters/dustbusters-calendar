// src/views/MonthlyView.js
console.log('Rendering WeeklyView with props:', { 
       weekDates, availabilityData, selectedRegion
     });

const { createElement } = React;
import { getInitials } from '../utils.js';

const MonthlyView = ({ monthDays, getAvailableCleanersForDay, setSelectedDay, setView }) => {
    return createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7' },
        createElement('div', { className: 'grid grid-cols-7 gap-1 sm:gap-2' },
            ...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                createElement('div', { key: day, className: 'bg-gray-800 text-white p-2 sm:p-3 font-semibold text-center text-xs sm:text-sm rounded-lg' }, day)
            ),
            ...monthDays.map((date, idx) => {
                if (!date) {
                    return createElement('div', { key: `empty-${idx}`, className: 'bg-gray-50 rounded-lg' });
                }
                const availableCleaners = getAvailableCleanersForDay(date);
                const isToday = date.toDateString() === new Date().toDateString();
                return createElement('div', {
                    key: idx,
                    onClick: () => { setSelectedDay(date); setView('daily'); },
                    className: `border-2 rounded-lg p-2 min-h-[80px] sm:min-h-[120px] cursor-pointer hover:border-blue-500 transition-colors ${isToday ? 'border-yellow-400 bg-yellow-100' : 'border-gray-200 bg-white'}`
                },
                    createElement('div', { 
                        className: `font-semibold mb-2 text-sm ${isToday ? 'text-yellow-700' : 'text-gray-800'}` 
                    }, date.getDate()),
                    createElement('div', { className: 'flex flex-wrap gap-1' },
                        ...availableCleaners.slice(0, 3).map(cleaner => 
                            createElement('div', {
                                key: cleaner.id,
                                className: 'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs font-bold',
                                title: cleaner.name,
                            }, getInitials(cleaner.name))
                        ),
                        availableCleaners.length > 3 && createElement('div', { className: 'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-xs font-medium' }, `+${availableCleaners.length - 3}`)
                    )
                );
            })
        )
    );
};

export default MonthlyView;
