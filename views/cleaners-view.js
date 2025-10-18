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
            html += `<div class="cleaner-card">
                <h3>${cleaner.name}</h3>
                <p><strong>Email:</strong> ${cleaner.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${cleaner.phone || 'N/A'}</p>
                <p><strong>Region:</strong> ${cleaner.region}</p>
                <p><strong>Rate:</strong> $${cleaner.rate || '25'}/hr</p>
            </div>`;
        });
        container.innerHTML = html;
    }
};

window.CleanersView = CleanersView;
