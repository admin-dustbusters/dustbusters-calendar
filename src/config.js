// src/config.js

// API Endpoints
export const N8N_CLEANERS_URL = 'https://dustbusters-n8n.duckdns.org/webhook/calendar-data';
export const N8N_JOBS_URL = 'https://dustbusters-n8n.duckdns.org/webhook/jobs-data';

// Hourly time slots (for daily/hourly view)
export const HOURLY_SLOTS = [
  '8am', '9am', '10am', '11am', '12pm', 
  '1pm', '2pm', '3pm', '4pm', '5pm', 
  '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
];

// Time blocks (for weekly view)
export const TIME_BLOCKS = [
  { 
    id: 'morning', 
    label: 'Morning', 
    emoji: '🌅', 
    time: '8am-12pm', 
    hours: ['8am', '9am', '10am', '11am'] 
  },
  { 
    id: 'afternoon', 
    label: 'Afternoon', 
    emoji: '☀️', 
    time: '12pm-5pm', 
    hours: ['12pm', '1pm', '2pm', '3pm', '4pm'] 
  },
  { 
    id: 'evening', 
    label: 'Evening', 
    emoji: '🌙', 
    time: '5pm-8pm', 
    hours: ['5pm', '6pm', '7pm', '8pm'] 
  },
];

// Day names
export const DAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 
  'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
