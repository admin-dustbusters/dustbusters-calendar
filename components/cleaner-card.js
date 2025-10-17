// Cleaner Card Component - Individual Cleaner Schedule Display
const CleanerCard = {
  create(cleaner, schedule, weekStart) {
    const regionConfig = CONFIG.REGIONS[cleaner.region] || CONFIG.REGIONS['Uncategorized'];
    
    const card = document.createElement('div');
    card.className = 'cleaner-card';
    card.setAttribute('data-cleaner-id', cleaner.id);
    
    // Build header
    let html = `
      <div class="cleaner-card-header">
        <div>
          <div class="cleaner-card-name">${cleaner.name}</div>
          ${cleaner.phone ? `<div class="cleaner-card-phone">${this.formatPhone(cleaner.phone)}</div>` : ''}
          ${cleaner.email ? `<div style="font-size: 0.75rem; color: #718096; margin-top: 0.25rem;">${cleaner.email}</div>` : ''}
        </div>
        <span class="cleaner-card-region" style="background: ${regionConfig.color}20; color: ${regionConfig.color};">
          ${regionConfig.emoji || ''} ${regionConfig.label}
        </span>
      </div>
    `;
    
    // Add rate if available
    if (cleaner.rate) {
      html += `
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem;">
          <strong>Rate:</strong> ${cleaner.rate}
        </div>
      `;
    }

    // Build schedule
    if (schedule) {
      const weekStats = this.calculateWeekStats(schedule);
      
      html += `
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; padding: 0.75rem; background: #f7fafc; border-radius: 6px;">
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 0.75rem; color: #718096;">Available</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #48bb78;">${weekStats.available}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 0.75rem; color: #718096;">Booked</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #f56565;">${weekStats.booked}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 0.75rem; color: #718096;">Utilization</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #4299e1;">${weekStats.utilization}%</div>
          </div>
        </div>
      `;

      html += '<div class="schedule-list">';
      
      CONFIG.DAYS.SHORT.forEach(day => {
        const dayData = this.getDayData(schedule, day);
        
        if (dayData.bookings.length > 0 || dayData.available.length > 0) {
          html += `
            <div class="schedule-day">
              <div class="schedule-day-name">${day}</div>
              <div class="schedule-slots">
          `;
          
          // Show bookings
          dayData.bookings.forEach(booking => {
            html += `
              <span class="schedule-slot booked" 
                    title="${booking.customer} - ${booking.address || 'No address'}"
                    onclick="CleanerCard.showBookingDetails('${cleaner.name}', '${booking.jobNumber}', '${booking.customer}', '${booking.address}', '${booking.time}')">
                ${booking.time}: ${booking.jobNumber}
              </span>
            `;
          });
          
          // Show available slots
          if (dayData.available.length > 0) {
            html += `
              <span class="schedule-slot available">
                ✓ ${dayData.available.length} slot${dayData.available.length > 1 ? 's' : ''} free
              </span>
            `;
          }
          
          html += '</div></div>';
        }
      });
      
      html += '</div>';
    } else {
      html += `
        <div style="padding: 2rem; text-align: center; color: #718096; background: #f7fafc; border-radius: 6px;">
          <p>No schedule for this week</p>
        </div>
      `;
    }

    // Add action buttons
    html += `
      <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
        <button onclick="CleanerCard.bookWithCleaner('${cleaner.id}', '${cleaner.name}')" 
                class="btn btn-primary" 
                style="flex: 1; padding: 0.75rem; font-size: 0.875rem;">
          📅 Book Job
        </button>
        <button onclick="CleanerCard.viewFullSchedule('${cleaner.id}')" 
                class="btn" 
                style="flex: 1; padding: 0.75rem; font-size: 0.875rem;">
          📊 Full Schedule
        </button>
      </div>
    `;

    // Add notes if available
    if (cleaner.notes) {
      html += `
        <div style="margin-top: 1rem; padding: 0.75rem; background: #fffbeb; border-left: 3px solid #ecc94b; border-radius: 4px; font-size: 0.875rem;">
          <strong>Note:</strong> ${cleaner.notes}
        </div>
      `;
    }
    
    card.innerHTML = html;
    return card;
  },

  formatPhone(phone) {
    // Format phone number nicely
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.substr(0,3)}) ${cleaned.substr(3,3)}-${cleaned.substr(6,4)}`;
    }
    return phone;
  },

  getDayData(schedule, day) {
    const bookings = [];
    const available = [];
    
    const allSlots = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];
    
    allSlots.forEach(slot => {
      const key = `${day}_${slot}`;
      const val = schedule[key];
      
      if (val && val.startsWith('BOOKED')) {
        const booking = Utils.parseBooking(val);
        if (booking) {
          bookings.push({ time: slot, ...booking });
        }
      } else if (val === 'AVAILABLE') {
        available.push(slot);
      }
    });
    
    return { bookings, available };
  },

  calculateWeekStats(schedule) {
    let available = 0;
    let booked = 0;
    
    Object.entries(schedule).forEach(([key, value]) => {
      if (key === 'weekStarting') return;
      
      if (typeof value === 'string') {
        if (value === 'AVAILABLE') available++;
        else if (value.startsWith('BOOKED')) booked++;
      }
    });
    
    const total = available + booked;
    const utilization = total > 0 ? Math.round((booked / total) * 100) : 0;
    
    return { available, booked, utilization };
  },

  showBookingDetails(cleanerName, jobNumber, customer, address, time) {
    let html = `
      <h2>Job Details</h2>
      <div style="margin: 1rem 0; padding: 1rem; background: #f7fafc; border-radius: 6px;">
        <p><strong>Job Number:</strong> ${jobNumber}</p>
        <p><strong>Cleaner:</strong> ${cleanerName}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Customer:</strong> ${customer}</p>
        ${address && address !== 'undefined' ? `<p><strong>Address:</strong> ${address}</p>` : ''}
      </div>
      <button onclick="document.getElementById('jobModal').classList.remove('active')" 
              class="btn" 
              style="width: 100%; padding: 0.75rem; margin-top: 1rem;">
        Close
      </button>
    `;

    document.getElementById('jobDetails').innerHTML = html;
    document.getElementById('jobModal').classList.add('active');
  },

  bookWithCleaner(cleanerId, cleanerName) {
    const cleaner = dataSync.getCleaner(cleanerId);
    if (cleaner && BookingPanel) {
      BookingPanel.show(cleaner, new Date(), '9am');
    } else {
      Utils.toast('Booking panel not available', 'error');
    }
  },

  viewFullSchedule(cleanerId) {
    // Switch to weekly view and filter to this cleaner
    const viewSelect = document.getElementById('viewSelect');
    if (viewSelect) {
      viewSelect.value = 'weekly';
      calendarEngine.switchView('weekly');
      
      // Set search to cleaner name
      const cleaner = dataSync.getCleaner(cleanerId);
      if (cleaner) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = cleaner.name;
          calendarEngine.filters.search = cleaner.name.toLowerCase();
          calendarEngine.render();
        }
      }
    }
  }
};
