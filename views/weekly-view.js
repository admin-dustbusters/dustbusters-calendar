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
      html += `<th colspan="3" class="day-divider ${todayClass}">${day} - ${dateString}</th>`;
    });

    html += `</tr><tr class="sub-header-row">`;

    CONFIG.DAYS.DISPLAY_FULL_MON_START.forEach((day, index) => {
        const currentDate = Utils.date.addDays(weekStart, index);
        const isToday = currentDate.getTime() === today.getTime();
        const todayClass = isToday ? 'today-header-sub' : '';
        html += `<th class="${todayClass} period-divider">Morning</th><th class="${todayClass} period-divider">Afternoon</th><th class="day-divider ${todayClass}">Evening</th>`;
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
        
        const morning = this.getPeriodStatus(cleaner, schedule, day, 'Morning');
        const afternoon = this.getPeriodStatus(cleaner, schedule, day, 'Afternoon');
        const evening = this.getPeriodStatus(cleaner, schedule, day, 'Evening');

        const isMorningBooked = morning.status === 'booked' && morning.job.jobNumber;
        const isAfternoonBooked = afternoon.status === 'booked' && afternoon.job.jobNumber;
        const isEveningBooked = evening.status === 'booked' && evening.job.jobNumber;

        const extraClasses = (period, ...additional) => {
            const classes = [...additional];
            if (isToday) classes.push('today-cell');
            if (period === 'Morning' || period === 'Afternoon') classes.push('period-divider');
            if (period === 'Evening') classes.push('day-divider');
            return classes.join(' ');
        };

        if (isMorningBooked && isAfternoonBooked && isEveningBooked && morning.job.jobNumber === afternoon.job.jobNumber && afternoon.job.jobNumber === evening.job.jobNumber) {
            html += this.renderCell(morning, 3, extraClasses('Evening'), '8am - 9pm');
        } else if (isMorningBooked && isAfternoonBooked && morning.job.jobNumber === afternoon.job.jobNumber) {
            html += this.renderCell(morning, 2, extraClasses('Afternoon', 'period-divider'), '8am - 5pm');
            html += this.renderCell(evening, 1, extraClasses('Evening'));
        } else if (isAfternoonBooked && isEveningBooked && afternoon.job.jobNumber === evening.job.jobNumber) {
            html += this.renderCell(morning, 1, extraClasses('Morning'));
            html += this.renderCell(afternoon, 2, extraClasses('Evening', 'day-divider'), '12pm - 9pm');
        } else {
            html += this.renderCell(morning, 1, extraClasses('Morning'));
            html += this.renderCell(afternoon, 1, extraClasses('Afternoon'));
            html += this.renderCell(evening, 1, extraClasses('Evening'));
        }
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    document.querySelectorAll(".slot.booked").forEach((slot) => {
      slot.addEventListener("click", () => this.showJobDetails(slot.dataset));
    });
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
    if (isMorningMatch && isAfternoonMatch && isEveningMatch) timeRange = '8am - 9pm';
    else if (isMorningMatch && isAfternoonMatch) timeRange = '8am - 5pm';
    else if (isAfternoonMatch && isEveningMatch) timeRange = '12pm - 9pm';
    else if (isMorningMatch) timeRange = '8am - 12pm';
    else if (isAfternoonMatch) timeRange = '12pm - 5pm';
    else if (isEveningMatch) timeRange = '5pm - 9pm';


    let html = `
      <h2>Job Details</h2>
      <div style="margin:1rem 0;padding:1rem;background:#f7fafc;border-radius:6px;">
        <p><strong>Cleaner:</strong> ${cleaner.name}</p>
        <p><strong>Day:</strong> ${day}</p>
        <p><strong>Time:</strong> ${timeRange}</p>
      </div>
      <h3>Booking Details:</h3>
      <div style="margin:0.5rem 0;padding:1rem;background:white;border:1px solid #e2e8f0;border-radius:6px;">
          <p><strong>${jobDetails.jobNumber}</strong></p>
          <p>Customer: ${jobDetails.customer}</p>
          ${jobDetails.address ? `<p>Address: ${jobDetails.address}</p>` : ""}
        </div>
    `;
    
    document.getElementById("jobDetails").innerHTML = html;
    document.getElementById("jobModal").classList.add("active");
  }
};

window.WeeklyView = WeeklyView;
