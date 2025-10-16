// src/views/WeeklyView.js
const { createElement } = React;
import { DAY_NAMES, TIME_BLOCKS } from '../config.js';

const WeeklyView = ({ weekDates, getCleanersForSlot, openSlotDetails, setSelectedDay, setView }) => {
    return createElement('div', { className: 'bg-white rounded-xl shadow-sm p-3 sm:p-7 overflow-x-auto' },
        createElement('div', { className: 'min-w-[1200px]' },
            createElement('div', { className: 'grid grid-cols-8 gap-px bg-gray-300 border border-gray-300 mb-px' },
                createElement('div', { className: 'bg-gray-800 text-white p-4 font-semibold text-center text-sm' }, 'Time Slot'),
                ...DAY_NAMES.map((day, idx) => {
                    const date = weekDates[idx];
                    const isToday = date.toDateString() === new Date().toDateString();
                    return createElement('div', { 
                        key: idx, 
                        onClick: () => {
                            setSelectedDay(date);
                            setView('daily');
                        },
                        className: `p-3 sm:p-4 font-semibold text-center text-sm cursor-pointer hover:opacity-80 transition-colors ${isToday ? 'bg-yellow-300 text-yellow-800' : 'bg-gray-800 text-white hover:bg-blue-500'}`
                    },
                        day.substring(0,3),
                        createElement('div', { className: 'text-xs font-normal mt-1' },
                            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        )
                    );
                })
            ),
            ...TIME_BLOCKS.map((block) =>
                createElement('div', { key: block.id, className: 'grid grid-cols-8 gap-px bg-gray-300 border-l border-r border-b border-gray-300' },
                    createElement('div', { className: 'bg-gray-700 text-white p-4 flex flex-col justify-center' },
                        createElement('div', { className: 'font-medium text-sm' }, `${block.emoji} ${block.label}`),
                        createElement('div', { className: 'text-xs opacity-80 mt-1' }, block.time)
                    ),
                    ...weekDates.map((date, dayIdx) => {
                        const { available, booked, total } = getCleanersForSlot(date, block.id);
                        const isToday = date.toDateString() === new Date().toDateString();
                        return createElement('div', {
                            key: dayIdx,
                            onClick: () => openSlotDetails(date, block.id),
                            className: `p-2 sm:p-3 min-h-[90px] sm:min-h-[100px] relative cursor-pointer hover:bg-gray-100 transition-colors ${isToday ? 'bg-yellow-50' : 'bg-white'}`
                        },
                            total > 0 && createElement('div', { className: 'absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full' }, total),
                            createElement('div', { className: 'flex flex-col gap-1' },
                                ...available.slice(0, 4).map((cleaner) =>
                                    createElement('div', {
                                        key: cleaner.id,
                                        className: 'inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium',
                                        title: cleaner.name
                                    }, cleaner.name)
                                ),
                                ...booked.slice(0, 4).map((booking) =>
                                    createElement('div', {
                                        key: `${booking.cleaner.id}-${booking.details}`,
                                        className: `inline-block px-2 py-1 ${booking.cleaner.id === 'unassigned' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} rounded-full text-xs font-medium`,
                                        title: `${booking.cleaner.name} - ${booking.details}`
                                    }, booking.cleaner.id === 'unassigned' ? booking.details.replace('BOOKED ', '') : booking.cleaner.name)
                                ),
                                total === 0 && createElement('div', { className: 'text-gray-400 text-xs italic' }, 'No Activity')
                            )
                        );
                    })
                )
            )
        )
    );
};

export default WeeklyView;
