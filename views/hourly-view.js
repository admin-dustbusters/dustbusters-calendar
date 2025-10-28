// Hourly View - FIXED Drag-and-Slide (preserves original design)
const HourlyView = {
    isDragging: false,
    dragStart: null,
    selectedSlots: [],
    
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
                
                // Calculate colspan for booked jobs (ORIGINAL LOGIC)
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
                
                // ADD: data attributes for dragging on available slots
                const dragAttrs = isAvailable ? 
                    `data-cleaner-id="${cleaner.id}" data-cleaner-name="${cleaner.name}" data-hour="${hour}" data-date="${Utils.date.formatDate(day)}" data-hour-index="${i}"` : '';
                
                // ADD: data attributes for booked slots (for click popup)
                const bookedAttrs = isBooked ? 
                    `data-cleaner="${cleaner.id}" data-day="${dayShort}" data-period="Hourly"` : '';
                
                html += `<td class="slot ${slotClass} hour-column" ${colspan > 1 ? `colspan="${colspan}"`: ''} ${dragAttrs} ${bookedAttrs}>`;
                
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

        // Setup drag functionality
        this.setupDragSelection();
        
        // Setup click handler for booked jobs
        this.setupBookedJobClicks();
    },

    setupBookedJobClicks() {
        document.querySelectorAll('.slot.booked').forEach(slot => {
            slot.style.cursor = 'pointer';
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showJobDetails(slot.dataset);
            });
        });
    },

    setupDragSelection() {
        const availableSlots = document.querySelectorAll('.slot.available');
        
        availableSlots.forEach(slot => {
            // Make available slots look draggable
            slot.style.cursor = 'pointer';
            
            // Mouse events
            slot.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startDrag(slot);
            });
            
            slot.addEventListener('mouseenter', (e) => {
                if (this.isDragging) {
                    this.updateSelection(slot);
                }
            });
            
            // Touch events for mobile
            slot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startDrag(slot);
            });
            
            slot.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('available')) {
                    this.updateSelection(element);
                }
            });
        });
        
        // Global mouse/touch end handlers
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
        
        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
    },

    startDrag(slot) {
        this.isDragging = true;
        this.dragStart = slot;
        this.selectedSlots = [slot];
        slot.classList.add('selecting');
    },

    updateSelection(currentSlot) {
        if (!this.isDragging || !this.dragStart) return;
        
        // Only allow selection within same cleaner
        const startCleaner = this.dragStart.dataset.cleanerId;
        const currentCleaner = currentSlot.dataset.cleanerId;
        
        if (startCleaner !== currentCleaner) return;
        
        // Clear previous selection
        document.querySelectorAll('.slot.selecting').forEach(s => {
            s.classList.remove('selecting');
        });
        
        // Get all available slots for this cleaner
        const cleanerSlots = Array.from(
            document.querySelectorAll(`.slot.available[data-cleaner-id="${startCleaner}"]`)
        );
        
        const startIndex = parseInt(this.dragStart.dataset.hourIndex);
        const currentIndex = parseInt(currentSlot.dataset.hourIndex);
        
        const minIndex = Math.min(startIndex, currentIndex);
        const maxIndex = Math.max(startIndex, currentIndex);
        
        // Select all slots in range
        this.selectedSlots = cleanerSlots.filter(slot => {
            const idx = parseInt(slot.dataset.hourIndex);
            return idx >= minIndex && idx <= maxIndex;
        });
        
        // Add visual selection
        this.selectedSlots.forEach(slot => {
            slot.classList.add('selecting');
        });
    },

    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        if (this.selectedSlots.length === 0) return;
        
        // Get booking info
        const firstSlot = this.selectedSlots[0];
        const lastSlot = this.selectedSlots[this.selectedSlots.length - 1];
        
        const cleanerId = firstSlot.dataset.cleanerId;
        const cleanerName = firstSlot.dataset.cleanerName;
        const date = firstSlot.dataset.date;
        const startHour = firstSlot.dataset.hour;
        const endHour = lastSlot.dataset.hour;
        const duration = this.selectedSlots.length;
        
        // Clear visual selection
        document.querySelectorAll('.slot.selecting').forEach(s => {
            s.classList.remove('selecting');
        });
        
        // Open Zenbooker
        this.openZenbookerBooking({
            cleanerId,
            cleanerName,
            date,
            startHour,
            endHour,
            duration
        });
        
        // Reset
        this.dragStart = null;
        this.selectedSlots = [];
    },

    openZenbookerBooking(bookingInfo) {
        const modal = document.getElementById('zenbookerModal');
        const iframe = document.getElementById('zenbookerIframe');
        const bookingDetails = document.getElementById('bookingDetails');

        bookingDetails.innerHTML = `
          <div>
            <h3>📅 Booking Details</h3>
            <div class="booking-info-grid">
              <strong>Cleaner:</strong> <span>${bookingInfo.cleanerName}</span>
              <strong>Date:</strong> <span>${bookingInfo.date}</span>
              <strong>Time:</strong> <span>${bookingInfo.startHour} - ${bookingInfo.endHour}</span>
              <strong>Duration:</strong> <span>${bookingInfo.duration} hour${bookingInfo.duration > 1 ? 's' : ''}</span>
            </div>
            <p>ℹ️ Complete the booking form below ⬇️</p>
          </div>
        `;

        const zenbookerUrl = `https://zenbooker.com/app?view=create-job&return=sched&date=${bookingInfo.date}`;
        iframe.src = zenbookerUrl;
        
        modal.classList.add('active');
    },

    closeZenbookerModal() {
        const modal = document.getElementById('zenbookerModal');
        const iframe = document.getElementById('zenbookerIframe');
        
        modal.classList.remove('active');
        iframe.src = '';
        
        setTimeout(() => {
            dataSync.refresh();
        }, 1000);
    },

    showJobDetails(dataset) {
        // Use WeeklyView's job details popup
        if (WeeklyView && WeeklyView.showJobDetails) {
            WeeklyView.showJobDetails(dataset);
        }
    }
};

window.HourlyView = HourlyView;
