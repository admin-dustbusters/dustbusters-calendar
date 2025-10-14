// calendar.js - FINAL VERSION
const { useState, useEffect, useMemo } = React;
const { Calendar: CalendarIcon, Users, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight, Search, Sparkles, X, Loader2 } = lucide;

// --- CONFIGURATION ---
const N8N_WEBHOOK_URL = 'http://dustbusters-n8n.duckdns.org:5678/webhook/calendar-data';
// ---------------------

const DustBustersCalendar = () => {
    // State Management
    const [view, setView] = useState('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [cleaners, setCleaners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSync, setLastSync] = useState(null);

    const timeBlocks = useMemo(() => [
        { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
        { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
        { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] },
    ], []);

    const hourlySlots = useMemo(() => timeBlocks.flatMap(b => b.hours), [timeBlocks]);
    const dayAbbrev = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Data Fetching
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(N8N_WEBHOOK_URL);
            if (!response.ok) throw new Error(`API Connection Error: ${response.statusText}`);
            const data = await response.json();
            if (data && Array.isArray(data.cleaners)) {
                console.log("Data successfully loaded:", data.cleaners);
                setCleaners(data.cleaners);
                setLastSync(new Date());
            } else {
                throw new Error("Invalid data format from API.");
            }
        } catch (e) {
            console.error("Failed to fetch data:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
        return () => clearInterval(interval);
    }, []);

    // Filtering Logic
    const filteredCleaners = useMemo(() => {
        return cleaners.filter(c => {
            const matchesRegion = selectedRegion === 'all' || c.primaryRegion?.toLowerCase() === selectedRegion;
            const matchesSearch = !searchQuery || c.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRegion && matchesSearch;
        });
    }, [cleaners, selectedRegion, searchQuery]);

    // UI Rendering Logic
    const getCleanersForSlot = (date, blockOrHour) => {
        const dayPrefix = dayAbbrev[date.getDay()];
        const hoursToCheck = typeof blockOrHour === 'string' ? [blockOrHour] : blockOrHour.hours;

        const available = filteredCleaners.filter(c => 
            hoursToCheck.every(hour => c[`${dayPrefix}_${hour}`] === 'AVAILABLE')
        );
        return { available };
    };

    // Main render function
    return React.createElement('div', { className: 'p-4 md:p-8 font-sans bg-gray-50 min-h-screen' },
        React.createElement('div', { className: 'max-w-7xl mx-auto space-y-6' },
            // Header
            React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 flex justify-between items-center' },
                React.createElement('div', { className: 'flex items-center gap-3' },
                    React.createElement('div', { className: 'text-3xl' }, '🧹'),
                    React.createElement('div', null,
                        React.createElement('h1', { className: 'text-xl font-bold text-gray-800' }, 'DustBusters Scheduling Calendar'),
                        lastSync && React.createElement('p', { className: 'text-xs text-gray-500' }, `Last updated: ${lastSync.toLocaleTimeString()}`)
                    )
                ),
                React.createElement('button', { onClick: fetchData, disabled: loading, className: 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300' },
                    loading ? React.createElement(Loader2, { className: 'w-4 h-4 animate-spin' }) : React.createElement(RefreshCw, { className: 'w-4 h-4' }),
                    'Refresh'
                )
            ),
            // Controls
            React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 space-y-4' },
                 React.createElement('div', { className: 'flex justify-between items-center flex-wrap gap-4' },
                     React.createElement('div', { className: 'flex flex-wrap gap-2' },
                        ['weekly', 'daily', 'monthly'].map(v => React.createElement('button', { key: v, onClick: () => setView(v), className: `px-4 py-2 rounded-lg font-medium text-sm ${view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}` }, `${v.charAt(0).toUpperCase() + v.slice(1)} View`))
                     ),
                      React.createElement('div', { className: 'flex items-center gap-2' },
                         React.createElement('button', { onClick: () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 7))), className: 'p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, React.createElement(ChevronLeft, { size: 20 })),
                         React.createElement('span', { className: 'font-semibold text-gray-700 text-center w-48' }, `Week of ${getMonday(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`),
                         React.createElement('button', { onClick: () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 7))), className: 'p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600' }, React.createElement(ChevronRight, { size: 20 }))
                     )
                 ),
                 React.createElement('div', { className: 'border-t pt-4 flex flex-wrap gap-2' },
                    ['all', 'triad', 'charlotte', 'raleigh'].map(r => React.createElement('button', { key: r, onClick: () => setSelectedRegion(r), className: `px-4 py-2 rounded-lg font-medium text-sm ${selectedRegion === r ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}` }, r.charAt(0).toUpperCase() + r.slice(1)))
                 )
            ),
            // View Container
            error ? React.createElement('div', { className: 'bg-red-100 text-red-700 p-4 rounded-lg' }, `Error: ${error}`) :
            loading ? React.createElement('div', { className: 'flex justify-center items-center p-10' }, React.createElement(Loader2, { className: 'w-8 h-8 animate-spin text-blue-500' })) :
            view === 'weekly' && React.createElement('div', { className: 'bg-white rounded-xl shadow-sm p-4 overflow-x-auto' },
                React.createElement('div', { className: 'grid', style: { gridTemplateColumns: '150px repeat(7, 1fr)', minWidth: '1000px' } },
                    React.createElement('div', { className: 'sticky left-0 bg-gray-100' }),
                    Array.from({ length: 7 }).map((_, i) => {
                        const date = addDays(getMonday(currentDate), i);
                        return React.createElement('div', { key: i, className: `p-2 text-center font-semibold ${date.toDateString() === new Date().toDateString() ? 'bg-yellow-200' : ''}` },
                            React.createElement('div', null, dayAbbrev[date.getDay()]),
                            React.createElement('div', { className: 'text-xs text-gray-500' }, date.getDate())
                        );
                    }),
                    timeBlocks.map(block => React.createElement(React.Fragment, { key: block.id },
                        React.createElement('div', { className: 'sticky left-0 bg-gray-100 p-2 font-semibold text-sm flex flex-col items-center justify-center border-t' },
                             React.createElement('span', null, block.emoji, ' ', block.label),
                             React.createElement('span', { className: 'text-xs text-gray-500 font-normal' }, block.time)
                        ),
                        Array.from({ length: 7 }).map((_, i) => {
                            const date = addDays(getMonday(currentDate), i);
                            const { available } = getCleanersForSlot(date, block);
                            return React.createElement('div', { key: i, className: `p-2 border-t min-h-[100px] ${date.toDateString() === new Date().toDateString() ? 'bg-yellow-50' : 'hover:bg-gray-50'}` },
                                React.createElement('div', { className: 'text-green-600 font-semibold text-xs mb-1' }, `${available.length} Available`),
                                React.createElement('div', { className: 'space-y-1' },
                                    available.map(c => React.createElement('div', { key: c.id, className: 'text-xs bg-green-100 text-green-800 p-1 rounded truncate' }, c.fullName))
                                )
                            );
                        })
                    ))
                )
            )
            // Other views can be added here
        )
    );
};
