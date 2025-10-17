// Monthly View - Full Month Calendar Overview
const MonthlyView = {
  render(data) {
    const container = document.getElementById('calendarGridMonthly');
    if (!container) return;

    const { cleaners, monthStart, monthEnd } = data;

    if (cleaners.length === 0) {
      container.innerHTML = '<p style="padding: 2rem; text-align: center;">No cleaners match your filters</p>';
      return;
    }

    // Get all days in the month
    const daysInMonth = this.getDaysInMonth(monthStart);
    
    // Get month name
    const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let html = `
      <div style="padding: 1.5rem;">
        <h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">${monthName}</h2>
        <div class="month-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0;">
    `;

    // Day headers
    CONFIG.DAYS.SHORT.forEach(day => {
      html += `
        <div style="background: #f7fafc; padding: 0.75rem; text-align: center; font-weight: 600; font-size: 0.875rem;">
          ${day}
        </div>
      `;
    });

    // Add empty cells for days before month starts
    const firstDayOfWeek = monthStart.getDay();
    const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    for (let i = 0; i < startPadding; i++) {
      html += '<div style="background: white; min-height: 100px;"></div>';
    }

    // Add all days of the month
    daysInMonth.forEach(date => {
      const stats = this.getDayStats(date, cleaners);
      const isToday = Utils.date.isToday(date);
      
      html += `
        <div style="background: white; min-height: 100px; padding: 0.5rem; position: relative; ${isToday ? 'border: 2px solid #4299e1;' : ''}">
          <div style="font-weight: 600; margin-bottom: 0.5rem; ${isToday ? 'color: #4299e1;' : ''}">${date.getDate()}</div>
          <div style="font-size: 0.75rem; line-height: 1.4;">
            <div style="color: #48bb78;">✓ ${stats.available} available</div>
            <div style="color: #f56565;">● ${stats.booked} booked</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  getDaysInMonth(monthStart) {
    const days = [];
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  },

  getDayStats(date, cleaners) {
    const weekStart = Utils.date.getWeekStart(date);
    const weekStr = Utils.date.formatDate(weekStart);
    const dayName = Utils.date.getDayOfWeek(date);

    let available = 0;
    let booked = 0;

    cleaners.forEach(cleaner => {
      const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
      
      if (schedule) {
        // Check all time slots for this day
        ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'].forEach(slot => {
          const key = `${dayName}_${slot}`;
          const val = schedule[key];
          
          if (val === 'AVAILABLE') available++;
          else if (val && val.startsWith('BOOKED')) booked++;
        });
      }
    });

    return { available, booked };
  }
};

// CRITICAL: Expose to global scope
window.MonthlyView = MonthlyView;
