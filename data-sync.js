// DustBusters Calendar - Data Synchronization
class DataSync {
  constructor() {
    this.data = null;
    this.lastFetch = null;
    this.listeners = new Set();
    this.dayStatsCache = new Map();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.dayStatsCache.clear();
    this.listeners.forEach(cb => {
      try { cb(data); }
      catch (e) { console.error('Listener error:', e); }
    });
  }

  async fetch() {
    const url = CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.CALENDAR_DATA;
    
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.cleaners || !Array.isArray(data.cleaners)) {
        throw new Error('Invalid data format');
      }
      
      // Initialize regions from data
      if (typeof window.initializeRegionsFromData === 'function') {
        window.initializeRegionsFromData(data.cleaners);
      }
      
      this.data = data;
      this.lastFetch = new Date();
      this.notify(data);
      return { success: true, data };
      
    } catch (error) {
      console.error('Fetch error:', error);
      return { success: false, error: error.message };
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
    
    return cleaners;
  }

  getCleaner(cleanerId) {
    if (!this.data || !this.data.cleaners) return null;
    return this.data.cleaners.find(c => c.id === cleanerId);
  }

  getWeekStats(weekStart, filteredCleaners) {
    const uniqueJobNumbers = new Set();
    let totalAvailable = 0;
    
    if (!filteredCleaners || filteredCleaners.length === 0) {
      return { totalJobs: 0, totalAvailable: 0 };
    }

    for (let i = 0; i < 7; i++) {
        const date = Utils.date.addDays(weekStart, i);
        const dayStats = this.getDayStats(date, filteredCleaners, true);
        dayStats.jobIds.forEach(id => uniqueJobNumbers.add(id));
        totalAvailable += dayStats.available;
    }
    
    return { totalJobs: uniqueJobNumbers.size, totalAvailable };
  }

  getDayStats(date, filteredCleaners, useCache = false) {
    const dateStr = Utils.date.formatDate(date);
    const cacheKey = `${dateStr}-${filteredCleaners.map(c => c.id).join(',')}`;
    if (useCache && this.dayStatsCache.has(cacheKey)) {
        return this.dayStatsCache.get(cacheKey);
    }

    const weekStart = Utils.date.getWeekStart(date);
    const weekStr = Utils.date.formatDate(weekStart);
    const dayShort = Utils.date.getDataDayKey(date);
    const jobIds = new Set();
    let availableSlots = 0;

    filteredCleaners.forEach(cleaner => {
        const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
        if (schedule) {
            CONFIG.TIME_SLOTS.ALL_HOURS.forEach(hour => {
                const key = `${dayShort}_${hour}`;
                const val = schedule[key];
                if (val === 'AVAILABLE') availableSlots++;
                else if (val && val.startsWith('BOOKED')){
                     const job = Utils.parseBooking(val);
                     if(job && job.jobNumber) {
                        jobIds.add(job.jobNumber);
                     }
                }
            });
        }
    });

    const stats = { booked: jobIds.size, available: availableSlots, jobIds };
    if (useCache) {
        this.dayStatsCache.set(cacheKey, stats);
    }
    return stats;
  }

  getMonthStats(monthDate, filteredCleaners) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const uniqueJobNumbers = new Set();
    let totalAvailable = 0;

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const dayStats = this.getDayStats(new Date(d), filteredCleaners, true);
        dayStats.jobIds.forEach(id => uniqueJobNumbers.add(id));
        totalAvailable += dayStats.available;
    }

    return { totalJobs: uniqueJobNumbers.size, totalAvailable };
  }

  getDayStatsDetailed(date, filteredCleaners) {
    const dateStr = Utils.date.formatDate(date);
    const weekStart = Utils.date.getWeekStart(date);
    const weekStr = Utils.date.formatDate(weekStart);
    const dayShort = Utils.date.getDataDayKey(date);
    
    const cleanersWithAvailability = [];
    const jobs = [];

    filteredCleaners.forEach(cleaner => {
        const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
        if (schedule) {
            let cleanerAvailableSlots = [];
            let cleanerJobs = [];
            
            CONFIG.TIME_SLOTS.ALL_HOURS.forEach(hour => {
                const key = `${dayShort}_${hour}`;
                const val = schedule[key];
                if (val === 'AVAILABLE') {
                    cleanerAvailableSlots.push(hour);
                } else if (val && val.startsWith('BOOKED')){
                    const job = Utils.parseBooking(val);
                    if(job && job.jobNumber) {
                        const existingJob = cleanerJobs.find(j => j.jobNumber === job.jobNumber);
                        if (!existingJob) {
                            cleanerJobs.push({
                                ...job,
                                cleaner: cleaner.name,
                                cleanerId: cleaner.id,
                                region: cleaner.region,
                                hours: [hour]
                            });
                        } else {
                            existingJob.hours.push(hour);
                        }
                    }
                }
            });

            if (cleanerAvailableSlots.length >= 3) {
                const hasConsecutive = this.hasConsecutiveSlots(cleanerAvailableSlots, 3);
                if (hasConsecutive) {
                    cleanersWithAvailability.push({
                        cleaner: cleaner.name,
                        cleanerId: cleaner.id,
                        region: cleaner.region,
                        slots: cleanerAvailableSlots
                    });
                }
            }

            jobs.push(...cleanerJobs);
        }
    });

    return {
        cleanersAvailable: cleanersWithAvailability.length,
        availableCleaners: cleanersWithAvailability,
        jobs: jobs,
        jobCount: new Set(jobs.map(j => j.jobNumber)).size
    };
  }

  hasConsecutiveSlots(slots, minConsecutive) {
    if (slots.length < minConsecutive) return false;
    
    const slotIndices = slots.map(slot => CONFIG.TIME_SLOTS.ALL_HOURS.indexOf(slot)).sort((a, b) => a - b);
    
    let consecutiveCount = 1;
    for (let i = 1; i < slotIndices.length; i++) {
        if (slotIndices[i] === slotIndices[i-1] + 1) {
            consecutiveCount++;
            if (consecutiveCount >= minConsecutive) return true;
        } else {
            consecutiveCount = 1;
        }
    }
    return false;
  }
}

const dataSync = new DataSync();
