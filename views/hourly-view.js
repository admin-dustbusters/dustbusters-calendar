// Hourly View
const HourlyView = {
    render(data) {
        const container = document.getElementById("hourlyGrid");
        if (!container) return;

        const cleaners = Array.isArray(data?.cleaners) ? data.cleaners : [];
        const day = data?.day ?? new Date();
        const weekStart = Utils.date.getWeekStart(day);
        const weekStr = Utils.date.formatDate(weekStart);
        const dayShort = Utils.date.getDataDayKey(day);

        if (cleaners.length === 0) {
            container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match your filters</p>`;
            return;
        }

        let html = '<table class="hourly-table"><thead><tr class="main-header-row">';
        html += '<th class="name-col">Cleaner</th>';
        CONFIG.TIME_SLOTS.ALL_HOURS.forEach(hour => {
            html += `<th class="hour-column">${hour}</th>`;
        });
        html += '</tr></thead><tbody>';

        cleaners.forEach(cleaner => {
            html += '<tr>';
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

            const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
            const hours = CONFIG.TIME_SLOTS.ALL_HOURS;
            let i = 0;
            while (i < hours.length) {
                const hour = hours[i];
                const key = `${dayShort}_${hour}`;
                const val = schedule ? schedule[key] : undefined;

                let colspan = 1;
                if (val && val.startsWith('BOOKED')) {
                    const currentJob = Utils.parseBooking(val);
                    for (let j = i + 1; j < hours.length; j++) {
                        const nextKey = `${dayShort}_${hours[j]}`;
                        const nextVal = schedule ? schedule[nextKey] : undefined;
                        if (nextVal && nextVal.startsWith('BOOKED')) {
                            const nextJob = Utils.parseBooking(nextVal);
                            if (nextJob.jobNumber === currentJob.jobNumber) {
                                colspan++;
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                }

                const isBooked = val && val.startsWith('BOOKED');
                const isAvailable = val === 'AVAILABLE';
                const slotClass = isBooked ? 'booked' : isAvailable ? 'available' : 'unavailable';
                
                html += `<td class="slot ${slotClass} hour-column" ${colspan > 1 ? `colspan="${colspan}"`: ''}>`;
                if(isBooked) {
                    const job = Utils.parseBooking(val);
                   html += `<div class="job-info">
                        <div class="job-number">${job.jobNumber}</div>
                        <div class="job-customer">${job.customer}</div>
                    </div>`;
                } else if (isAvailable) {
                    html += '✓';
                } else {
                    html += '—';
                }
                html += '</td>';
                i += colspan;
            }
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }
};

window.HourlyView = HourlyView;
