// DustBusters Calendar Configuration
const CONFIG = {
  API: {
    BASE_URL: 'https://dustbusters-n8n.duckdns.org/webhook',
    ENDPOINTS: {
      CALENDAR_DATA: '/calendar-data'
    },
    REFRESH_INTERVAL: 60000,
    TIMEOUT: 10000
  },
  REGIONS: {
    'Charlotte': { color: '#F59E0B', label: 'Charlotte', emoji: '🟡' },
    'Triad': { color: '#805AD5', label: 'Triad', emoji: '🟣' },
    'Raleigh': { color: '#9C4221', label: 'Raleigh', emoji: '🟤' },
    'Uncategorized': { color: '#A0AEC0', label: 'Other', emoji: '📍' },
    'Unassigned': { color: '#F56565', label: 'Unassigned', emoji: '❓' }
  },
  STATUS: {
    AVAILABLE: { color: '#48BB78', bg: '#F0FFF4', label: 'Available' },
    BOOKED: { color: '#F56565', bg: '#FFF5F5', label: 'Booked' },
    UNAVAILABLE: { color: '#A0AEC0', bg: '#F7FAFC', label: 'Unavailable' }
  },
  TIME_SLOTS: {
    ALL_HOURS: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'],
    PERIODS: {
      MORNING: { label: 'Morning', slots: ['8am', '9am', '10am', '11am'] },
      AFTERNOON: { label: 'Afternoon', slots: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
      EVENING: { label: 'Evening', slots: ['5pm', '6pm', '7pm', '8pm'] }
    }
  },
  DAYS: {
    DATA_KEYS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    DISPLAY_SHORT_SUNDAY_START: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    DISPLAY_FULL_MON_START: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  VIEWS: {
    CLEANERS: 'cleaners',
    WEEKLY: 'weekly',
    DAILY: 'daily',
    HOURLY: 'hourly',
    MONTHLY: 'monthly'
  },
  UI: {
    DEFAULT_VIEW: 'weekly',
    SEARCH_DEBOUNCE: 300
  },
  CACHE: {
    ENABLED: false
  }
};
