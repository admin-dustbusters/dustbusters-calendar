// AI Assistant Component - Smart Cleaner Recommendations
const AIAssistant = {
  async getSuggestion(date, timeSlot, region, serviceType = 'standard') {
    const modal = document.getElementById('jobModal');
    const detailsContainer = document.getElementById('jobDetails');

    // Show loading state
    detailsContainer.innerHTML = `
      <h2>🤖 AI Assistant</h2>
      <div style="padding: 2rem; text-align: center;">
        <div class="spinner" style="margin: 0 auto;"></div>
        <p style="margin-top: 1rem; color: #718096;">Analyzing available cleaners...</p>
      </div>
    `;
    modal.classList.add('active');

    try {
      const requestData = {
        date: Utils.date.formatDate(date),
        time_slot: timeSlot,
        region: region,
        service_type: serviceType
      };

      const response = await fetch(CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.CHECK_AVAILABILITY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const result = await response.json();
      this.displaySuggestions(result, date, timeSlot);

    } catch (error) {
      console.error('AI Assistant error:', error);
      this.displayError(error.message);
    }
  },

  displaySuggestions(result, date, timeSlot) {
    const detailsContainer = document.getElementById('jobDetails');

    if (!result.available_cleaners || result.available_cleaners.length === 0) {
      detailsContainer.innerHTML = `
        <h2>🤖 AI Assistant</h2>
        <div style="padding: 1.5rem; background: #fff5f5; border: 1px solid #f56565; border-radius: 6px; margin: 1rem 0;">
          <p style="color: #c53030;"><strong>No cleaners available</strong></p>
          <p style="color: #718096; margin-top: 0.5rem;">All cleaners are booked for this time slot.</p>
        </div>
      `;
      return;
    }

    let html = `
      <h2>🤖 AI Assistant Recommendations</h2>
      <div style="margin: 1rem 0; padding: 1rem; background: #f7fafc; border-radius: 6px;">
        <p><strong>Date:</strong> ${Utils.date.formatDate(date, 'MMM DD, YYYY')}</p>
        <p><strong>Time:</strong> ${timeSlot}</p>
      </div>
      <h3 style="margin: 1.5rem 0 1rem;">Best Matches:</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
    `;

    result.available_cleaners.slice(0, 5).forEach((cleaner, index) => {
      const score = cleaner.ai_score || 85;
      const reasons = cleaner.reasons || ['Available during requested time', 'Good performance history'];

      html += `
        <div style="padding: 1rem; border: 2px solid ${index === 0 ? '#48bb78' : '#e2e8f0'}; border-radius: 8px; background: ${index === 0 ? '#f0fff4' : 'white'};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <div>
              <strong style="font-size: 1.1rem;">${index + 1}. ${cleaner.name}</strong>
              ${index === 0 ? ' <span style="color: #48bb78; font-weight: 600;">⭐ Best Match</span>' : ''}
            </div>
            <div style="padding: 0.25rem 0.75rem; background: #48bb78; color: white; border-radius: 6px; font-weight: 600; font-size: 0.875rem;">
              ${score}% Match
            </div>
          </div>
          <div style="color: #718096; font-size: 0.875rem; margin-bottom: 0.75rem;">
            ${cleaner.region} • ${cleaner.phone || 'No phone'}
          </div>
          <div style="font-size: 0.875rem; color: #4a5568;">
            <strong>Why recommended:</strong>
            <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
              ${reasons.map(reason => `<li>${reason}</li>`).join('')}
            </ul>
          </div>
          <button onclick="AIAssistant.bookWithCleaner('${cleaner.id}', '${cleaner.name}')" 
                  class="btn btn-primary" 
                  style="margin-top: 1rem; width: 100%; padding: 0.75rem;">
            Book with ${cleaner.name.split(' ')[0]}
          </button>
        </div>
      `;
    });

    html += '</div>';
    detailsContainer.innerHTML = html;
  },

  displayError(message) {
    const detailsContainer = document.getElementById('jobDetails');
    detailsContainer.innerHTML = `
      <h2>🤖 AI Assistant</h2>
      <div style="padding: 1.5rem; background: #fff5f5; border: 1px solid #f56565; border-radius: 6px; margin: 1rem 0;">
        <p style="color: #c53030;"><strong>Error:</strong> ${message}</p>
        <p style="color: #718096; margin-top: 0.5rem;">Please try again or contact support.</p>
      </div>
      <button onclick="document.getElementById('jobModal').classList.remove('active')" 
              class="btn" style="margin-top: 1rem; width: 100%; padding: 0.75rem;">
        Close
      </button>
    `;
  },

  bookWithCleaner(cleanerId, cleanerName) {
    const cleaner = dataSync.getCleaner(cleanerId);
    if (cleaner) {
      document.getElementById('jobModal').classList.remove('active');
      // Open booking panel with this cleaner
      setTimeout(() => {
        BookingPanel.show(cleaner, new Date(), '9am');
      }, 300);
    }
  },

  // Quick access from weekly view
  showForSlot(day, period, region) {
    const date = this.getDateFromDay(day);
    const timeSlot = this.getPeriodStartTime(period);
    this.getSuggestion(date, timeSlot, region);
  },

  getDateFromDay(dayName) {
    const dayIndex = CONFIG.DAYS.SHORT.indexOf(dayName);
    const weekStart = calendarEngine.currentWeekStart;
    return Utils.date.addDays(weekStart, dayIndex);
  },

  getPeriodStartTime(period) {
    if (period === 'Morning') return '9am';
    if (period === 'Afternoon') return '1pm';
    return '5pm';
  }
};
