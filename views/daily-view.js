// Daily View - Single Day Focus
const DailyView = {
  render(data) {
    const container = document.getElementById('calendarGrid');
    if (!container) return;

    const { cleaners, date } = data;
    const dayName = Utils.date.getDayOfWeek(date);

    let html = `<h2>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>`;
    html += '<table class="calendar-table"><thead><tr>';
    html += '<th>Cleaner</th><th>Morning</th><th>Afternoon</th><th>Evening</th>';
    html += '</tr></thead><tbody>';

    cleaners.forEach(cleaner => {
      html += '<tr>';
      html += `<td><strong>${cleaner.name}</strong></td>`;
      
      ['Morning', 'Afternoon', 'Evening'].forEach(period => {
        html += WeeklyView.renderSlot(cleaner, dataSync.getSchedule(cleaner.id, Utils.date.getWeekStart(date)), dayName, period);
      });
      
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }
};
