// DustBusters Calendar Engine - Core Logic (FIXED)
class CalendarEngine {
  constructor() {
    this.currentDate = new Date();
    this.currentView = CONFIG.UI.DEFAULT_VIEW;
    this.currentWeekStart = Utils.date.getWeekStart(this.currentDate);
    this.currentMonthStart = Utils.date.getMonthStart(this.currentDate);
    this.filters = {
      regions: new Set(Object.keys(CONFIG.REGIONS)),
      search: '',
      status: null
    };
    this.selectedCleaner = null;
    this.state = {
      loading: false,
      error: null,
      lastUpdate: null
    };
  }

  // Initialize the calendar
  async initialize() {
    console.log('🚀 Initializing Calendar Engine...');
    
    // Subscribe to data changes
    dataSync.subscribe((data) => {
      this.handleDataUpdate(data);
    });

    // Load initial data
    await this.refreshData();

    // Setup event listeners
    this.setupEventListeners();

    console.log('✅ Calendar Engine initialized');
  }

  // Setup all event listeners
  setupEventListeners() {
    // Navigation events
    document.getElementById('prevWeek')?.addEventListener('click', () => this.navigatePrevious());
    document.getElementById('nextWeek')?.addEventListener('click', () => this.navigateNext());
    document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());

    // View switching
    document.getElementById('viewSelect')?.addEventListener('change', (e) => {
      this.switchView(e.target.value);
    });

    // Search with debouncing
    document.getElementById('searchInput')?.addEventListener('input', 
      Utils.debounce((e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.render();
      }, CONFIG.UI.SEARCH_DEBOUNCE)
    );

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && e.ctrlKey) this.navigatePrevious();
      if (e.key === 'ArrowRight' && e.ctrlKey) this.navigateNext();
      if (e.key === 't' && e.ctrlKey) this.goToToday();
    });
  }

  // Handle data updates
  handleDataUpdate(data) {
    this.state.lastUpdate = new Date();
    this.state.error = null;
    this.render();
  }

  // Refresh data from source
  async refreshData() {
    this.setState({ loading: true, error: null });
    
    try {
      const result = await dataSync.fetch();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.setState({ loading: false });
      
      if (result.fromCache) {
        Utils.toast('Using cached data', 'info', 2000);
      }

    } catch (error) {
      this.setState({ loading: false, error: error.message });
      Utils.toast('Failed to load data', 'error');
    }
  }

  // Set state and trigger updates
  setState(updates) {
    Object.assign(this.state, updates);
    this.updateUI();
  }

  // Update UI based on state
  updateUI() {
    // Update loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !this.state.loading);
    }

    // Update status indicator
    this.updateStatusIndicator();
  }

  // Update status indicator
  updateStatusIndicator() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    if (statusDot && statusText) {
      if (this.state.error) {
        statusDot.style.background = CONFIG.STATUS.BOOKED.color;
        statusText.textContent = `Error: ${this.state.error}`;
      } else if (this.state.lastUpdate) {
        statusDot.style.background = CONFIG.STATUS.AVAILABLE.color;
        const time = this.state.lastUpdate.toLocaleTimeString();
        statusText.textContent = `Updated: ${time}`;
      }
    }
  }

  // Navigation methods
  navigatePrevious() {
    switch (this.currentView) {
      case CONFIG.VIEWS.WEEKLY:
      case CONFIG.VIEWS.DAILY:
      case CONFIG.VIEWS.HOURLY:
        this.currentWeekStart = Utils.date.addDays(this.currentWeekStart, -7);
        break;
      case CONFIG.VIEWS.MONTHLY:
        const newMonth = new Date(this.currentMonthStart);
        newMonth.setMonth(newMonth.getMonth() - 1);
        this.currentMonthStart = Utils.date.getMonthStart(newMonth);
        break;
    }
    this.render();
  }

  navigateNext() {
    switch (this.currentView) {
      case CONFIG.VIEWS.WEEKLY:
      case CONFIG.VIEWS.DAILY:
      case CONFIG.VIEWS.HOURLY:
        this.currentWeekStart = Utils.date.addDays(this.currentWeekStart, 7);
        break;
      case CONFIG.VIEWS.MONTHLY:
        const newMonth = new Date(this.currentMonthStart);
        newMonth.setMonth(newMonth.getMonth() + 1);
        this.currentMonthStart = Utils.date.getMonthStart(newMonth);
        break;
    }
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.currentWeekStart = Utils.date.getWeekStart(this.currentDate);
    this.currentMonthStart = Utils.date.getMonthStart(this.currentDate);
    this.render();
  }

  // View switching
  switchView(viewName) {
    this.currentView = viewName;
    
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
      view.style.display = 'none';
    });

    // Show selected view
    const viewContainer = document.getElementById(`${viewName}View`);
    if (viewContainer) {
      viewContainer.style.display = 'block';
    }

    this.render();
  }

  // Filter management
  toggleRegionFilter(region) {
    if (this.filters.regions.has(region)) {
      this.filters.regions.delete(region);
    } else {
      this.filters.regions.add(region);
    }
    this.render();
  }

  setSearchFilter(searchTerm) {
    this.filters.search = searchTerm.toLowerCase();
    this.render();
  }

  clearFilters() {
    this.filters = {
      regions: new Set(Object.keys(CONFIG.REGIONS)),
      search: '',
      status: null
    };
    this.render();
  }

  // Get filtered cleaners
  getFilteredCleaners() {
    return dataSync.getCleaners({
      regions: Array.from(this.filters.regions),
      search: this.filters.search,
      status: this.filters.status
    });
  }

  // Get jobs for a specific day
  getDayJobs(date) {
    const weekStart = Utils.date.getWeekStart(date);
    const allJobs = dataSync.getWeekJobs(weekStart);
    const dayName = Utils.date.getDayOfWeek(date);
    
    return allJobs.filter(job => job.day === dayName);
  }

  // Main render method - FIXED TO PASS DATA CORRECTLY
  render() {
    console.log(`🎨 Rendering ${this.currentView} view...`);

    // Update date display
    this.updateDateDisplay();

    // Render filters
    this.renderFilters();

    // Render current view with proper data
    switch (this.currentView) {
      case CONFIG.VIEWS.HOURLY:
        if (window.HourlyView) {
          const hourlyData = {
            cleaners: this.getFilteredCleaners(),
            date: this.currentDate
          };
          HourlyView.render(hourlyData);
        }
        break;

      case CONFIG.VIEWS.DAILY:
        if (window.DailyView) {
          const dailyData = {
            cleaners: this.getFilteredCleaners(),
            date: this.currentDate,
            jobs: this.getDayJobs(this.currentDate)
          };
          DailyView.render(dailyData);
        }
        break;

      case CONFIG.VIEWS.WEEKLY:
        if (window.WeeklyView) {
          const weeklyData = {
            cleaners: this.getFilteredCleaners(),
            weekStart: this.currentWeekStart,
            weekEnd: Utils.date.getWeekEnd(this.currentWeekStart),
            jobs: dataSync.getWeekJobs(this.currentWeekStart)
          };
          WeeklyView.render(weeklyData);
        }
        break;

      case CONFIG.VIEWS.MONTHLY:
        if (window.MonthlyView) {
          const monthlyData = {
            cleaners: this.getFilteredCleaners(),
            monthStart: this.currentMonthStart,
            monthEnd: Utils.date.getMonthEnd(this.currentMonthStart)
          };
          MonthlyView.render(monthlyData);
        }
        break;

      case CONFIG.VIEWS.CLEANER:
        if (window.CleanerCard) {
          this.renderCleanerView();
        }
        break;
    }

    // Update stats
    this.updateStats();
  }

  // Update date display in header
  updateDateDisplay() {
    const display = document.getElementById('weekDisplay');
    if (!display) return;

    switch (this.currentView) {
      case CONFIG.VIEWS.WEEKLY:
      case CONFIG.VIEWS.DAILY:
      case CONFIG.VIEWS.HOURLY:
        display.textContent = Utils.date.formatWeekRange(this.currentWeekStart);
        break;

      case CONFIG.VIEWS.MONTHLY:
        const monthYear = this.currentMonthStart.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
        display.textContent = monthYear;
        break;

      case CONFIG.VIEWS.CLEANER:
        display.textContent = Utils.date.formatWeekRange(this.currentWeekStart);
        break;
    }
  }

  // Render filters
  renderFilters() {
    if (window.Filters) {
      Filters.render({
        regions: CONFIG.REGIONS,
        activeRegions: this.filters.regions,
        searchTerm: this.filters.search,
        onRegionToggle: (region) => this.toggleRegionFilter(region),
        onSearchChange: (term) => this.setSearchFilter(term)
      });
    }
  }

  // Render cleaner view
  renderCleanerView() {
    const container = document.getElementById('cleanerCards');
    if (!container) return;

    const cleaners = this.getFilteredCleaners();
    
    if (cleaners.length === 0) {
      container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #718096;">No cleaners match your filters</p>';
      return;
    }
    
    if (window.CleanerCard) {
      container.innerHTML = '';
      cleaners.forEach(cleaner => {
        const schedule = dataSync.getSchedule(cleaner.id, this.currentWeekStart);
        const card = CleanerCard.create(cleaner, schedule, this.currentWeekStart);
        container.appendChild(card);
      });
    }
  }

  // Update statistics
  updateStats() {
    const stats = dataSync.getWeekStats(this.currentWeekStart);
    const cleaners = this.getFilteredCleaners();

    const elements = {
      cleaners: document.getElementById('statCleaners'),
      jobs: document.getElementById('statJobs'),
      available: document.getElementById('statAvailable')
    };

    if (elements.cleaners) elements.cleaners.textContent = cleaners.length;
    if (elements.jobs) elements.jobs.textContent = stats.totalJobs;
    if (elements.available) elements.available.textContent = stats.totalAvailable;
  }

  // Export current view (future feature)
  async exportView(format = 'pdf') {
    Utils.toast('Export feature coming soon!', 'info');
  }

  // Print current view
  printView() {
    window.print();
  }
}

// Create global instance
const calendarEngine = new CalendarEngine();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = calendarEngine;
}
