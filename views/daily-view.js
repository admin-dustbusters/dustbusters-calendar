// Daily View
const DailyView = {
    render(data) {
         const container = document.getElementById("dailyGrid");
        if (!container) return;

        const cleaners = Array.isArray(data?.cleaners) ? data.cleaners : [];
        const day = data?.day ?? new Date();

        if (cleaners.length === 0) {
          container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match your filters</p>`;
          return;
        }

        let html = '<table class="calendar-table"><thead><tr class="main-header-row">';
        html += '<th class="name-col" rowspan="2">Cleaner</th>';
        html += `<th colspan="3">${Utils.date.formatFullDate(day)}</th>`;
        
        html += `</tr><tr class="sub-header-row">`;
        html += `<th class="period-divider">Morning</th><th class="period-divider">Afternoon</th><th class="day-divider">Evening</th>`;
        html += "</tr></thead><tbody>";

        const weekStart = Utils.date.getWeekStart(day);
        const weekStr = Utils.date.formatDate(weekStart);
        const dayShort = Utils.date.getDataDayKey(day);

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
          
          const morning = WeeklyView.getPeriodStatus(cleaner, schedule, dayShort, 'Morning');
          const afternoon = WeeklyView.getPeriodStatus(cleaner, schedule, dayShort, 'Afternoon');
          const evening = WeeklyView.getPeriodStatus(cleaner, schedule, dayShort, 'Evening');

            html += WeeklyView.renderCell(morning, 1, 'period-divider');
            html += WeeklyView.renderCell(afternoon, 1, 'period-divider');
            html += WeeklyView.renderCell(evening, 1, 'day-divider');

          html += "</tr>";
        });

        html += "</tbody></table>";
        container.innerHTML = html;
    }
};

window.DailyView = DailyView;
