// Hourly View - MINIMAL UPDATE (keeps original design, just adds Zenbooker booking)
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
            html += `<th>${hour}</th>`;
        });
        html += '</tr></thead><tbody>';

        cleaners.forEach(cleaner => {
            html += '<tr>';
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
                
                // ONLY CHANGE: Add data attributes to available slots for booking
                const bookingAttrs = isAvailable ? 
                    `data-cleaner-id="${cleaner.id}" data-cleaner-name="${cleaner.name}" data-hour="${hour}" data-date="${Utils.date.formatDate(day)}"` : '';
                
                html += `<td class="slot ${slotClass} hour-column" ${colspan > 1 ? `colspan="${colspan}"`: ''} ${bookingAttrs}>`;
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

        // NEW: Add click handlers to available slots
        this.setupClickHandlers();
    },

    // NEW METHOD: Setup click to open Zenbooker
    setupClickHandlers() {
        const availableSlots = document.querySelectorAll('.slot.available');
        
        availableSlots.forEach(slot => {
            slot.style.cursor = 'pointer';
            
            slot.addEventListener('click', (e) => {
                const cleanerId = slot.dataset.cleanerId;
                const cleanerName = slot.dataset.cleanerName;
                const hour = slot.dataset.hour;
                const date = slot.dataset.date;
                
                this.openZenbookerBooking({
                    cleanerId,
                    cleanerName,
                    hour,
                    date
                });
            });
        });
    },

    // NEW METHOD: Open Zenbooker modal
    openZenbookerBooking(bookingInfo) {
        const modal = document.getElementById('zenbookerModal');
        const iframe = document.getElementById('zenbookerIframe');
        const bookingDetails = document.getElementById('bookingDetails');

        // Show booking context
        bookingDetails.innerHTML = `
          <div style="padding: 1rem; background: #f0f9ff; border-radius: 8px; margin-bottom: 1rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: #0369a1;">📅 Booking Context</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; font-size: 0.95rem;">
              <strong>Cleaner:</strong> <span>${bookingInfo.cleanerName}</span>
              <strong>Date:</strong> <span>${bookingInfo.date}</span>
              <strong>Starting:</strong> <span>${bookingInfo.hour}</span>
            </div>
            <p style="margin: 0.75rem 0 0 0; font-size: 0.875rem; color: #0369a1;">
              ℹ️ Complete the booking form below. You'll need to select/create customer, choose service type, and set duration.
            </p>
          </div>
        `;

        // Load Zenbooker
        const zenbookerUrl = `https://zenbooker.com/app?view=create-job&return=sched&date=${bookingInfo.date}`;
        iframe.src = zenbookerUrl;
        
        modal.classList.add('active');
    },

    // NEW METHOD: Close modal
    closeZenbookerModal() {
        const modal = document.getElementById('zenbookerModal');
        const iframe = document.getElementById('zenbookerIframe');
        
        modal.classList.remove('active');
        iframe.src = '';
        
        // Refresh calendar
        setTimeout(() => {
            dataSync.refresh();
        }, 1000);
    }
};

window.HourlyView = HourlyView;
