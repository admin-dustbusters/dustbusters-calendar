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

    getMonthStart(date = new Date()) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    },

    getMonthEnd(date = new Date()) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    },

    formatDate(date, format = 'YYYY-MM-DD') {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      if (format === 'MMM DD, YYYY') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return `${year}-${month}-${day}`;
    },

    formatWeekRange(startDate) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const opts = { month: 'short', day: 'numeric' };
      const start = startDate.toLocaleDateString('en-US', opts);
      const end = endDate.toLocaleDateString('en-US', opts);
      
      return `${start} - ${end}, ${startDate.getFullYear()}`;
    },

    getDayOfWeek(date) {
      const day = new Date(date).getDay();
      return CONFIG.DAYS.SHORT[day === 0 ? 6 : day - 1];
    },

    addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    },

    isSameDay(date1, date2) {
      return this.formatDate(date1) === this.formatDate(date2);
    },

    isToday(date) {
      return this.isSameDay(date, new Date());
    }
  },

  string: {
    capitalize(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    capitalizeWords(str) {
      if (!str) return '';
      return str.split(' ').map(word => this.capitalize(word)).join(' ');
    },

    truncate(str, length = 50) {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + '...';
    }
  },

  array: {
    unique(arr) {
      return [...new Set(arr)];
    },

    groupBy(arr, key) {
      return arr.reduce((groups, item) => {
        const group = item[key];
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
        return groups;
      }, {});
    },

    sortBy(arr, key, order = 'asc') {
      return [...arr].sort((a, b) => {
        if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }
  },

  storage: {
    set(key, value, expiry = null) {
      const data = { value, expiry: expiry ? Date.now() + expiry : null };
      localStorage.setItem(key, JSON.stringify(data));
    },

    get(key) {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      try {
        const data = JSON.parse(item);
        if (data.expiry && Date.now() > data.expiry) {
          this.remove(key);
          return null;
        }
        return data.value;
      } catch (e) {
        return null;
      }
    },

    remove(key) {
      localStorage.removeItem(key);
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
  },

  showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('hidden', !show);
  },

  toast(message, type = 'info', duration = 3000) {
    const colors = {
      info: '#4299E1',
      success: '#48BB78',
      error: '#F56565'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      background: ${colors[type]};
      color: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }
};
