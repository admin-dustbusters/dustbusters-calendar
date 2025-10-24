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
    
    // Check if job is cancelled or deleted - return null if so
    const lowerBooking = bookingString.toLowerCase();
    const cancelledIndicators = [
      'cancelled',
      'canceled',
      'deleted',
      'removed',
      'void',
      '[cancelled]',
      '[deleted]',
      '(cancelled)',
      '(deleted)',
      'status:cancelled',
      'status:deleted'
    ];
    
    if (cancelledIndicators.some(indicator => lowerBooking.includes(indicator))) {
      return null;
    }
    
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
  },
  
  // Get tier info based on job count
  getTierInfo(jobCount) {
    const count = parseInt(jobCount) || 0;
    
    if (count >= 50) {
      return {
        tier: 4,
        name: 'Partner',
        stars: '★★★★'
      };
    } else if (count >= 15) {
      return {
        tier: 3,
        name: 'Trusted Elite',
        stars: '★★★'
      };
    } else if (count >= 3) {
      return {
        tier: 2,
        name: 'Reliable Pro',
        stars: '★★'
      };
    } else {
      return {
        tier: 1,
        name: 'Starter',
        stars: '★'
      };
    }
  },
  
  // Render star rating HTML - YELLOW STARS ONLY, NO TEXT
  renderStars(jobCount) {
    const tierInfo = this.getTierInfo(jobCount);
    return `<span class="tier-badge" style="color: #FFC107; font-size: 0.9rem; letter-spacing: 1px;" title="${tierInfo.name} - ${jobCount || 0} jobs completed">${tierInfo.stars}</span>`;
  }
};
