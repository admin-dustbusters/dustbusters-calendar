// DustBusters Calendar Configuration
const CONFIG = {
  // ⚠️ CHANGE THIS to your n8n webhook URL
  API: {
    BASE_URL: 'http://dustbusters-n8n.duckdns.org:5678/webhook',
    ENDPOINTS: {
      CALENDAR_DATA: '/calendar-data',
      CHECK_AVAILABILITY: '/check-availability',
      BOOK_JOB: '/book-job'
    },
    REFRESH_INTERVAL: 60000, // 60 seconds
    TIMEOUT: 10000
  },

  REGIONS: {
    'Charlotte': { color: '#4299E1', label: 'Charlotte', emoji: '🏙️' },
    'Triad': { color: '#48BB78', label: 'Triad', emoji: '🌲' },
    'Raleigh': { color: '#ECC94B', label: 'Raleigh', emoji: '🏛️' },
    'Uncategorized': { color: '#A0AEC0', label: 'Other', emoji: '📍' },
    'Unassigned': { color: '#F56565', label: 'Unassigned', emoji: '❓' }
  },

  TIME_SLOTS: {
    PERIODS: {
      MORNING: { label: 'Morning', slots: ['8am', '9am', '10am', '11am'] },
      AFTERNOON: { label: 'Afternoon', slots: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
      EVENING: { label: 'Evening', slots: ['5pm', '6pm', '7pm', '8pm'] }
    }
  },

  DAYS: {
    SHORT: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },

  VIEWS: {
    HOURLY: 'hourly',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CLEANER: 'cleaner'
  },

  UI: {
    DEFAULT_VIEW: 'weekly',
    SEARCH_DEBOUNCE: 300
  },

  CACHE: {
    ENABLED: true,
    KEY: 'dustbusters_calendar_data',
    EXPIRY: 300000
  }
};
