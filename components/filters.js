// Filters Component - Region and Search Filtering
const Filters = {
  render(options) {
    this.renderRegionFilters(options);
    this.renderSearchBox(options);
  },

  renderRegionFilters(options) {
    const container = document.getElementById('regionFilters');
    if (!container) return;

    container.innerHTML = '';
    
    Object.entries(options.regions).forEach(([region, config]) => {
      const btn = document.createElement('button');
      btn.className = 'region-btn';
      btn.style.borderColor = config.color;
      btn.style.color = config.color;
      btn.textContent = `${config.emoji || ''} ${config.label}`;
      
      if (options.activeRegions.has(region)) {
        btn.classList.add('active');
        btn.style.background = config.color + '20';
      }
      
      btn.addEventListener('click', () => {
        if (options.onRegionToggle) {
          options.onRegionToggle(region);
        }
      });
      
      container.appendChild(btn);
    });
  },

  renderSearchBox(options) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    // Set initial value if provided
    if (options.searchTerm) {
      searchInput.value = options.searchTerm;
    }

    // Clear any existing listeners
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    // Add new listener
    newSearchInput.addEventListener('input', Utils.debounce((e) => {
      if (options.onSearchChange) {
        options.onSearchChange(e.target.value);
      }
    }, CONFIG.UI.SEARCH_DEBOUNCE));
  },

  // Helper to get active filters
  getActiveFilters() {
    const searchInput = document.getElementById('searchInput');
    const activeRegions = new Set();

    document.querySelectorAll('.region-btn.active').forEach(btn => {
      const region = btn.textContent.trim().split(' ').pop();
      Object.entries(CONFIG.REGIONS).forEach(([key, config]) => {
        if (config.label === region) {
          activeRegions.add(key);
        }
      });
    });

    return {
      search: searchInput ? searchInput.value : '',
      regions: Array.from(activeRegions)
    };
  },

  // Reset all filters
  reset() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.region-btn').forEach(btn => {
      btn.classList.add('active');
    });
  },

  // Get filter summary for display
  getSummary() {
    const filters = this.getActiveFilters();
    const parts = [];

    if (filters.search) {
      parts.push(`Search: "${filters.search}"`);
    }

    if (filters.regions.length < Object.keys(CONFIG.REGIONS).length) {
      parts.push(`Regions: ${filters.regions.length} selected`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'All cleaners';
  }
};
