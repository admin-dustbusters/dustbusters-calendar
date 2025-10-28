// Daily View - IMPROVED VERSION with Smart Time Calculation
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
          
          const morning = WeeklyView.getPeriodStatus(cleaner, schedule, dayShort, 'Morning');
          const afternoon = WeeklyView.getPeriodStatus(cleaner, schedule, dayShort, 'Afternoon');
          const evening = WeeklyView.getPeriodStatus(cleaner, schedule, dayShort, 'Evening');

          // SMART TIME CALCULATION - Add actual time ranges for booked periods
          if (morning.status === 'booked' && morning.job.jobNumber) {
            const timeRange = WeeklyView.getActualTimeRange(cleaner, schedule, dayShort, morning.job.jobNumber);
            morning.calculatedTime = timeRange;
          }
          if (afternoon.status === 'booked' && afternoon.job.jobNumber) {
            const timeRange = WeeklyView.getActualTimeRange(cleaner, schedule, dayShort, afternoon.job.jobNumber);
            afternoon.calculatedTime = timeRange;
          }
          if (evening.status === 'booked' && evening.job.jobNumber) {
            const timeRange = WeeklyView.getActualTimeRange(cleaner, schedule, dayShort, evening.job.jobNumber);
            evening.calculatedTime = timeRange;
          }

          html += WeeklyView.renderCell(morning, 1, 'period-divider', morning.calculatedTime);
          html += WeeklyView.renderCell(afternoon, 1, 'period-divider', afternoon.calculatedTime);
          html += WeeklyView.renderCell(evening, 1, 'day-divider', evening.calculatedTime);

          html += "</tr>";
        });

        html += "</tbody></table>";
        container.innerHTML = html;

        document.querySelectorAll(".slot.booked").forEach((slot) => {
          slot.addEventListener("click", (e) => {
            e.stopPropagation();
            WeeklyView.showJobDetails(slot.dataset);
          });
        });

        document.querySelectorAll(".slot:not(.booked)").forEach((slot) => {
          slot.addEventListener("click", () => {
            calendarEngine.setView('hourly');
          });
        });
    }
};

window.DailyView = DailyView;
