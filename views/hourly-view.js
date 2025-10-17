// Hourly View - Hour-by-Hour Schedule Display
const HourlyView = {
  render(data) {
    const container = document.getElementById('calendarGrid');
    if (!container) return;

    const { cleaners, date } = data;
    const dayName = Utils.date.getDayOfWeek(date || new Date());

    if (cleaners.length === 0) {
      container.innerHTML = '<p style="padding: 2rem; text-align: center;">No cleaners match your filters</p>';
      return;
    }

    const hours = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];

    let html = `
      <div style="padding: 1.5rem;">
        <h2 style="margin-bottom: 1rem;">${date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Today'}</h2>
        <div style="overflow-x: auto;">
          <table class="calendar-table">
            <thead>
              <tr>
                <th style="min-width: 150px;">Cleaner</th>
    `;

    hours.forEach(hour => {
      html += `<th style="min-width: 80px;">${hour}</th>`;
    });

    html += '</tr></thead><tbody>';

    const weekStart = Utils.date.getWeekStart(date || new Date());
    const weekStr = Utils.date.formatDate(weekStart);

    cleaners.forEach(cleaner => {
      html += '<tr>';
      html += `<td style="position: sticky; left: 0; background: white; font-weight: 600;">${cleaner.name}</td>`;

      const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);

      hours.forEach(hour => {
        const key = `${dayName}_${hour}`;
        const val = schedule ? schedule[key] : null;

        if (val && val.startsWith('BOOKED')) {
          const booking = Utils.parseBooking(val);
          html += `
            <td class="slot booked" style="cursor: pointer;" 
                onclick="HourlyView.showBookingDetails('${cleaner.name}', '${booking.jobNumber}', '${booking.customer}', '${booking.address}')">
              <div style="font-size: 0.75rem; line-height: 1.3;">
                <strong>${booking.jobNumber}</strong><br>
                ${booking.customer}
              </div>
            </td>
          `;
        } else if (val === 'AVAILABLE') {
          html += '<td class="slot available">✓</td>';
        } else {
          html += '<td class="slot unavailable">—</td>';
        }
      });

      html += '</tr>';
    });

    html += '</tbody></table></div></div>';
    container.innerHTML = html;
  },

  showBookingDetails(cleanerName, jobNumber, customer, address) {
    let html = `
      <h2>Job Details</h2>
      <div style="margin: 1rem 0; padding: 1rem; background: #f7fafc; border-radius: 6px;">
        <p><strong>Job:</strong> ${jobNumber}</p>
        <p><strong>Cleaner:</strong> ${cleanerName}</p>
        <p><strong>Customer:</strong> ${customer}</p>
        ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
      </div>
    `;

    document.getElementById('jobDetails').innerHTML = html;
    document.getElementById('jobModal').classList.add('active');
  }
};
