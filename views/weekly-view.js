// Weekly View - IMPROVED VERSION with Smart Time Calculation
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

  // NEW METHOD: Get actual time range for a job across all periods
  getActualTimeRange(cleaner, schedule, day, jobNumber) {
    if (!schedule || !jobNumber) return null;

    const allHours = CONFIG.TIME_SLOTS.ALL_HOURS;
    let firstSlot = null;
    let lastSlot = null;

    // Check all hourly slots to find the actual start and end times
    for (const hour of allHours) {
      const key = `${day}_${hour}`;
      const val = schedule[key];
      
      if (val && val.startsWith("BOOKED")) {
        const booking = Utils.parseBooking(val);
        if (booking && booking.jobNumber === jobNumber) {
          if (firstSlot === null) {
            firstSlot = hour;
          }
          lastSlot = hour;
        }
      }
    }

    if (firstSlot && lastSlot) {
      // Calculate end time (last slot + 1 hour)
      const lastIndex = allHours.indexOf(lastSlot);
      const endSlot = lastIndex < allHours.length - 1 ? allHours[lastIndex + 1] : this.addOneHour(lastSlot);
      
      return `${firstSlot} - ${endSlot}`;
    }

    return null;
  },

  // Helper to add one hour to a time string
  addOneHour(timeStr) {
    const hour = parseInt(timeStr);
    const isPM = timeStr.includes('pm');
    
    if (isPM) {
      if (hour === 8) return '9pm';
      return `${hour + 1}pm`;
    } else {
      if (hour === 11) return '12pm';
      return `${hour + 1}am`;
    }
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
      html += `<th colspan="3" class="day-divider ${todayClass} day-column-header" data-date="${dateStr}">${day} - ${dateString}</th>`;
    });

    html += `</tr><tr class="sub-header-row">`;

    CONFIG.DAYS.DISPLAY_FULL_MON_START.forEach((day, index) => {
        const currentDate = Utils.date.addDays(weekStart, index);
        const isToday = currentDate.getTime() === today.getTime();
        const todayClass = isToday ? 'today-header-sub' : '';
        const dateStr = Utils.date.formatDate(currentDate);
        html += `<th class="${todayClass} period-divider day-column-header" data-date="${dateStr}">Morning</th><th class="${todayClass} period-divider day-column-header" data-date="${dateStr}">Afternoon</th><th class="day-divider ${todayClass} day-column-header" data-date="${dateStr}">Evening</th>`;
    });

    html += "</tr></thead><tbody>";

    const weekStr = Utils.date.formatDate(weekStart);

    cleaners.forEach((cleaner) => {
      html += "<tr>";
      const regionConfig = CONFIG.REGIONS[cleaner.region] || CONFIG.REGIONS['Uncategorized'];
      const tierHtml = Utils.renderStars(cleaner.job_count);
      
      html += `<td class="name-col">
        <div class="cleaner-info">
          <span class="cleaner-name">${cleaner.name}</span>
          <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; align-items: center;">
            <span class="cleaner-region" style="background:${regionConfig.backgroundColor || regionConfig.color}20;color:${regionConfig.color}; border-color:${regionConfig.color};">
              ${regionConfig.emoji || ''} ${regionConfig.label}
            </span>
            ${tierHtml}
          </div>
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

        // SMART TIME CALCULATION - Get actual time range instead of hardcoded ranges
        if (isMorningBooked && isAfternoonBooked && isEveningBooked && 
            morning.job.jobNumber === afternoon.job.jobNumber && 
            afternoon.job.jobNumber === evening.job.jobNumber) {
            // All three periods - calculate actual time
            const timeRange = this.getActualTimeRange(cleaner, schedule, day, morning.job.jobNumber);
            html += this.renderCell(morning, 3, extraClasses('Evening') + `" data-date="${dateStr}`, timeRange);
        } else if (isMorningBooked && isAfternoonBooked && morning.job.jobNumber === afternoon.job.jobNumber) {
            // Morning + Afternoon - calculate actual time
            const timeRange = this.getActualTimeRange(cleaner, schedule, day, morning.job.jobNumber);
            html += this.renderCell(morning, 2, extraClasses('Afternoon', 'period-divider') + `" data-date="${dateStr}`, timeRange);
            html += this.renderCell(evening, 1, extraClasses('Evening') + `" data-date="${dateStr}`);
        } else if (isAfternoonBooked && isEveningBooked && afternoon.job.jobNumber === evening.job.jobNumber) {
            // Afternoon + Evening - calculate actual time
            const timeRange = this.getActualTimeRange(cleaner, schedule, day, afternoon.job.jobNumber);
            html += this.renderCell(morning, 1, extraClasses('Morning') + `" data-date="${dateStr}`);
            html += this.renderCell(afternoon, 2, extraClasses('Evening', 'day-divider') + `" data-date="${dateStr}`, timeRange);
        } else {
            // Individual periods - calculate actual times for booked ones
            if (isMorningBooked) {
                const timeRange = this.getActualTimeRange(cleaner, schedule, day, morning.job.jobNumber);
                morning.calculatedTime = timeRange;
            }
            if (isAfternoonBooked) {
                const timeRange = this.getActualTimeRange(cleaner, schedule, day, afternoon.job.jobNumber);
                afternoon.calculatedTime = timeRange;
            }
            if (isEveningBooked) {
                const timeRange = this.getActualTimeRange(cleaner, schedule, day, evening.job.jobNumber);
                evening.calculatedTime = timeRange;
            }
            
            html += this.renderCell(morning, 1, extraClasses('Morning') + `" data-date="${dateStr}`, morning.calculatedTime);
            html += this.renderCell(afternoon, 1, extraClasses('Afternoon') + `" data-date="${dateStr}`, afternoon.calculatedTime);
            html += this.renderCell(evening, 1, extraClasses('Evening') + `" data-date="${dateStr}`, evening.calculatedTime);
        }
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    this.setupColumnHoverEffects();

    document.querySelectorAll(".slot.booked").forEach((slot) => {
      slot.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showJobDetails(slot.dataset);
      });
    });

    document.querySelectorAll(".day-column-cell:not(.booked)").forEach((cell) => {
      cell.addEventListener("click", (e) => {
        if (cell.dataset.date) {
          this.onColumnClick(cell.dataset.date);
        }
      });
    });
  },

  setupColumnHoverEffects() {
    const allHeaders = document.querySelectorAll('.day-column-header');
    const allCells = document.querySelectorAll('.day-column-cell');

    allHeaders.forEach(header => {
      header.addEventListener('mouseenter', function() {
        const date = this.dataset.date;
        if (date) {
          document.querySelectorAll(`[data-date="${date}"]`).forEach(el => {
            el.classList.add('hovered');
          });
        }
      });

      header.addEventListener('mouseleave', function() {
        const date = this.dataset.date;
        if (date) {
          document.querySelectorAll(`[data-date="${date}"]`).forEach(el => {
            el.classList.remove('hovered');
          });
        }
      });

      header.addEventListener('click', function() {
        const date = this.dataset.date;
        if (date) {
          WeeklyView.onColumnClick(date);
        }
      });
    });

    allCells.forEach(cell => {
      cell.addEventListener('mouseenter', function() {
        const date = this.dataset.date;
        if (date) {
          document.querySelectorAll(`[data-date="${date}"]`).forEach(el => {
            el.classList.add('hovered');
          });
        }
      });

      cell.addEventListener('mouseleave', function() {
        const date = this.dataset.date;
        if (date) {
          document.querySelectorAll(`[data-date="${date}"]`).forEach(el => {
            el.classList.remove('hovered');
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

    // Use smart time calculation
    const timeRange = this.getActualTimeRange(cleaner, schedule, day, targetJobNumber);

    const isMorningMatch = morning.status === 'booked' && morning.job.jobNumber === targetJobNumber;
    const isAfternoonMatch = afternoon.status === 'booked' && afternoon.job.jobNumber === targetJobNumber;
    const isEveningMatch = evening.status === 'booked' && evening.job.jobNumber === targetJobNumber;

    // Calculate hours from actual time range
    let hours = 0;
    if (timeRange) {
      const [start, end] = timeRange.split(' - ');
      const startIdx = CONFIG.TIME_SLOTS.ALL_HOURS.indexOf(start);
      const endIdx = CONFIG.TIME_SLOTS.ALL_HOURS.indexOf(end);
      if (startIdx !== -1 && endIdx !== -1) {
        hours = endIdx - startIdx;
      }
    }

    const hourlyRate = parseFloat(cleaner.rate) || 25;
    const estimatedPay = hours * hourlyRate;

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
        const altRate = parseFloat(altCleaner.rate) || 25;
        if (hasAvailability && altRate < hourlyRate) {
          suggestedCleaner = altCleaner;
          break;
        }
      }
    }

    const regionConfig = CONFIG.REGIONS[cleaner.region] || CONFIG.REGIONS['Uncategorized'];
    const tierInfo = Utils.getTierInfo(cleaner.job_count);

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
        <p><strong>Region:</strong> <span style="background: ${regionConfig.backgroundColor || regionConfig.color}20; color: ${regionConfig.color}; padding: 0.2rem 0.5rem; border-radius: 9999px; border: 1px solid ${regionConfig.color};">${regionConfig.emoji || ''} ${regionConfig.label}</span></p>
        <p><strong>Tier:</strong> <span style="background: ${tierInfo.bgColor}; color: ${tierInfo.color}; padding: 0.2rem 0.5rem; border-radius: 9999px; font-weight: 600;">${tierInfo.stars} ${tierInfo.name}</span></p>
        <p><strong>Jobs Completed:</strong> ${cleaner.job_count || 0}</p>
        <p><strong>Day:</strong> ${day}</p>
        <p><strong>Time:</strong> ${timeRange || 'Unknown'} (${hours} hours)</p>
        <p><strong>Hourly Rate:</strong> $${hourlyRate}/hr</p>
        <p style="font-size:1.1rem;margin-top:0.5rem;"><strong>Estimated Pay:</strong> <span style="color:#2f855a;font-weight:700;">$${estimatedPay.toFixed(2)}</span></p>
      </div>
    `;

    if (suggestedCleaner) {
      const suggestedRate = parseFloat(suggestedCleaner.rate) || 25;
      const suggestedPay = hours * suggestedRate;
      const savings = estimatedPay - suggestedPay;
      
      html += `
        <div style="margin:1rem 0;padding:1rem;background:#f0fff4;border-left:3px solid #48bb78;border-radius:6px;">
          <h3 style="margin-bottom:0.75rem;color:#2f855a;">💡 Better Option Available</h3>
          <p><strong>${suggestedCleaner.name}</strong> is available in ${regionConfig.label}</p>
          <p><strong>Rate:</strong> $${suggestedRate}/hr (Save $${savings.toFixed(2)})</p>
          <p><strong>Estimated Pay:</strong> $${suggestedPay.toFixed(2)}</p>
        </div>
      `;
    }
    
    document.getElementById("jobDetails").innerHTML = html;
    document.getElementById("jobModal").classList.add("active");
  }
};

window.WeeklyView = WeeklyView;
