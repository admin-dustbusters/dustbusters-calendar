// DustBusters Calendar Configuration

// Function to generate distinct colors for regions
function generateRegionColor(index) {
  const colors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#84CC16', // Lime
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#A855F7', // Violet
    '#22C55E', // Green
    '#FB923C', // Orange
    '#0EA5E9', // Sky
    '#D946EF', // Fuchsia
    '#64748B', // Slate
    '#78716C', // Stone
    '#DC2626', // Red
    '#16A34A'  // Green
  ];
  return colors[index % colors.length];
}

// Function to get emoji for region
function getRegionEmoji(index) {
  const emojis = ['🔵', '🟣', '🟡', '🟢', '🟠', '🔴', '🟤', '⚫', '⚪', '🟥', '🟦', '🟩', '🟨', '🟪', '🟫', '⬛', '⬜', '🔶', '🔷', '🔸'];
  return emojis[index % emojis.length];
}

// Auto-generate region configs from data
function initializeRegions(cleaners) {
  const regions = {};
  const uniqueRegions = [...new Set(cleaners.map(c => c.region))].filter(r => r && r !== '');
  
  uniqueRegions.forEach((region, index) => {
    regions[region] = {
      color: generateRegionColor(index),
      label: region,
      emoji: getRegionEmoji(index)
    };
  });
  
  // Always include Uncategorized and Unassigned
  if (!regions['Uncategorized']) {
    regions['Uncategorized'] = { color: '#A0AEC0', label: 'Other', emoji: '📍' };
  }
  if (!regions['Unassigned']) {
    regions['Unassigned'] = { color: '#F56565', label: 'Unassigned', emoji: '❓' };
  }
  
  return regions;
}

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
    // Will be populated dynamically
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

// Initialize regions when data is loaded
window.initializeRegionsFromData = function(cleaners) {
  CONFIG.REGIONS = initializeRegions(cleaners);
};
