// Hourly View with Drag-to-Select Booking
const HourlyView = {
  isDragging: false,
  dragStartSlot: null,
  dragEndSlot: null,
  selectedCleaner: null,
  selectedDay: null,
  selectedSlots: [],

  render(data) {
    const container = document.getElementById("hourlyGrid");
    if (!container) return;

    const cleaners = Array.isArray(data?.cleaners) ? data.cleaners : [];
    const day = data?.day ?? new Date();

    if (cleaners.length === 0) {
      container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match your filters</p>`;
      return;
    }

    const weekStart = Utils.date.getWeekStart(day);
    const weekStr = Utils.date.formatDate(weekStart);
    const dayShort = Utils.date.getDataDayKey(day);

    let html = '<table class="calendar-table hourly-table"><thead><tr>';
    html += '<th class="name-col">Cleaner</th>';

    CONFIG.TIME_SLOTS.ALL_HOURS.forEach((hour) => {
      html += `<th class="time-header">${hour}</th>`;
    });

    html += "</tr></thead><tbody>";

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

      CONFIG.TIME_SLOTS.ALL_HOURS.forEach((hour) => {
        const key = `${dayShort}_${hour}`;
        const val = schedule ? schedule[key] : null;

        if (val && val.startsWith("BOOKED")) {
          const booking = Utils.parseBooking(val);
          html += `<td class="slot booked" data-cleaner="${cleaner.id}" data-hour="${hour}" data-job="${booking.jobNumber}">
            <div class="booking-compact">
              <div class="job-number-small">${booking.jobNumber}</div>
              <div class="job-customer-small">${booking.customer}</div>
            </div>
          </td>`;
        } else if (val === "AVAILABLE") {
          html += `<td class="slot available draggable" 
                      data-cleaner-id="${cleaner.id}" 
                      data-cleaner-name="${cleaner.name}"
                      data-day="${dayShort}" 
                      data-hour="${hour}"
                      data-date="${Utils.date.formatDate(day)}">
            <div class="available-indicator">✓</div>
          </td>`;
        } else {
          html += `<td class="slot unavailable">—</td>`;
        }
      });

      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    // Setup drag selection
    this.setupDragSelection();

    // Click on booked slots to see details
    document.querySelectorAll(".slot.booked").forEach((slot) => {
      slot.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showJobDetails(slot.dataset);
      });
    });
  },

  setupDragSelection() {
    const draggableSlots = document.querySelectorAll('.slot.draggable');

    draggableSlots.forEach(slot => {
      // Mouse events
      slot.addEventListener('mousedown', (e) => this.startDrag(e, slot));
      slot.addEventListener('mouseenter', (e) => this.continueDrag(e, slot));
      slot.addEventListener('mouseup', (e) => this.endDrag(e));

      // Touch events for mobile
      slot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.startDrag(e, slot);
      });
      
      slot.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('draggable')) {
          this.continueDrag(e, element);
        }
      });
      
      slot.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.endDrag(e);
      });
    });

    // Global mouse up to catch drag end anywhere
    document.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.endDrag(e);
      }
    });
  },

  startDrag(e, slot) {
    // Only allow dragging within same cleaner
    const cleanerId = slot.dataset.cleanerId;
    const day = slot.dataset.day;
    
    this.isDragging = true;
    this.dragStartSlot = slot;
    this.selectedCleaner = {
      id: cleanerId,
      name: slot.dataset.cleanerName
    };
    this.selectedDay = day;
    this.selectedSlots = [slot];
    
    slot.classList.add('selecting');
  },

  continueDrag(e, slot) {
    if (!this.isDragging) return;

    const cleanerId = slot.dataset.cleanerId;
    const day = slot.dataset.day;

    // Only select slots from same cleaner and same day
    if (cleanerId !== this.selectedCleaner.id || day !== this.selectedDay) {
      return;
    }

    // Clear previous selections
    document.querySelectorAll('.slot.selecting').forEach(s => {
      s.classList.remove('selecting');
    });

    // Get all slots between start and current
    const allSlots = Array.from(document.querySelectorAll(`.slot.draggable[data-cleaner-id="${cleanerId}"][data-day="${day}"]`));
    const startIndex = allSlots.indexOf(this.dragStartSlot);
    const currentIndex = allSlots.indexOf(slot);

    const minIndex = Math.min(startIndex, currentIndex);
    const maxIndex = Math.max(startIndex, currentIndex);

    this.selectedSlots = [];
    for (let i = minIndex; i <= maxIndex; i++) {
      allSlots[i].classList.add('selecting');
      this.selectedSlots.push(allSlots[i]);
    }

    this.dragEndSlot = slot;
  },

  endDrag(e) {
    if (!this.isDragging) return;

    this.isDragging = false;

    // Get selection info
    if (this.selectedSlots.length === 0) return;

    const firstSlot = this.selectedSlots[0];
    const lastSlot = this.selectedSlots[this.selectedSlots.length - 1];

    const startHour = firstSlot.dataset.hour;
    const endHour = lastSlot.dataset.hour;
    const date = firstSlot.dataset.date;
    const cleanerId = firstSlot.dataset.cleanerId;
    const cleanerName = firstSlot.dataset.cleanerName;

    // Calculate duration in hours
    const startIndex = CONFIG.TIME_SLOTS.ALL_HOURS.indexOf(startHour);
    const endIndex = CONFIG.TIME_SLOTS.ALL_HOURS.indexOf(endHour);
    const duration = (endIndex - startIndex + 1);

    // Clear visual selection
    document.querySelectorAll('.slot.selecting').forEach(s => {
      s.classList.remove('selecting');
    });

    // Open Zenbooker iframe with this selection
    this.openZenbookerBooking({
      cleanerId,
      cleanerName,
      date,
      startHour,
      endHour,
      duration
    });

    // Reset
    this.dragStartSlot = null;
    this.dragEndSlot = null;
    this.selectedSlots = [];
    this.selectedCleaner = null;
  },

  openZenbookerBooking(bookingInfo) {
    const modal = document.getElementById('zenbookerModal');
    const iframe = document.getElementById('zenbookerIframe');
    const bookingDetails = document.getElementById('bookingDetails');

    // Show booking details
    bookingDetails.innerHTML = `
      <div style="padding: 1rem; background: #f0f9ff; border-radius: 8px; margin-bottom: 1rem;">
        <h3 style="margin: 0 0 0.5rem 0; color: #0369a1;">📅 Booking Details</h3>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; font-size: 0.95rem;">
          <strong>Cleaner:</strong> <span>${bookingInfo.cleanerName}</span>
          <strong>Date:</strong> <span>${bookingInfo.date}</span>
          <strong>Time:</strong> <span>${bookingInfo.startHour} - ${bookingInfo.endHour}</span>
          <strong>Duration:</strong> <span>${bookingInfo.duration} hour${bookingInfo.duration > 1 ? 's' : ''}</span>
        </div>
        <p style="margin: 0.75rem 0 0 0; font-size: 0.875rem; color: #0369a1;">
          Complete the booking form below ⬇️
        </p>
      </div>
    `;

    // Try to pass parameters (even though they might not work)
    const zenbookerUrl = `https://zenbooker.com/app?view=create-job&return=sched&date=${bookingInfo.date}`;
    
    iframe.src = zenbookerUrl;
    modal.classList.add('active');
  },

  closeZenbookerModal() {
    const modal = document.getElementById('zenbookerModal');
    const iframe = document.getElementById('zenbookerIframe');
    
    modal.classList.remove('active');
    iframe.src = ''; // Clear iframe
    
    // Refresh calendar data
    setTimeout(() => {
      dataSync.refresh();
    }, 1000);
  },

  showJobDetails(dataset) {
    // Show existing job details (from your current implementation)
    WeeklyView.showJobDetails(dataset);
  }
};

window.HourlyView = HourlyView;
