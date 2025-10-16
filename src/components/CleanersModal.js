// src/components/CleanersModal.js
const { createElement, useState } = React;

const CleanersModal = ({ show, onClose, availabilityData }) => {
  const [regionFilter, setRegionFilter] = useState('all');

  if (!show) return null;
  
  const uniqueCleanersMap = new Map();
  availabilityData.forEach(c => {
      // Exclude the 'Unassigned Jobs' placeholder
      if (c.id !== 'unassigned' && !uniqueCleanersMap.has(c.id)) {
          uniqueCleanersMap.set(c.id, c);
      }
  });
  const uniqueCleaners = Array.from(uniqueCleanersMap.values());
  
  const groupedByRegion = uniqueCleaners.reduce((acc, cleaner) => {
      const region = cleaner.region || 'Uncategorized';
      if (!acc[region]) acc[region] = [];
      acc[region].push(cleaner);
      return acc;
  }, {});

  const regionsForFilter = ['all', ...Object.keys(groupedByRegion).sort()];

  return createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onClick: onClose
    },
    createElement('div', {
        className: 'bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col p-6 md:p-8',
        onClick: (e) => e.stopPropagation()
      },
      createElement('div', { className: 'flex-shrink-0' },
          createElement('h2', { className: 'text-2xl font-bold text-gray-800 mb-4' }, 'Cleaner Directory'),
          createElement('div', { className: 'flex gap-2 mb-6 border-b pb-4 overflow-x-auto' },
            ...regionsForFilter.map(region => {
                const isSelected = regionFilter === region;
                return createElement('button', {
                    key: region,
                    onClick: () => setRegionFilter(region),
                    className: `flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }, region)
            })
          )
      ),
      createElement('div', { className: 'overflow-y-auto' },
        ...Object.keys(groupedByRegion).sort().filter(region => regionFilter === 'all' || region === regionFilter).map(region => 
            createElement('div', { key: region, className: 'mb-8' },
                createElement('h3', { className: 'text-lg font-bold text-gray-700 mb-4 border-b pb-2' }, region),
                createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                  ...groupedByRegion[region].map(c => 
                    createElement('div', { key: c.id, className: 'bg-gray-50 rounded-lg p-4 border border-gray-200' },
                        createElement('div', { className: 'font-semibold text-gray-900 mb-2' }, c.fullName || c.name),
                        createElement('div', { className: 'text-sm text-gray-600' }, `📞 ${c.phone || 'No phone'}`),
                        createElement('div', { className: 'text-sm text-gray-600' }, `✉️ ${c.email || 'No email'}`),
                        createElement('div', { className: 'text-sm text-gray-600' }, `💵 ${c.rate ? `${c.rate}/hour` : 'Rate not set'}`),
                        createElement('div', { className: 'text-sm text-gray-500 mt-2 pt-2 border-t' }, `Notes: ${c.notes || 'No notes.'}`)
                    )
                  )
                )
            )
        )
      ),
      createElement('button', {
        onClick: onClose,
        className: 'mt-6 flex-shrink-0 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 self-center'
      }, 'Close')
    )
  );
};

export default CleanersModal;
