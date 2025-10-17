// Daily View - Single Day Detailed View
const DailyView = {
  render(data) {
    const container = document.getElementById('calendarGridDaily');
    if (!container) return;

    const { cleaners, date } = data;
    const dayName = Utils.date.getDayOfWeek(date || new Date());
    const currentDate = date || new Date();

    if (cleaners.length === 0) {
      container.innerHTML = '<p style="padding: 2rem; text-align: center;">No cleaners match your filters</p>';
      return;
    }

    const stats = this.calculateDayStats(cleaners, currentDate);

    let html = `
      <div style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem;">${currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}</h2>
          
          <div style="display: flex; gap: 1.5rem;">
            <div style="text-align: center;">
              <div style="font-size: 0.875rem; color: #718096;">Available</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #48bb78;">${stats.totalAvailable}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 0.875rem; color: #718096;">Booked</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #f56565;">${stats.totalBooked}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 0.875rem; color: #718096;">Cleaners</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #4299e1;">${cleaners.length}</div>
            </div>
          </div>
        </div>

        <table class="calendar-table">
          <thead>
            <tr>
              <th style="min-width: 150px;">Cleaner</th>
              <th style="text-align: center;">Morning<br><span style="font-weight: 400; font-size: 0.75rem;">(8am-12pm)</span></th>
              <th style="text-align: center;">Afternoon<br><span style="font-weight: 400; font-size: 0.75rem;">(12pm-5pm)</span></th>
              <th style="text-align: center;">Evening<br><span style="font-weight: 400; font-size: 0.75rem;">(5pm-8pm)</span></th>
              <th style="text-align: center;">Summary</th>
            </tr>
          </thead>
          <tbody>
    `;

    const weekStart = Utils.date.getWeekStart(currentDate);
    const weekStr = Utils.date.formatDate(weekStart);

    cleaners.forEach(cleaner => {
      const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
      const cleanerStats = this.getCleanerDayStats(schedule, dayName);

      html += '<tr>';
      
      // Cleaner name with region
      html += `
        <td>
          <div class="cleaner-info">
            <div class="cleaner-name">${cleaner.name}</div>
            <div class="cleaner-region" style="background: ${CONFIG.REGIONS[cleaner.region]?.color}20; color: ${CONFIG.REGIONS[cleaner.region]?.color};">
              ${CONFIG.REGIONS[cleaner.region]?.label || cleaner.region}
            </div>
          </div>
        </td>
      `;

      // Periods
      ['Morning', 'Afternoon', 'Evening'].forEach(period => {
        html += this.renderPeriodCell(cleaner, schedule, dayName, period);
      });

      // Summary column
      html += `
        <td style="text-align: center; font-size: 0.875rem;">
          <div style="color: #48bb78; font-weight: 600;">${cleanerStats.available} free</div>
          <div style="color: #f56565; font-weight: 600;">${cleanerStats.booked} jobs</div>
          <div style="color: #718096;">
            ${cleanerStats.utilization}% used
          </div>
        </td>
      `;

      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

    // Attach click handlers
    document.querySelectorAll('.slot.booked').forEach(slot => {
      slot.addEventListener('click', () => {
        this.showJobDetails(slot.dataset);
      });
    });
  },

  renderPeriodCell(cleaner, schedule, day, period) {
    const slots = Utils.getTimeSlotsForPeriod(period);
    
    if (!schedule) {
      return '<td class="slot unavailable" style="min-height: 80px;">No schedule</td>';
    }

    let bookings = [];
    let availableSlots = [];
    
    slots.forEach(slot => {
      const key = `${day}_${slot}`;
      const val = schedule[key];
      
      if (val && val.startsWith('BOOKED')) {
        bookings.push({ slot, ...Utils.parseBooking(val) });
      } else if (val === 'AVAILABLE') {
        availableSlots.push(slot);
      }
    });

    if (bookings.length > 0) {
      let html = `<td class="slot booked" data-cleaner="${cleaner.id}" data-day="${day}" data-period="${period}" style="cursor: pointer; min-height: 80px;">`;
      bookings.forEach((b, idx) => {
        html += `
          <div class="job-info" style="${idx > 0 ? 'margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #fed7d7;' : ''}">
            <div class="job-number">${b.jobNumber}</div>
            <div class="job-customer">${b.customer}</div>
            <div style="font-size: 0.7rem; color: #718096;">${b.slot}</div>
          </div>
        `;
      });
      html += '</td>';
      return html;
    } else if (availableSlots.length > 0) {
      return `
        <td class="slot available" style="min-height: 80px;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">✓ Available</div>
          <div style="font-size: 0.75rem; color: #2f855a;">${availableSlots.length} slots open</div>
        </td>
      `;
    } else {
      return '<td class="slot unavailable" style="min-height: 80px;">—</td>';
    }
  },

  calculateDayStats(cleaners, date) {
    const weekStart = Utils.date.getWeekStart(date);
    const weekStr = Utils.date.formatDate(weekStart);
    const dayName = Utils.date.getDayOfWeek(date);

    let totalAvailable = 0;
    let totalBooked = 0;

    cleaners.forEach(cleaner => {
      const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
      if (schedule) {
        ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'].forEach(slot => {
          const key = `${dayName}_${slot}`;
          const val = schedule[key];
          
          if (val === 'AVAILABLE') totalAvailable++;
          else if (val && val.startsWith('BOOKED')) totalBooked++;
        });
      }
    });

    return { totalAvailable, totalBooked };
  },

  getCleanerDayStats(schedule, dayName) {
    let available = 0;
    let booked = 0;

    if (schedule) {
      ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'].forEach(slot => {
        const key = `${dayName}_${slot}`;
        const val = schedule[key];
        
        if (val === 'AVAILABLE') available++;
        else if (val && val.startsWith('BOOKED')) booked++;
      });
    }

    const total = available + booked;
    const utilization = total > 0 ? Math.round((booked / total) * 100) : 0;

    return { available, booked, utilization };
  },

  showJobDetails(dataset) {
    const cleaner = dataSync.getCleaner(dataset.cleaner);
    if (!cleaner) return;

    const weekStr = Utils.date.formatDate(calendarEngine.currentWeekStart);
    const schedule = cleaner.schedule?.find((s) => s.weekStarting === weekStr);
    if (!schedule) return;

    const slots = Utils.getTimeSlotsForPeriod(dataset.period);
    let bookings = [];

    slots.forEach((slot) => {
      const key = `${dataset.day}_${slot}`;
      const val = schedule[key];
      if (val && val.startsWith("BOOKED")) {
        const b = Utils.parseBooking(val);
        b.time = slot;
        bookings.push(b);
      }
    });

    let html = `
      <h2>Job Details</h2>
      <div style="margin:1rem 0;padding:1rem;background:#f7fafc;border-radius:6px;">
        <p><strong>Cleaner:</strong> ${cleaner.name}</p>
        <p><strong>Day:</strong> ${dataset.day}</p>
        <p><strong>Period:</strong> ${dataset.period}</p>
      </div>
      <h3>Bookings:</h3>
    `;

    bookings.forEach((b) => {
      html += `
        <div style="margin:0.5rem 0;padding:1rem;background:white;border:1px solid #e2e8f0;border-radius:6px;">
          <p><strong>${b.jobNumber}</strong></p>
          <p>Customer: ${b.customer}</p>
          ${b.address ? `<p>Address: ${b.address}</p>` : ""}
          <p style="color:#718096;font-size:0.875rem;">Time: ${b.time}</p>
        </div>
      `;
    });

    document.getElementById("jobDetails").innerHTML = html;
    document.getElementById("jobModal").classList.add("active");
  }
};

// CRITICAL: Expose to global scope
window.DailyView = DailyView;
