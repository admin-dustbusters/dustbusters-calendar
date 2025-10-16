// src/utils.js
import { DAY_ABBREV } from './config.js';

export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setHours(0, 0, 0, 0);
  return new Date(d.setDate(diff));
}

export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(' ');
  if (parts.length > 1 && parts[parts.length - 1]) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const getDayOfWeekAbbrev = (date) => {
    const dayIndex = date.getDay();
    // In JS, Sunday is 0. We want Monday to be the start of the grid.
    return dayIndex === 0 ? 'Sun' : DAY_ABBREV[dayIndex - 1];
};

export const getWeekDates = (currentWeek) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeek);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }
    return dates;
};

export const getCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // JS getDay() is Sun-based (0), our calendar month view is Sun-based.
    const startDay = firstDay.getDay(); 
    const daysInMonth = lastDay.getDate();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
};

export const getRegionColor = (region) => {
    const lowerRegion = region?.toLowerCase();
    const specificColors = {
      'all': 'teal', 'charlotte': 'yellow', 'raleigh': 'stone', 'triad': 'purple',
      'unassigned': 'gray',
    };
    if (specificColors[lowerRegion]) return specificColors[lowerRegion];
    const fallbackColors = ['pink', 'indigo', 'cyan', 'lime', 'orange'];
    let hash = 0;
    if (lowerRegion) {
      for (let i = 0; i < lowerRegion.length; i++) {
        hash = lowerRegion.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    const index = Math.abs(hash % fallbackColors.length);
    return fallbackColors[index];
};

export const getRegionEmoji = (region) => {
    const emojis = {
      'Charlotte': '🟡', 'Triad': '🟣', 'Raleigh': '🟤', 'Asheville': '⛰️', 'Wilmington': '🌊', 'Durham': '🐂'
    };
    return emojis[region] || '📍';
};
