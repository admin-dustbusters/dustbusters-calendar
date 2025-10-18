// Weekly View
const WeeklyView = {
  getPeriodStatus(cleaner, schedule, day, period) {
    const slots = Utils.getTimeSlotsForPeriod(period);
    if (!schedule) return { status: 'unavailable', period };

    let bookings = [];
    let hasAvailable = false;

    for (const slot of slots) {
        const key = `${day}_${slot}`;
        const val = schedule[key];
        if (val && val.startsWith("BOOKED")) {
            bookings.push(Utils.parseBooking(val));
        } else if (val === "AVAILABLE") {
            hasAvailable = true;
        }
    }
    
    if (bookings.length > 0) {
        const firstJobNumber = bookings[0].jobNumber;
        const allSameJob = bookings.every(b => b.jobNumber === firstJobNumber);
        if (allSameJob && firstJobNumber) {
             return { status: 'booked', job: bookings[0], cleanerId: cleaner.id, day, period };
        }
    }

    if (hasAvailable) {
        return { status: 'available', period };
    }
    return { status: 'unavailable', period };
  },

  renderCell(statusInfo, colspan, extraClasses, timeRange) {
    const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : '';
    switch(statusInfo.status) {
        case 'booked':
            const b = statusInfo.job;
            const timeDisplay = timeRange ? `<div class="job-time">${timeRange}</div>` : '';
            return `<td class="slot booked ${extraClasses}"${colspanAttr} data-cleaner="${statusInfo.cleanerId}" data-day="${statusInfo.day}" data-period="${statusInfo.period}">
                <div class="job-info">
                  <div class="job-number">${b.jobNumber}</div>
                  <div class="job-customer">${b.customer}</div>
                  ${b.address ? `<div class="job-address">${b.address}</div>` : ""}
                  ${timeDisplay}
                </div>
              </td>`;
        case 'available':
            return `<td class="slot available ${extraClasses}"${colspanAttr}>✓ Available</td>`;
        default:
            return `<td class="slot unavailable ${extraClasses}"${colspanAttr}>—</td>`;
    }
  },

  render(data) {
    const container = document.getElementById("calendarGrid");
    if (!container) return;

    const cleaners = Array.isArray(data?.cleaners) ? data.cleaners : [];
    const weekStart = data?.weekStart ?? new Date();

    if (cleaners.length === 0) {
      container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match your filters</p>`;
      return;
    }

    let html = '<table class="calendar-table"><thead><tr class="main-header-row">';
    html += '<th class="name-col" rowspan="2">Cleaner</th>';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    CONFIG.DAYS.DISPLAY_FULL_MON_START.forEach((day, index) => {
      const currentDate = Utils.date.addDays(weekStart, index);
      const isToday = currentDate.getTime() === today.getTime();
      const todayClass = isToday ? 'today-header-main' : '';
      const dateString = Utils.date.formatDayMonth(currentDate);
      const dateStr = Utils.date.formatDate(currentDate);
      html += `<th colspan="3" class="day-divider ${todayClass} day-column-header" data-date="${dateStr}" onclick="WeeklyView.onColumnClick('${dateStr}')">${day} - ${dateString}</th>`;
    });

    html += `</tr><tr class="sub-header-row">`;

    CONFIG.DAYS.DISPLAY_FULL_MON_START.forEach((day, index) => {
        const currentDate = Utils.date.addDays(weekStart, index);
        const isToday = currentDate.getTime() === today.getTime();
        const todayClass = isToday ? 'today-header-sub' : '';
        const dateStr = Utils.date.formatDate(currentDate);
        html += `<th class="${todayClass} period-divider day-column-header" data-date="${dateStr}" onclick="WeeklyView.onColumnClick('${dateStr}')">Morning</th><th class="${todayClass} period-divider day-column-header" data-date="${dateStr}" onclick="WeeklyView.onColumnClick('${dateStr}')">Afternoon</th><th class="day-divider ${todayClass} day-column-header" data-date="${dateStr}" onclick="WeeklyView.onColumnClick('${dateStr}')">Evening</th>`;
    });

    html += "</tr></thead><tbody>";

    const weekStr = Utils.date.formatDate(weekStart);

    cleaners.forEach((cleaner) => {
      html += "<tr>";
      html += `<td class="name-col">
        <div class="cleaner-info">
          <span class="cleaner-name">${cleaner.name}</span>
          <span class="cleaner-region" style="background:${
            CONFIG.REGIONS[cleaner.region]?.color || "#ccc"
          }20;color:${CONFIG.REGIONS[cleaner.region]?.color || "#333"}; border-color:${CONFIG.REGIONS[cleaner.region]?.color || "#ccc"};">
            ${CONFIG.REGIONS[cleaner.region]?.emoji || ''} ${CONFIG.REGIONS[cleaner.region]?.label || cleaner.region}
          </span>
        </div>
      </td>`;

      const schedule = cleaner.schedule?.find((s) => s.weekStarting === weekStr);
      
      CONFIG.DAYS.DATA_KEYS.forEach((day, dayIndex) => {
        const currentDate = Utils.date.addDays(weekStart, dayIndex);
        const isToday = currentDate.getTime() === today.getTime();
        const dateStr = Utils.date.formatDate(currentDate);
        
        const morning = this.getPeriodStatus(cleaner, schedule, day, 'Morning');
        const afternoon = this.getPeriodStatus(cleaner, schedule, day, 'Afternoon');
        const evening = this.getPeriodStatus(cleaner, schedule, day, 'Evening');

        const isMorningBooked = morning.status === 'booked' && morning.job.jobNumber;
        const isAfternoonBooked = afternoon.status === 'booked' && afternoon.job.jobNumber;
        const isEveningBooked = evening.status === 'booked' && evening.job.jobNumber;

        const extraClasses = (period, ...additional) => {
            const classes = [...additional, 'day-column-cell'];
            if (isToday) classes.push('today-cell');
            if (period === 'Morning' || period === 'Afternoon') classes.push('period-divider');
            if (period === 'Evening') classes.push('day-divider');
            return classes.join(' ');
        };

        if (isMorningBooked && isAfternoonBooked && isEveningBooked && morning.job.jobNumber === afternoon.job.jobNumber && afternoon.job.jobNumber === evening.job.jobNumber) {
            html += this.renderCell(morning, 3, extraClasses('Evening') + `" data-date="${dateStr}`, '8am - 9pm');
        } else if (isMorningBooked && isAfternoonBooked && morning.job.jobNumber === afternoon.job.jobNumber) {
            html += this.renderCell(morning, 2, extraClasses('Afternoon', 'period-divider') + `" data-date="${dateStr}`, '8am - 5pm');
            html += this.renderCell(evening, 1, extraClasses('Evening') + `" data-date="${dateStr}`);
        } else if (isAfternoonBooked && isEveningBooked && afternoon.job.jobNumber === evening.job.jobNumber) {
            html += this.renderCell(morning, 1, extraClasses('Morning') + `" data-date="${dateStr}`);
            html += this.renderCell(afternoon, 2, extraClasses('Evening', 'day-divider') + `" data-date="${dateStr}`, '12pm - 9pm');
        } else {
            html += this.renderCell(morning, 1, extraClasses('Morning') + `" data-date="${dateStr}`);
            html += this.renderCell(afternoon, 1, extraClasses('Afternoon') + `" data-date="${dateStr}`);
            html += this.renderCell(evening, 1, extraClasses('Evening') + `" data-date="${dateStr}`);
        }
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    // Add column hover effects
    this.setupColumnHoverEffects();

    document.querySelectorAll(".slot.booked").forEach((slot) => {
      slot.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showJobDetails(slot.dataset);
      });
    });

    document.querySelectorAll(".day-column-cell").forEach((cell) => {
      if (!cell.classList.contains('booked')) {
        cell.addEventListener("click", (e) => {
          if (cell.dataset.date) {
            this.onColumnClick(cell.dataset.date);
          }
        });
      }
    });
  },

  setupColumnHoverEffects() {
    const table = document.querySelector('.calendar-table');
    if (!table) return;

    document.querySelectorAll('.day-column-header, .day-column-cell').forEach(el => {
      el.addEventListener('mouseenter', function() {
        const date = this.dataset.date;
        if (date) {
          document.querySelectorAll(`[data-date="${date}"]`).forEach(cell => {
            cell.style.backgroundColor = 'rgba(66, 153, 225, 0.08)';
            cell.style.transform = 'scale(1.01)';
          });
        }
      });

      el.addEventListener('mouseleave', function() {
        const date = this.dataset.date;
        if (date) {
          document.querySelectorAll(`[data-date="${date}"]`).forEach(cell => {
            cell.style.backgroundColor = '';
            cell.style.transform = '';
          });
        }
      });
    });
  },

  onColumnClick(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    calendarEngine.currentDay = date;
    calendarEngine.currentWeekStart = Utils.date.getWeekStart(date);
    calendarEngine.setView('hourly');
  },

  showJobDetails(dataset) {
    const cleaner = dataSync.getCleaner(dataset.cleaner);
    if (!cleaner) return;

    const weekStr = Utils.date.formatDate(calendarEngine.currentWeekStart);
    const schedule = cleaner.schedule?.find((s) => s.weekStarting === weekStr);
    if (!schedule) return;

    const day = dataset.day;
    const morning = this.getPeriodStatus(cleaner, schedule, day, 'Morning');
    const afternoon = this.getPeriodStatus(cleaner, schedule, day, 'Afternoon');
    const evening = this.getPeriodStatus(cleaner, schedule, day, 'Evening');
    
    let targetJobNumber = '';
    let jobDetails;
    if (dataset.period === 'Morning' && morning.status === 'booked') { targetJobNumber = morning.job.jobNumber; jobDetails = morning.job; }
    if (dataset.period === 'Afternoon' && afternoon.status === 'booked') { targetJobNumber = afternoon.job.jobNumber; jobDetails = afternoon.job; }
    if (dataset.period === 'Evening' && evening.status === 'booked') { targetJobNumber = evening.job.jobNumber; jobDetails = evening.job; }

    if (!targetJobNumber) return;

    const isMorningMatch = morning.status === 'booked' && morning.job.jobNumber === targetJobNumber;
    const isAfternoonMatch = afternoon.status === 'booked' && afternoon.job.jobNumber === targetJobNumber;
    const isEveningMatch = evening.status === 'booked' && evening.job.jobNumber === targetJobNumber;

    let timeRange = '';
    let hours = 0;
    if (isMorningMatch && isAfternoonMatch && isEveningMatch) { timeRange = '8am - 9pm'; hours = 13; }
    else if (isMorningMatch && isAfternoonMatch) { timeRange = '8am - 5pm'; hours = 9; }
    else if (isAfternoonMatch && isEveningMatch) { timeRange = '12pm - 9pm'; hours = 9; }
    else if (isMorningMatch) { timeRange = '8am - 12pm'; hours = 4; }
    else if (isAfternoonMatch) { timeRange = '12pm - 5pm'; hours = 5; }
    else if (isEveningMatch) { timeRange = '5pm - 9pm'; hours = 4; }

    const hourlyRate = cleaner.rate || 25;
    const estimatedPay = hours * hourlyRate;

    // Find alternative cleaners in same region
    const regionCleaners = dataSync.getCleaners({ regions: [cleaner.region] });
    let suggestedCleaner = null;
    
    for (const altCleaner of regionCleaners) {
      if (altCleaner.id === cleaner.id) continue;
      const altSchedule = altCleaner.schedule?.find(s => s.weekStarting === weekStr);
      if (altSchedule) {
        const altMorning = this.getPeriodStatus(altCleaner, altSchedule, day, 'Morning');
        const altAfternoon = this.getPeriodStatus(altCleaner, altSchedule, day, 'Afternoon');
        const altEvening = this.getPeriodStatus(altCleaner, altSchedule, day, 'Evening');
        
        const hasAvailability = altMorning.status === 'available' || altAfternoon.status === 'available' || altEvening.status === 'available';
        if (hasAvailability && (altCleaner.rate || 25) < hourlyRate) {
          suggestedCleaner = altCleaner;
          break;
        }
      }
    }

    let html = `
      <h2>Job Details</h2>
      <div style="margin:1rem 0;padding:1rem;background:#fff5f5;border-left:3px solid #f56565;border-radius:6px;">
        <p style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">${jobDetails.jobNumber}</p>
        <p><strong>Customer:</strong> ${jobDetails.customer}</p>
        ${jobDetails.address ? `<p><strong>Address:</strong> ${jobDetails.address}</p>` : ""}
      </div>
      
      <div style="margin:1rem 0;padding:1rem;background:#f7fafc;border-radius:6px;">
        <h3 style="margin-bottom:0.75rem;">Cleaner Details</h3>
        <p><strong>Name:</strong> ${cleaner.name}</p>
        <p><strong>Region:</strong> ${CONFIG.REGIONS[cleaner.region]?.emoji || ''} ${CONFIG.REGIONS[cleaner.region]?.label || cleaner.region}</p>
        <p><strong>Day:</strong> ${day}</p>
        <p><strong>Time:</strong> ${timeRange} (${hours} hours)</p>
        <p><strong>Hourly Rate:</strong> $${hourlyRate}/hr</p>
        <p style="font-size:1.1rem;margin-top:0.5rem;"><strong>Estimated Pay:</strong> <span style="color:#2f855a;font-weight:700;">$${estimatedPay}</span></p>
      </div>
    `;

    if (suggestedCleaner) {
      const suggestedRate = suggestedCleaner.rate || 25;
      const suggestedPay = hours * suggestedRate;
      const savings = estimatedPay - suggestedPay;
      
      html += `
        <div style="margin:1rem 0;padding:1rem;background:#f0fff4;border-left:3px solid #48bb78;border-radius:6px;">
          <h3 style="margin-bottom:0.75rem;color:#2f855a;">💡 Better Option Available</h3>
          <p><strong>${suggestedCleaner.name}</strong> is available in ${CONFIG.REGIONS[cleaner.region]?.label}</p>
          <p><strong>Rate:</strong> $${suggestedRate}/hr (Save $${savings})</p>
          <p><strong>Estimated Pay:</strong> $${suggestedPay}</p>
        </div>
      `;
    }
    
    document.getElementById("jobDetails").innerHTML = html;
    document.getElementById("jobModal").classList.add("active");
  }
};

window.WeeklyView = WeeklyView;
