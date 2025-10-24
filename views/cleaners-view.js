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
            const tierInfo = Utils.getTierInfo(cleaner.job_count);
            
            html += `<div class="cleaner-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <h3 style="margin: 0;">${cleaner.name}</h3>
                    <span style="background: ${regionConfig.color}20; color: ${regionConfig.color}; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; border: 1px solid ${regionConfig.color};">
                        ${regionConfig.emoji || ''} ${regionConfig.label}
                    </span>
                </div>
                
                <div style="padding: 0.75rem; background: ${tierInfo.bgColor}; border-radius: 6px; margin-bottom: 0.75rem; text-align: center;">
                    <div style="font-size: 1.25rem; color: ${tierInfo.color}; margin-bottom: 0.25rem;">${tierInfo.stars}</div>
                    <div style="font-size: 0.875rem; font-weight: 600; color: ${tierInfo.color};">${tierInfo.name}</div>
                    <div style="font-size: 0.75rem; color: #718096; margin-top: 0.25rem;">${cleaner.job_count || 0} jobs completed</div>
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
