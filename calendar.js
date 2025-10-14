const { useState, useEffect, useMemo } = React;

const N8N_WEBHOOK_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';

function DustBustersCalendar() {
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [view, setView] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourlySlots = ['8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm'];
  
  const timeBlocks = [
    { id: 'morning', label: 'Morning', emoji: '🌅', time: '8am-12pm', hours: ['8am', '9am', '10am', '11am'] },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
    { id: 'evening', label: 'Evening', emoji: '🌙', time: '5pm-8pm', hours: ['5pm', '6pm', '7pm', '8pm'] },
  ];

  const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 'Sun' : dayAbbrev[dayIndex - 1];
  };

  const loadAvailabilityData = async () => {
    setLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let cleaners = [];
      if (Array.isArray(data)) {
        cleaners = data[0]?.cleaners || [];
      } else if (data.cleaners) {
        cleaners = data.cleaners;
      }
      cleaners = cleaners.map(c => {
        const hasAvailability = Object.keys(c).some(k => k.includes('_'));
        if (!hasAvailability) {
          const mock = {};
          ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(day => {
            hourlySlots.forEach(hour => {
              const rand = Math.random();
              if (rand > 0.7) mock[`${day}_${hour}`] = 'BOOKED: #' + Math.floor(Math.random() * 9000 + 1000);
              else if (rand > 0.2) mock[`${day}_${hour}`] = 'AVAILABLE';
              else mock[`${day}_${hour}`] = 'UNAVAILABLE';
            });
          });
          return { ...c, ...mock };
        }
        return c;
      });
      setAvailabilityData(cleaners);
      setLastSync(new Date());
    } catch (e) {
      console.error(e);
      setAvailabilityData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAvailabilityData();
    const interval = setInterval(loadAvailabilityData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeek);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const getStats = () => {
    const s = { available: 0, booked: 0 };
    availabilityData.forEach(c => {
      Object.keys(c).forEach(k => {
        if (k.includes('_')) {
          if (c[k] === 'AVAILABLE') s.available++;
          else if (c[k]?.startsWith('BOOKED')) s.booked++;
        }
      });
    });
    return s;
  };
  const stats = getStats();

  const availableRegions = useMemo(() => {
    const regions = new Set();
    availabilityData.forEach(c => {
      if (c.region) regions.add(c.region);
      if (Array.isArray(c.regions)) c.regions.forEach(r => regions.add(r));
    });
    return ['all', ...Array.from(regions).sort()];
  }, [availabilityData]);

  const getRegionColor = (region) => {
    const colors = {
      all: 'teal',
      charlotte: 'blue',
      triad: 'green',
      raleigh: 'yellow',
      asheville: 'purple',
      wilmington: 'orange',
      durham: 'pink',
      default: 'gray'
    };
    return colors[region?.toLowerCase()] || colors.default;
  };

  if (loading && availabilityData.length === 0) {
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center text-xl' }, 'Loading...');
  }

  return React.createElement('div', { className: 'p-6 space-y-6' },
    React.createElement('h1', { className: 'text-3xl font-bold' }, '🧹 DustBusters Calendar'),
    React.createElement('div', null, 
      `Last updated: ${lastSync ? lastSync.toLocaleTimeString() : '—'}`
    ),
    React.createElement('div', { className: 'grid grid-cols-4 gap-4' },
      React.createElement('div', null, `Cleaners: ${availabilityData.length}`),
      React.createElement('div', null, `Available Slots: ${stats.available}`),
      React.createElement('div', null, `Booked Slots: ${stats.booked}`),
      React.createElement('div', null, 
        React.createElement('button', { onClick: loadAvailabilityData, className: 'bg-blue-500 text-white px-4 py-2 rounded' }, 'Refresh')
      )
    ),
    React.createElement('div', null,
      `Current view: ${view} (${availableRegions.length - 1} regions)`
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DustBustersCalendar));
