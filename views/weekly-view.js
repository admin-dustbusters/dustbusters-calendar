// Weekly View - Fixed Version
const WeeklyView = {
  render(data) {
    const container = document.getElementById("calendarGrid");
    if (!container) return;

    const cleaners = Array.isArray(data?.cleaners) ? data.cleaners : [];
    const weekStart = data?.weekStart ?? calendarEngine?.currentWeekStart ?? new Date();

    if (cleaners.length === 0) {
      container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match your filters</p>`;
      return;
    }

    let html = '<table class="calendar-table"><thead><tr>';
    html += '<th class="name-col">Cleaner</th>';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    CONFIG.DAYS.SHORT.forEach((day, index) => {
      const currentDate = Utils.date.addDays(weekStart, index);
      const isToday = currentDate.getTime() === today.getTime();
      const style = isToday ? 'style="background-color: #ebf8ff; color: #3182ce; border-left: 1px solid #bee3f8; border-right: 1px solid #bee3f8;"' : '';
      html += `<th colspan="3" ${style} style="text-align:center;">${day}</th>`;
    });

    html += "</tr><tr><th class='name-col'></th>";
    CONFIG.DAYS.SHORT.forEach(() => {
      html += "<th>Morning</th><th>Afternoon</th><th>Evening</th>";
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
          }20;color:${CONFIG.REGIONS[cleaner.region]?.color || "#333"};">
            ${CONFIG.REGIONS[cleaner.region]?.label || cleaner.region}
          </span>
        </div>
      </td>`;

      const schedule = cleaner.schedule?.find((s) => s.weekStarting === weekStr);

      CONFIG.DAYS.SHORT.forEach((day) => {
        ["Morning", "Afternoon", "Evening"].forEach((period) => {
          html += this.renderSlot(cleaner, schedule, day, period);
        });
      });

      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    document.querySelectorAll(".slot.booked").forEach((slot) => {
      slot.addEventListener("click", () => this.showJobDetails(slot.dataset));
    });
  },

  renderSlot(cleaner, schedule, day, period) {
    const slots = Utils.getTimeSlotsForPeriod(period);
    if (!schedule) return '<td class="slot unavailable">—</td>';

    let bookings = [];
    let hasAvailable = false;

    slots.forEach((slot) => {
      const key = `${day}_${slot}`;
      const val = schedule[key];

      if (val && val.startsWith("BOOKED")) {
        bookings.push(Utils.parseBooking(val));
      } else if (val === "AVAILABLE") {
        hasAvailable = true;
      }
    });

    if (bookings.length > 0) {
      const b = bookings[0];
      return `<td class="slot booked" data-cleaner="${cleaner.id}" data-day="${day}" data-period="${period}">
        <div class="job-info">
          <div class="job-number">${b.jobNumber}</div>
          <div class="job-customer">${b.customer}</div>
          ${b.address ? `<div class="job-address">${b.address}</div>` : ""}
        </div>
      </td>`;
    } else if (hasAvailable) {
      return `<td class="slot available">✓ Available</td>`;
    } else {
      return '<td class="slot unavailable">—</td>';
    }
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
  },
};

// CRITICAL: Expose to global scope
window.WeeklyView = WeeklyView;
