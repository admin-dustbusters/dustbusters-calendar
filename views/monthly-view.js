// Monthly View
const MonthlyView = {
    render(data) {
        const container = document.getElementById("monthlyGrid");
        if (!container) return;
        
        const cleaners = data?.cleaners ?? [];
        const monthDate = data?.month ?? new Date();
        
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const today = new Date();
        today.setHours(0,0,0,0);

        let html = '<table class="monthly-table"><thead><tr class="main-header-row">';
        CONFIG.DAYS.DISPLAY_SHORT_SUNDAY_START.forEach(day => {
            html += `<th>${day}</th>`;
        });
        html += '</tr></thead><tbody>';

        let date = new Date(firstDay);
        let startingDay = firstDay.getDay();
        date.setDate(date.getDate() - startingDay);

        for (let i = 0; i < 6; i++) {
            html += '<tr>';
            for (let j = 0; j < 7; j++) {
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.getTime() === today.getTime();
                
                const classes = [];
                if (!isCurrentMonth) classes.push('other-month');
                if (isToday) classes.push('month-today');

                const dateStr = Utils.date.formatDate(date);
                html += `<td class="${classes.join(' ')}" data-date="${dateStr}" onclick="MonthlyView.onDayClick('${dateStr}')">`;
                html += `<div class="day-number">${date.getDate()}</div>`;

                if(isCurrentMonth) {
                    const stats = dataSync.getDayStatsDetailed(date, cleaners);
                    html += `<div class="day-stats">
                        <div class="available-stat">✓ ${stats.cleanersAvailable} Cleaner${stats.cleanersAvailable !== 1 ? 's' : ''}</div>
                        <div class="booked-stat">🔴 ${stats.jobCount} Job${stats.jobCount !== 1 ? 's' : ''}</div>
                    </div>`;
                }
                html += '</td>';
                date.setDate(date.getDate() + 1);
            }
            html += '</tr>';
            if(date > lastDay && date.getDay() === 0) break;
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    onDayClick(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        calendarEngine.currentDay = date;
        calendarEngine.currentWeekStart = Utils.date.getWeekStart(date);
        calendarEngine.setView('hourly');
    }
};

window.MonthlyView = MonthlyView;
