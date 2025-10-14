// calendar.js - FINAL WORKING VERSION
const { useState, useEffect, useMemo } = React;
const { Calendar: CalendarIcon, Users, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight, Search, Sparkles, X, Loader2 } = lucide;

// --- CONFIGURATION ---
const N8N_WEBHOOK_URL = 'http://dustbusters-n8n.duckdns.org:5678/webhook/calendar-data';
// ---------------------

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

const DustBustersCalendar = () => {
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

    const dayAbbrev = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(N8N_WEBHOOK_URL);
            if (!response.ok) throw new Error(`API Connection Error: ${response.statusText}`);
            const data = await response.json();
            if (data && Array.isArray(data.cleaners)) {
                console.log("Data successfully loaded from n8n:", data.cleaners);
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
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const filteredCleaners = useMemo(() => {
        return cleaners.filter(c => {
            const matchesRegion = selectedRegion === 'all' || c.primaryRegion?.toLowerCase() === selectedRegion;
            const matchesSearch = !searchQuery || c.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
            return c.status === 'Hired' && matchesRegion && matchesSearch;
        });
    }, [cleaners, selectedRegion, searchQuery]);

    const getCleanersForSlot = (date, block) => {
        const dayPrefix = dayAbbrev[date.getDay()];
        const available = filteredCleaners.filter(c => 
            block.hours.every(hour => c[`${dayPrefix}_${hour}`] === 'AVAILABLE')
        );
        return { available };
    };

    if (error) {
        return (
            <div className="p-8 text-center bg-red-100 text-red-700 rounded-lg max-w-2xl mx-auto mt-10">
                <h2 className="font-bold text-lg">Failed to Load Calendar</h2>
                <p className="mt-2">{error}</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg">Try Again</button>
            </div>
        );
    }

    if (loading && cleaners.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen text-center">
                <div>
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                    <p className="mt-4 font-semibold text-gray-700">Loading Calendar Data...</p>
                </div>
            </div>
        );
    }
    
    const currentWeekMonday = getMonday(currentDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekMonday, i));
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                
                <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">🧹</div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">DustBusters Scheduling Calendar</h1>
                            {lastSync && <p className="text-xs text-gray-500">Last updated: {lastSync.toLocaleTimeString()}</p>}
                        </div>
                    </div>
                    <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Refresh
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex flex-wrap gap-2">
                            {['weekly', 'daily', 'monthly'].map(v => (
                                <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg font-medium text-sm ${view === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    {v.charAt(0).toUpperCase() + v.slice(1)} View
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><ChevronLeft size={20} /></button>
                            <span className="font-semibold text-gray-700 text-center w-48">
                                Week of {currentWeekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <div className="border-t pt-4 flex flex-wrap gap-2">
                        {['all', 'triad', 'charlotte', 'raleigh'].map(r => (
                            <button key={r} onClick={() => setSelectedRegion(r)} className={`px-4 py-2 rounded-lg font-medium text-sm ${selectedRegion === r ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {view === 'weekly' && (
                    <div className="bg-white rounded-xl shadow-sm p-4 overflow-x-auto">
                        <div className="grid" style={{ gridTemplateColumns: '150px repeat(7, 1fr)', minWidth: '1000px' }}>
                            <div className="sticky left-0 bg-gray-100"></div>
                            {weekDates.map((date, i) => (
                                <div key={i} className={`p-2 text-center font-semibold ${date.toDateString() === new Date().toDateString() ? 'bg-yellow-200' : ''}`}>
                                    <div>{dayNames[i]}</div>
                                    <div className="text-xs text-gray-500">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                </div>
                            ))}

                            {timeBlocks.map(block => (
                                <React.Fragment key={block.id}>
                                    <div className="sticky left-0 bg-gray-100 p-2 font-semibold text-sm flex flex-col items-center justify-center border-t">
                                        <span>{block.emoji} {block.label}</span>
                                        <span className="text-xs text-gray-500 font-normal">{block.time}</span>
                                    </div>
                                    {weekDates.map((date, i) => {
                                        const { available } = getCleanersForSlot(date, block);
                                        return (
                                            <div key={i} className={`p-2 border-t min-h-[100px] ${date.toDateString() === new Date().toDateString() ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                                <div className="text-green-600 font-semibold text-xs mb-1">{available.length} Available</div>
                                                <div className="space-y-1">
                                                    {available.map(c => (
                                                        <div key={c.id} className="text-xs bg-green-100 text-green-800 p-1 rounded truncate" title={c.fullName}>
                                                            {c.fullName}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
                
                {view !== 'weekly' && (
                    <div className="text-center p-10 bg-white rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-700">Daily and Monthly views are coming soon!</h3>
                    </div>
                )}

            </div>
        </div>
    );
};
