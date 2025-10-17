// DustBusters Calendar - Data Synchronization
class DataSync {
  constructor() {
    this.data = null;
    this.lastFetch = null;
    this.listeners = new Set();
    this.refreshTimer = null;
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      Utils.toast('Connection restored', 'success');
      this.fetch();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      Utils.toast('Using cached data', 'info');
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => {
      try { cb(data); }
      catch (e) { console.error('Listener error:', e); }
    });
  }

  async fetch() {
    const url = CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.CALENDAR_DATA;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.cleaners || !Array.isArray(data.cleaners)) {
        throw new Error('Invalid data format');
      }
      
      this.data = data;
      this.lastFetch = new Date();
      
      if (CONFIG.CACHE.ENABLED) {
        Utils.storage.set(CONFIG.CACHE.KEY, data, CONFIG.CACHE.EXPIRY);
      }
      
      this.notify(data);
      return { success: true, data };
      
    } catch (error) {
      console.error('Fetch error:', error);
      
      if (CONFIG.CACHE.ENABLED) {
        const cachedData = Utils.storage.get(CONFIG.CACHE.KEY);
        if (cachedData) {
          this.data = cachedData;
          this.notify(cachedData);
          return { success: true, data: cachedData, fromCache: true };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  startAutoRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    
    this.fetch();
    this.refreshTimer = setInterval(() => {
      if (this.isOnline) this.fetch();
    }, CONFIG.API.REFRESH_INTERVAL);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getData() {
    return this.data;
  }

  getCleaners(filters = {}) {
    if (!this.data || !this.data.cleaners) return [];
    
    let cleaners = [...this.data.cleaners];
    
    if (filters.regions && filters.regions.length > 0) {
      cleaners = cleaners.filter(c => filters.regions.includes(c.region));
    }
    
    if (filters.search) {
      const term = filters.search.toLowerCase();
      cleaners = cleaners.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      );
    }
    
    if (filters.status) {
      cleaners = cleaners.filter(c => c.status === filters.status);
    }
    
    if (filters.sortBy) {
      cleaners = Utils.array.sortBy(cleaners, filters.sortBy, filters.sortOrder || 'asc');
    }
    
    return cleaners;
  }

  getCleaner(cleanerId) {
    if (!this.data || !this.data.cleaners) return null;
    return this.data.cleaners.find(c => c.id === cleanerId);
  }

  getSchedule(cleanerId, weekStart) {
    const cleaner = this.getCleaner(cleanerId);
    if (!cleaner || !cleaner.schedule) return null;
    
    const weekString = Utils.date.formatDate(weekStart);
    return cleaner.schedule.find(s => s.weekStarting === weekString);
  }

  getWeekJobs(weekStart) {
    const weekString = Utils.date.formatDate(weekStart);
    const jobs = [];
    
    if (!this.data || !this.data.cleaners) return jobs;
    
    this.data.cleaners.forEach(cleaner => {
      const schedule = cleaner.schedule?.find(s => s.weekStarting === weekString);
      
      if (schedule) {
        Object.entries(schedule).forEach(([key, value]) => {
          if (key !== 'weekStarting' && typeof value === 'string' && value.startsWith('BOOKED')) {
            const booking = Utils.parseBooking(value);
            if (booking) {
              const [day, time] = key.split('_');
              jobs.push({
                ...booking,
                cleaner: cleaner.name,
                cleanerId: cleaner.id,
                day,
                time,
                weekStart: weekString
              });
            }
          }
        });
      }
    });
    
    return jobs;
  }

  getWeekStats(weekStart) {
    const weekString = Utils.date.formatDate(weekStart);
    let totalJobs = 0;
    let totalAvailable = 0;
    let totalUnavailable = 0;
    
    if (!this.data || !this.data.cleaners) {
      return { totalJobs, totalAvailable, totalUnavailable };
    }
    
    this.data.cleaners.forEach(cleaner => {
      const schedule = cleaner.schedule?.find(s => s.weekStarting === weekString);
      
      if (schedule) {
        Object.values(schedule).forEach(value => {
          if (typeof value === 'string') {
            if (value.startsWith('BOOKED')) totalJobs++;
            else if (value === 'AVAILABLE') totalAvailable++;
            else if (value === 'UNAVAILABLE') totalUnavailable++;
          }
        });
      }
    });
    
    return { totalJobs, totalAvailable, totalUnavailable };
  }

  async refresh() {
    return await this.fetch();
  }
}

const dataSync = new DataSync();
