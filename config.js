// DustBusters Calendar Configuration
window.CONFIG = {
  // API Configuration
  API: {
    BASE_URL: 'https://dustbusters-n8n.duckdns.org/webhook',
    ENDPOINTS: {
      CALENDAR_DATA: '/calendar-data',
      CHECK_AVAILABILITY: '/check-availability',
      BOOK_JOB: '/book-job'
    },
    REFRESH_INTERVAL: 60000, // 60 seconds
    TIMEOUT: 10000
  },

  // Region Configuration
  REGIONS: {
    'Charlotte': { color: '#4299E1', label: 'Charlotte', emoji: '🏙️' },
    'Triad': { color: '#48BB78', label: 'Triad', emoji: '🌲' },
    'Raleigh': { color: '#ECC94B', label: 'Raleigh', emoji: '🏛️' },
    'Uncategorized': { color: '#A0AEC0', label: 'Other', emoji: '📍' },
    'Unassigned': { color: '#F56565', label: 'Unassigned', emoji: '❓' }
  },

  // Status Configuration
  STATUS: {
    AVAILABLE: { color: '#48BB78', bg: '#F0FFF4', label: 'Available' },
    BOOKED: { color: '#F56565', bg: '#FFF5F5', label: 'Booked' },
    UNAVAILABLE: { color: '#A0AEC0', bg: '#F7FAFC', label: 'Unavailable' },
    PENDING: { color: '#ECC94B', bg: '#FEFCBF', label: 'Pending' }
  },

  // Time Configuration
  TIME_SLOTS: {
    PERIODS: {
      MORNING: { label: 'Morning', slots: ['8am', '9am', '10am', '11am'] },
      AFTERNOON: { label: 'Afternoon', slots: ['12pm', '1pm', '2pm', '3pm', '4pm'] },
      EVENING: { label: 'Evening', slots: ['5pm', '6pm', '7pm', '8pm'] }
    }
  },

  // Days Configuration
  DAYS: {
    SHORT: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },

  // View Modes
  VIEWS: {
    HOURLY: 'hourly',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CLEANER: 'cleaner'
  },

  // UI Configuration
  UI: {
    DEFAULT_VIEW: 'weekly',
    SEARCH_DEBOUNCE: 300
  },

  // Cache Configuration
  CACHE: {
    ENABLED: false,
    KEY: 'dustbusters_calendar_data',
    EXPIRY: 300000
  }
};
