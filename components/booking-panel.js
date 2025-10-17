// Booking Panel Component - Quick Job Booking Interface
const BookingPanel = {
  show(cleaner, date, timeSlot) {
    const modal = document.getElementById('jobModal');
    const detailsContainer = document.getElementById('jobDetails');

    const html = `
      <h2>Quick Book Job</h2>
      <div style="margin: 1.5rem 0;">
        <form id="quickBookForm" style="display: flex; flex-direction: column; gap: 1rem;">
          
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Cleaner</label>
            <input type="text" value="${cleaner.name}" readonly 
                   style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px; background: #f7fafc;">
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Date</label>
            <input type="date" id="bookingDate" value="${Utils.date.formatDate(date)}" 
                   style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;">
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Time</label>
            <select id="bookingTime" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;">
              <option value="">Select time...</option>
              ${this.getTimeOptions(timeSlot)}
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Customer Name</label>
            <input type="text" id="customerName" required 
                   style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;" 
                   placeholder="John Smith">
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Address</label>
            <input type="text" id="customerAddress" 
                   style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;" 
                   placeholder="123 Main St">
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Service Type</label>
            <select id="serviceType" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;">
              <option value="standard">Standard Clean</option>
              <option value="deep">Deep Clean</option>
              <option value="move-in">Move-In Clean</option>
              <option value="move-out">Move-Out Clean</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Duration (hours)</label>
            <input type="number" id="duration" value="3" min="1" max="12" 
                   style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;">
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Notes</label>
            <textarea id="jobNotes" rows="3" 
                      style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 6px;" 
                      placeholder="Special instructions..."></textarea>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1; padding: 0.75rem; font-size: 1rem;">
              Book Job
            </button>
            <button type="button" class="btn" onclick="BookingPanel.close()" style="flex: 1; padding: 0.75rem;">
              Cancel
            </button>
          </div>

        </form>
      </div>

      <div id="bookingResult" style="margin-top: 1rem;"></div>
    `;

    detailsContainer.innerHTML = html;
    modal.classList.add('active');

    // Setup form submission
    document.getElementById('quickBookForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitBooking(cleaner);
    });
  },

  getTimeOptions(defaultTime) {
    const times = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];
    return times.map(time => 
      `<option value="${time}" ${time === defaultTime ? 'selected' : ''}>${time}</option>`
    ).join('');
  },

  async submitBooking(cleaner) {
    const resultDiv = document.getElementById('bookingResult');
    resultDiv.innerHTML = '<p style="color: #4299e1;">Booking job...</p>';

    const bookingData = {
      cleaner_id: cleaner.id,
      cleaner_name: cleaner.name,
      date: document.getElementById('bookingDate').value,
      time: document.getElementById('bookingTime').value,
      customer: document.getElementById('customerName').value,
      address: document.getElementById('customerAddress').value,
      service_type: document.getElementById('serviceType').value,
      duration: document.getElementById('duration').value,
      notes: document.getElementById('jobNotes').value
    };

    try {
      const response = await fetch(CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.BOOK_JOB, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        throw new Error('Booking failed');
      }

      const result = await response.json();

      resultDiv.innerHTML = `
        <div style="padding: 1rem; background: #f0fff4; border: 1px solid #48bb78; border-radius: 6px; color: #2f855a;">
          <strong>✓ Job booked successfully!</strong><br>
          ${result.job_number ? `Job #: ${result.job_number}` : ''}
        </div>
      `;

      // Refresh calendar after 2 seconds
      setTimeout(() => {
        this.close();
        dataSync.refresh();
      }, 2000);

    } catch (error) {
      console.error('Booking error:', error);
      resultDiv.innerHTML = `
        <div style="padding: 1rem; background: #fff5f5; border: 1px solid #f56565; border-radius: 6px; color: #c53030;">
          <strong>✗ Booking failed</strong><br>
          ${error.message}
        </div>
      `;
    }
  },

  close() {
    document.getElementById('jobModal').classList.remove('active');
  }
};
