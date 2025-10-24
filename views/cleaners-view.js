// Cleaners View
const CleanersView = {
    render(data) {
        const container = document.getElementById("cleanersModalGrid");
        if(!container) return;

        const cleaners = data?.cleaners ?? [];
        if(cleaners.length === 0) {
             container.innerHTML = `<p style="padding:2rem;text-align:center;">No cleaners match your filters</p>`;
            return;
        }

        let html = '';
        cleaners.forEach(cleaner => {
            const regionConfig = CONFIG.REGIONS[cleaner.region] || CONFIG.REGIONS['Uncategorized'];
            const starsHtml = Utils.renderStars(cleaner.job_count);
            
            html += `<div class="cleaner-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0;">${cleaner.name}</h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="background: ${regionConfig.color}20; color: ${regionConfig.color}; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; border: 1px solid ${regionConfig.color};">
                                ${regionConfig.emoji || ''} ${regionConfig.label}
                            </span>
                            ${starsHtml}
                            <span style="font-size: 0.75rem; color: #718096;">(${cleaner.job_count || 0} jobs)</span>
                        </div>
                    </div>
                </div>
                
                <p><strong>Email:</strong> ${cleaner.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${cleaner.phone || 'N/A'}</p>
                <p><strong>Rate:</strong> $${cleaner.rate || '25'}/hr</p>
            </div>`;
        });
        container.innerHTML = html;
    }
};

window.CleanersView = CleanersView;
