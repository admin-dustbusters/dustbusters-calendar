// DustBusters Calendar - Utility Functions
const Utils = {
  date: {
    getWeekStart(date = new Date()) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    getWeekEnd(date = new Date()) {
      const start = this.getWeekStart(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return end;
    },
    formatDate(date, format = 'YYYY-MM-DD') {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    formatMonthYear(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    },
    formatFullDate(date) {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },
    formatWeekRange(startDate) {
      const opts = { month: 'short', day: 'numeric' };
      const start = startDate.toLocaleDateString('en-US', opts);
      return `Week of ${start}`;
    },
    formatDayMonth(date) {
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        let suffix = 'th';
        if (day % 10 === 1 && day !== 11) {
            suffix = 'st';
        } else if (day % 10 === 2 && day !== 12) {
            suffix = 'nd';
        } else if (day % 10 === 3 && day !== 13) {
            suffix = 'rd';
        }
        return `${day}${suffix} ${month}.`;
    },
    getDataDayKey(date) {
      const d = new Date(date);
      const day = d.getDay();
      const index = day === 0 ? 6 : day - 1;
      return CONFIG.DAYS.DATA_KEYS[index];
    },
    addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    },
    addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
  },
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },
  parseBooking(bookingString) {
    if (!bookingString || !bookingString.startsWith('BOOKED')) return null;
    const parts = bookingString.replace('BOOKED ', '').split(' | ');
    return {
      jobNumber: parts[0]?.trim() || '',
      customer: parts[1]?.trim() || '',
      address: parts[2]?.trim() || ''
    };
  },
  getTimeSlotsForPeriod(period) {
    const periods = CONFIG.TIME_SLOTS.PERIODS;
    return periods[period.toUpperCase()]?.slots || [];
  }
};
