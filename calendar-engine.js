// DustBusters Calendar Engine
class CalendarEngine {
  constructor() {
    this.currentDay = new Date();
    this.currentView = CONFIG.UI.DEFAULT_VIEW;
    this.currentWeekStart = Utils.date.getWeekStart(this.currentDay);
    this.currentMonth = new Date(this.currentDay.getFullYear(), this.currentDay.getMonth(), 1);
    this.filters = {
      regions: new Set(Object.keys(CONFIG.REGIONS)),
      search: ''
    };
    this.state = {
      loading: true,
      error: null,
      lastUpdate: null
    };
    this.dpCurrentMonth = new Date();
  }

  async initialize() {
    console.log('🚀 Initializing Calendar Engine...');
    
    dataSync.subscribe((data) => {
      this.handleDataUpdate(data);
    });

    this.setupEventListeners();
    await this.refreshData();
    console.log('✅ Calendar Engine initialized');
  }

  setupEventListeners() {
    document.getElementById('navPrev')?.addEventListener('click', () => this.navigatePrevious());
    document.getElementById('navNext')?.addEventListener('click', () => this.navigateNext());
    document.getElementById('navToday')?.addEventListener('click', () => this.goToToday());
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.setView(e.target.dataset.view));
    });

    document.getElementById('searchInput')?.addEventListener('input', 
      Utils.debounce((e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.render();
      }, CONFIG.UI.SEARCH_DEBOUNCE)
    );
    
    document.getElementById('cleanersStatBox')?.addEventListener('click', () => this.openCleanersModal());
    document.getElementById('cleanersModalClose')?.addEventListener('click', () => this.closeCleanersModal());
    document.querySelector('#cleanersModal .modal-backdrop')?.addEventListener('click', () => this.closeCleanersModal());

    const jobsStatBox = document.querySelectorAll('.stat-box')[1];
    if (jobsStatBox) {
      jobsStatBox.addEventListener('click', () => this.openJobsModal());
    }

    const availableStatBox = document.querySelectorAll('.stat-box')[2];
    if (availableStatBox) {
      availableStatBox.addEventListener('click', () => this.openAvailableModal());
    }

    document.getElementById('mainDateDisplay').addEventListener('click', () => this.openDatePicker());
    document.querySelector('#datePickerModal .datepicker-backdrop').addEventListener('click', () => this.closeDatePicker());
    document.getElementById('dpPrevMonth').addEventListener('click', () => {
        this.dpCurrentMonth = Utils.date.addMonths(this.dpCurrentMonth, -1);
        this.renderDatePicker();
    });
    document.getElementById('dpNextMonth').addEventListener('click', () => {
        this.dpCurrentMonth = Utils.date.addMonths(this.dpCurrentMonth, 1);
        this.renderDatePicker();
    });
    document.getElementById('dpYear').addEventListener('change', (e) => {
        this.dpCurrentMonth.setFullYear(parseInt(e.target.value));
        this.renderDatePicker();
    });

    document.getElementById('regionSettingsBtn')?.addEventListener('click', () => this.openRegionSettings());
    document.getElementById('regionSettingsClose')?.addEventListener('click', () => this.closeRegionSettings());
    document.querySelector('#regionSettingsModal .modal-backdrop')?.addEventListener('click', () => this.closeRegionSettings());
  }

  handleDataUpdate(data) {
    this.state.lastUpdate = new Date();
    this.state.error = null;
    this.filters.regions = new Set(Object.keys(CONFIG.REGIONS));
    this.render();
  }

  async refreshData() {
    this.setState({ loading: true, error: null });
    
    try {
      const result = await dataSync.fetch();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.setState({ loading: false });

    } catch (error) {
      this.setState({ loading: false, error: error.message });
      console.error('Failed to load data:', error);
    }
  }

  setState(updates) {
    Object.assign(this.state, updates);
    this.updateUI();
  }

  updateUI() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !this.state.loading);
    }
    this.updateStatusIndicator();
  }

  updateStatusIndicator() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    if (statusDot && statusText) {
      if (this.state.error) {
        statusDot.style.background = CONFIG.STATUS.BOOKED.color;
        statusText.textContent = `Error: ${this.state.error}`;
      } else if (this.state.loading) {
        statusDot.style.background = '#ECC94B';
        statusText.textContent = 'Syncing...';
      } else if (this.state.lastUpdate) {
        statusDot.style.background = CONFIG.STATUS.AVAILABLE.color;
        const time = this.state.lastUpdate.toLocaleTimeString();
        statusText.textContent = `Updated: ${time}`;
      }
    }
  }

  navigatePrevious() {
    if (this.currentView === CONFIG.VIEWS.WEEKLY) {
        this.currentDay = Utils.date.addDays(this.currentDay, -7);
    } else if (this.currentView === CONFIG.VIEWS.DAILY || this.currentView === CONFIG.VIEWS.HOURLY) {
        this.currentDay = Utils.date.addDays(this.currentDay, -1);
    } else if (this.currentView === CONFIG.VIEWS.MONTHLY) {
        this.currentMonth = Utils.date.addMonths(this.currentMonth, -1);
        this.currentDay = new Date(this.currentMonth);
    }
    this.currentWeekStart = Utils.date.getWeekStart(this.currentDay);
    this.render();
  }

  navigateNext() {
    if (this.currentView === CONFIG.VIEWS.WEEKLY) {
        this.currentDay = Utils.date.addDays(this.currentDay, 7);
    } else if (this.currentView === CONFIG.VIEWS.HOURLY || this.currentView === CONFIG.VIEWS.DAILY) {
        this.currentDay = Utils.date.addDays(this.currentDay, 1);
    } else if (this.currentView === CONFIG.VIEWS.MONTHLY) {
        this.currentMonth = Utils.date.addMonths(this.currentMonth, 1);
        this.currentDay = new Date(this.currentMonth);
    }
    this.currentWeekStart = Utils.date.getWeekStart(this.currentDay);
    this.render();
  }

  goToToday() {
    this.currentDay = new Date();
    this.currentWeekStart = Utils.date.getWeekStart(this.currentDay);
    this.currentMonth = new Date(this.currentDay.getFullYear(), this.currentDay.getMonth(), 1);
    this.render();
  }

  setView(view) {
    this.currentView = view;
    document.getElementById('weeklyView').style.display = view === CONFIG.VIEWS.WEEKLY ? '' : 'none';
    document.getElementById('dailyView').style.display = view === CONFIG.VIEWS.DAILY ? '' : 'none';
    document.getElementById('hourlyView').style.display = view === CONFIG.VIEWS.HOURLY ? '' : 'none';
    document.getElementById('monthlyView').style.display = view === CONFIG.VIEWS.MONTHLY ? '' : 'none';
    
    if (view === 'cleaners') {
        this.openCleanersModal();
    } else {
         this.render();
    }
  }
  
  openCleanersModal() {
    document.getElementById('cleanersModal').classList.add('active');
    this.renderCleanersModal();
  }
  
  closeCleanersModal() {
      document.getElementById('cleanersModal').classList.remove('active');
  }
  
  renderCleanersModal(regionFilter = 'All') {
      const allCleaners = dataSync.getCleaners({regions: Object.keys(CONFIG.REGIONS)});
      let filteredCleaners = allCleaners;
      if (regionFilter !== 'All') {
          filteredCleaners = allCleaners.filter(c => c.region === regionFilter);
      }
      
      const container = document.getElementById("cleanersModalGrid");
      if(!container) return;
      
      if(filteredCleaners.length === 0) {
             container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match this filter</p>`;
            return;
        }

        let html = '';
        filteredCleaners.forEach(cleaner => {
            const rate = cleaner.rate ? cleaner.rate.replace('$', '') : '25';
            html += `<div class="cleaner-card">
                <h3>${cleaner.name}</h3>
                <p><strong>Email:</strong> ${cleaner.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${cleaner.phone || 'N/A'}</p>
                <p><strong>Region:</strong> ${cleaner.region}</p>
                <p><strong>Rate:</strong> $${rate}/hr</p>
            </div>`;
        });
        container.innerHTML = html;
        
        this.renderCleanerModalFilters(regionFilter);
  }
  
  renderCleanerModalFilters(activeFilter) {
    const container = document.getElementById('cleanerModalRegionFilters');
    if (!container) return;
    container.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.className = 'region-btn';
    allBtn.textContent = '🌍 All';
    allBtn.style.color = '#718096';
    if (activeFilter === 'All') {
        allBtn.classList.add('active');
        allBtn.style.borderColor = '#718096';
    }
    allBtn.addEventListener('click', () => this.renderCleanersModal('All'));
    container.appendChild(allBtn);

    Object.entries(CONFIG.REGIONS).forEach(([region, config]) => {
      const btn = document.createElement('button');
      btn.className = 'region-btn';
      btn.textContent = `${config.emoji || ''} ${config.label}`;
      btn.style.color = config.color;
      
      if (activeFilter === region) {
        btn.classList.add('active');
        btn.style.borderColor = config.color;
      }
      
      btn.addEventListener('click', () => this.renderCleanersModal(region));
      container.appendChild(btn);
    });
  }

  openRegionSettings() {
    document.getElementById('regionSettingsModal').classList.add('active');
    this.renderRegionSettings();
  }

  closeRegionSettings() {
    document.getElementById('regionSettingsModal').classList.remove('active');
  }

  renderRegionSettings() {
    const container = document.getElementById('regionSettingsList');
    if (!container) return;

    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

    Object.entries(CONFIG.REGIONS).forEach(([region, config]) => {
      if (region === 'Uncategorized' || region === 'Unassigned') return;

      html += `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">${config.emoji || ''} ${config.label}</div>
            <div style="font-size: 0.875rem; color: #718096;">Region: ${region}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.875rem; font-weight: 500;">Color:</label>
            <input type="color" 
                   value="${config.color}" 
                   onchange="calendarEngine.updateRegionColor('${region}', this.value)"
                   style="width: 50px; height: 40px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
            <div style="padding: 0.5rem 1rem; background: ${config.color}20; color: ${config.color}; border: 1px solid ${config.color}; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
              Preview
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  updateRegionColor(region, newColor) {
    if (CONFIG.REGIONS[region]) {
      CONFIG.REGIONS[region].color = newColor;
      this.saveRegionColors();
      this.renderRegionSettings();
      this.render();
    }
  }

  saveRegionColors() {
    const colors = {};
    Object.entries(CONFIG.REGIONS).forEach(([region, config]) => {
      colors[region] = config.color;
    });
    localStorage.setItem('dustbustersRegionColors', JSON.stringify(colors));
  }

  loadRegionColors() {
    const saved = localStorage.getItem('dustbustersRegionColors');
    if (saved) {
      try {
        const colors = JSON.parse(saved);
        Object.entries(colors).forEach(([region, color]) => {
          if (CONFIG.REGIONS[region]) {
            CONFIG.REGIONS[region].color = color;
          }
        });
      } catch (e) {
        console.error('Failed to load region colors:', e);
      }
    }
  }

  openJobsModal() {
    const modal = document.getElementById('jobModal');
    const sortedCleaners = this.getFilteredCleaners();
    let dateRange, allJobs = [];

    switch(this.currentView) {
        case CONFIG.VIEWS.WEEKLY:
            dateRange = Utils.date.formatWeekRange(this.currentWeekStart);
            for (let i = 0; i < 7; i++) {
                const date = Utils.date.addDays(this.currentWeekStart, i);
                const dayStats = dataSync.getDayStatsDetailed(date, sortedCleaners);
                allJobs.push(...dayStats.jobs);
            }
            break;
        case CONFIG.VIEWS.DAILY:
        case CONFIG.VIEWS.HOURLY:
            dateRange = Utils.date.formatFullDate(this.currentDay);
            const dayStats = dataSync.getDayStatsDetailed(this.currentDay, sortedCleaners);
            allJobs = dayStats.jobs;
            break;
        case CONFIG.VIEWS.MONTHLY:
            dateRange = Utils.date.formatMonthYear(this.currentMonth);
            const year = this.currentMonth.getFullYear();
            const month = this.currentMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                const mStats = dataSync.getDayStatsDetailed(new Date(d), sortedCleaners);
                allJobs.push(...mStats.jobs);
            }
            break;
    }

    const uniqueJobs = [];
    const seenJobNumbers = new Set();
    allJobs.forEach(job => {
        if (!seenJobNumbers.has(job.jobNumber)) {
            seenJobNumbers.add(job.jobNumber);
            uniqueJobs.push(job);
        }
    });

    this.renderJobsModal(uniqueJobs, dateRange);
    modal.classList.add('active');
  }

  renderJobsModal(jobs, dateRange, activeRegion = 'All') {
    const detailsContainer = document.getElementById('jobDetails');
    
    let filteredJobs = jobs;
    if (activeRegion !== 'All') {
        filteredJobs = jobs.filter(j => j.region === activeRegion);
    }

    let html = `
      <h2>Jobs - ${dateRange}</h2>
      <div style="margin: 1rem 0;">
        <div class="region-btns" style="margin-bottom: 1rem;">
    `;

    const allBtn = `<button class="region-btn ${activeRegion === 'All' ? 'active' : ''}" 
                     style="color: #718096; ${activeRegion === 'All' ? 'border-color: #718096;' : ''}"
                     onclick="calendarEngine.renderJobsModal(${JSON.stringify(jobs).replace(/"/g, '&quot;')}, '${dateRange}', 'All')">
                     🌍 All (${jobs.length})
                   </button>`;
    html += allBtn;

    Object.entries(CONFIG.REGIONS).forEach(([region, config]) => {
      const count = jobs.filter(j => j.region === region).length;
      if (count > 0) {
        const isActive = activeRegion === region;
        html += `<button class="region-btn ${isActive ? 'active' : ''}" 
                  style="color: ${config.color}; ${isActive ? `border-color: ${config.color};` : ''}"
                  onclick="calendarEngine.renderJobsModal(${JSON.stringify(jobs).replace(/"/g, '&quot;')}, '${dateRange}', '${region}')">
                  ${config.emoji || ''} ${config.label} (${count})
                </button>`;
      }
    });

    html += `</div>`;

    if (filteredJobs.length === 0) {
        html += `<p style="padding: 2rem; text-align: center; color: #718096;">No jobs found</p>`;
    } else {
        html += `<div style="max-height: 60vh; overflow-y: auto;">`;
        filteredJobs.forEach(job => {
            const regionConfig = CONFIG.REGIONS[job.region] || CONFIG.REGIONS['Uncategorized'];
            html += `
              <div style="padding: 1rem; margin-bottom: 0.75rem; background: #fff5f5; border-left: 3px solid #f56565; border-radius: 6px;">
                <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">${job.jobNumber}</div>
                <p><strong>Customer:</strong> ${job.customer}</p>
                <p><strong>Cleaner:</strong> ${job.cleaner}</p>
                <p><strong>Region:</strong> <span style="color: ${regionConfig.color};">${regionConfig.emoji || ''} ${regionConfig.label}</span></p>
                <p><strong>Hours:</strong> ${job.hours.join(', ')}</p>
              </div>
            `;
        });
        html += `</div>`;
    }

    html += `</div>`;
    detailsContainer.innerHTML = html;
  }

  openAvailableModal() {
    const modal = document.getElementById('jobModal');
    const sortedCleaners = this.getFilteredCleaners();
    let dateRange, allAvailable = [];

    switch(this.currentView) {
        case CONFIG.VIEWS.WEEKLY:
            dateRange = Utils.date.formatWeekRange(this.currentWeekStart);
            for (let i = 0; i < 7; i++) {
                const date = Utils.date.addDays(this.currentWeekStart, i);
                const dayStats = dataSync.getDayStatsDetailed(date, sortedCleaners);
                dayStats.availableCleaners.forEach(ac => {
                    ac.date = Utils.date.formatDate(date);
                });
                allAvailable.push(...dayStats.availableCleaners);
            }
            break;
        case CONFIG.VIEWS.DAILY:
        case CONFIG.VIEWS.HOURLY:
            dateRange = Utils.date.formatFullDate(this.currentDay);
            const dayStats = dataSync.getDayStatsDetailed(this.currentDay, sortedCleaners);
            dayStats.availableCleaners.forEach(ac => {
                ac.date = Utils.date.formatDate(this.currentDay);
            });
            allAvailable = dayStats.availableCleaners;
            break;
        case CONFIG.VIEWS.MONTHLY:
            dateRange = Utils.date.formatMonthYear(this.currentMonth);
            const year = this.currentMonth.getFullYear();
            const month = this.currentMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                const mStats = dataSync.getDayStatsDetailed(new Date(d), sortedCleaners);
                mStats.availableCleaners.forEach(ac => {
                    ac.date = Utils.date.formatDate(d);
                });
                allAvailable.push(...mStats.availableCleaners);
            }
            break;
    }

    this.renderAvailableModal(allAvailable, dateRange);
    modal.classList.add('active');
  }

  renderAvailableModal(availableCleaners, dateRange, activeRegion = 'All') {
    const detailsContainer = document.getElementById('jobDetails');
    
    let filtered = availableCleaners;
    if (activeRegion !== 'All') {
        filtered = availableCleaners.filter(ac => ac.region === activeRegion);
    }

    let html = `
      <h2>Available Cleaners - ${dateRange}</h2>
      <div style="margin: 1rem 0;">
        <div class="region-btns" style="margin-bottom: 1rem;">
    `;

    const allBtn = `<button class="region-btn ${activeRegion === 'All' ? 'active' : ''}" 
                     style="color: #718096; ${activeRegion === 'All' ? 'border-color: #718096;' : ''}"
                     onclick="calendarEngine.renderAvailableModal(${JSON.stringify(availableCleaners).replace(/"/g, '&quot;')}, '${dateRange}', 'All')">
                     🌍 All (${availableCleaners.length})
                   </button>`;
    html += allBtn;

    Object.entries(CONFIG.REGIONS).forEach(([region, config]) => {
      const count = availableCleaners.filter(ac => ac.region === region).length;
      if (count > 0) {
        const isActive = activeRegion === region;
        html += `<button class="region-btn ${isActive ? 'active' : ''}" 
                  style="color: ${config.color}; ${isActive ? `border-color: ${config.color};` : ''}"
                  onclick="calendarEngine.renderAvailableModal(${JSON.stringify(availableCleaners).replace(/"/g, '&quot;')}, '${dateRange}', '${region}')">
                  ${config.emoji || ''} ${config.label} (${count})
                </button>`;
      }
    });

    html += `</div>`;

    if (filtered.length === 0) {
        html += `<p style="padding: 2rem; text-align: center; color: #718096;">No available cleaners found</p>`;
    } else {
        html += `<div style="max-height: 60vh; overflow-y: auto;">`;
        filtered.forEach(ac => {
            const regionConfig = CONFIG.REGIONS[ac.region] || CONFIG.REGIONS['Uncategorized'];
            html += `
              <div style="padding: 1rem; margin-bottom: 0.75rem; background: #f0fff4; border-left: 3px solid #48bb78; border-radius: 6px;">
                <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">${ac.cleaner}</div>
                ${ac.date ? `<p><strong>Date:</strong> ${ac.date}</p>` : ''}
                <p><strong>Region:</strong> <span style="color: ${regionConfig.color};">${regionConfig.emoji || ''} ${regionConfig.label}</span></p>
                <p><strong>Available Slots:</strong> ${ac.slots.join(', ')}</p>
              </div>
            `;
        });
        html += `</div>`;
    }

    html += `</div>`;
    detailsContainer.innerHTML = html;
  }
  
  openDatePicker() {
      this.dpCurrentMonth = new Date(this.currentDay);
      this.renderDatePicker();
      document.getElementById('datePickerModal').classList.add('active');
  }
  
  closeDatePicker() {
      document.getElementById('datePickerModal').classList.remove('active');
  }
  
  renderDatePicker() {
      const container = document.querySelector('#datePickerModal .datepicker-days');
      const monthEl = document.getElementById('dpMonth');
      const yearEl = document.getElementById('dpYear');
      
      monthEl.textContent = this.dpCurrentMonth.toLocaleDateString('en-US', { month: 'long' });
      
      if (yearEl.options.length === 0) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 10; y <= currentYear + 10; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearEl.appendChild(option);
        }
      }
      yearEl.value = this.dpCurrentMonth.getFullYear();

      const year = this.dpCurrentMonth.getFullYear();
      const month = this.dpCurrentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      let html = '';
      CONFIG.DAYS.DISPLAY_SHORT_SUNDAY_START.forEach(day => {
          html += `<div class="datepicker-weekday">${day}</div>`;
      });
      
      let date = new Date(firstDay);
      let startingDay = firstDay.getDay();
      date.setDate(date.getDate() - startingDay);

      for (let i = 0; i < 6 * 7; i++) {
            const classes = ['datepicker-day'];
            if (date.getMonth() !== month) classes.push('other-month-day');
            if (date.getTime() === today.getTime()) classes.push('today');
            
            const currentDayTime = new Date(this.currentDay);
            currentDayTime.setHours(0,0,0,0);
            if (date.getTime() === currentDayTime.getTime()) classes.push('selected');
            
            html += `<div class="${classes.join(' ')}" data-date="${Utils.date.formatDate(date)}">${date.getDate()}</div>`;
            date.setDate(date.getDate() + 1);
      }
      container.innerHTML = html;
      
      container.querySelectorAll('.datepicker-day').forEach(dayEl => {
          dayEl.addEventListener('click', (e) => {
              const selectedDate = new Date(e.target.dataset.date + 'T00:00:00');
              this.currentDay = selectedDate;
              this.currentWeekStart = Utils.date.getWeekStart(selectedDate);
              this.currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
              this.render();
              this.closeDatePicker();
          });
      });
  }

  toggleRegionFilter(region) {
    if (region === 'All') {
        this.filters.regions = new Set(Object.keys(CONFIG.REGIONS));
    } else {
        this.filters.regions = new Set([region]);
    }
    this.render();
  }

  getFilteredCleaners() {
    return dataSync.getCleaners({
      regions: Array.from(this.filters.regions),
      search: this.filters.search
    });
  }

  render() {
    console.log(`🎨 Rendering ${this.currentView} view...`);

    this.updateDateDisplay();
    this.renderFilters();
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === this.currentView);
    });
    
    const sortedCleaners = this.getFilteredCleaners().sort((a, b) => {
        const regionCompare = a.region.localeCompare(b.region);
        if (regionCompare !== 0) return regionCompare;

        const weekStr = Utils.date.formatDate(Utils.date.getWeekStart(this.currentDay));
        const scheduleA = getScheduleSignatureForSort(a, weekStr);
        const scheduleB = getScheduleSignatureForSort(b, weekStr);

        if (scheduleA && !scheduleB) return -1;
        if (!scheduleA && scheduleB) return 1;

        const scheduleCompare = scheduleA.localeCompare(scheduleB);
        if (scheduleCompare !== 0) return scheduleCompare;

        return a.name.localeCompare(b.name);
    });
    
    const jobsStatLabel = document.getElementById('jobsStatLabel');
    const availableStatLabel = document.getElementById('availableStatLabel');
    let stats;

    switch(this.currentView) {
        case CONFIG.VIEWS.WEEKLY:
            WeeklyView.render({ cleaners: sortedCleaners, weekStart: this.currentWeekStart });
            stats = dataSync.getWeekStats(this.currentWeekStart, sortedCleaners);
            jobsStatLabel.textContent = "Jobs This Week";
            availableStatLabel.textContent = "Available Slots";
            break;
        case CONFIG.VIEWS.DAILY:
             DailyView.render({ cleaners: sortedCleaners, day: this.currentDay });
            stats = dataSync.getDayStats(this.currentDay, sortedCleaners);
            jobsStatLabel.textContent = "Jobs Today";
            availableStatLabel.textContent = "Available Slots Today";
            break;
        case CONFIG.VIEWS.HOURLY:
            HourlyView.render({ cleaners: sortedCleaners, day: this.currentDay });
            stats = dataSync.getDayStats(this.currentDay, sortedCleaners);
            jobsStatLabel.textContent = "Jobs Today";
            availableStatLabel.textContent = "Available Slots Today";
            break;
        case CONFIG.VIEWS.MONTHLY:
            MonthlyView.render({ cleaners: sortedCleaners, month: this.currentMonth });
            stats = dataSync.getMonthStats(this.currentMonth, sortedCleaners);
            jobsStatLabel.textContent = "Jobs This Month";
            availableStatLabel.textContent = "Available Slots This Month";
            break;
         case CONFIG.VIEWS.CLEANERS:
            stats = {totalJobs: '-', totalAvailable: '-'};
            break;
    }

    document.getElementById('statCleaners').textContent = sortedCleaners.length;
    document.getElementById('statJobs').textContent = stats.totalJobs;
    document.getElementById('statAvailable').textContent = stats.totalAvailable;
  }

  updateDateDisplay() {
    const display = document.getElementById('mainDateDisplay');
    switch(this.currentView){
        case CONFIG.VIEWS.WEEKLY:
            display.textContent = Utils.date.formatWeekRange(this.currentWeekStart);
            break;
        case CONFIG.VIEWS.DAILY:
        case CONFIG.VIEWS.HOURLY:
            display.textContent = Utils.date.formatFullDate(this.currentDay);
            break;
        case CONFIG.VIEWS.MONTHLY:
            display.textContent = Utils.date.formatMonthYear(this.currentMonth);
            break;
    }
  }

  renderFilters() {
    const container = document.getElementById('regionFilters');
    if (!container) return;

    container.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.className = 'region-btn';
    allBtn.textContent = '🌍 All';
    allBtn.style.color = '#718096';
    const allAreSelected = this.filters.regions.size === Object.keys(CONFIG.REGIONS).length;

    if (allAreSelected) {
        allBtn.classList.add('active');
        allBtn.style.borderColor = '#718096';
    }

    allBtn.addEventListener('click', () => this.toggleRegionFilter('All'));
    container.appendChild(allBtn);

    Object.entries(CONFIG.REGIONS).forEach(([region, config]) => {
      const btn = document.createElement('button');
      btn.className = 'region-btn';
      btn.textContent = `${config.emoji || ''} ${config.label}`;
      btn.style.color = config.color;
      
      if (this.filters.regions.has(region) && this.filters.regions.size === 1) {
        btn.classList.add('active');
        btn.style.borderColor = config.color;
      }
      
      btn.addEventListener('click', () => {
        this.toggleRegionFilter(region);
      });
      
      container.appendChild(btn);
    });
  }
}

const calendarEngine = new CalendarEngine();
