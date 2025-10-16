// src/components/SlotDetailsModal.js
const { createElement } = React;

const SlotDetailsModal = ({ slot, onClose }) => {
  if (!slot) return null;

  return createElement('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
    onClick: onClose
  },
    createElement('div', {
      className: 'bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto p-6 md:p-8',
      onClick: (e) => e.stopPropagation()
    },
      createElement('div', { className: 'text-xl md:text-2xl font-bold text-gray-800 mb-2' }, `${slot.day} ${slot.block.label}`),
      createElement('div', { className: 'text-sm text-gray-600 mb-6' }, `${slot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${slot.block.time}`),

      // Available Cleaners Section
      createElement('div', { className: 'mb-6' },
        createElement('h3', { className: 'font-semibold text-green-700 mb-3 text-lg' }, `✅ Available (${slot.available.length})`),
        createElement('div', { className: 'space-y-3' },
          slot.available.length > 0
            ? slot.available.map(c =>
              createElement('div', { key: c.id, className: 'bg-gray-50 rounded-lg p-4' },
                createElement('div', { className: 'flex justify-between items-start mb-2' },
                  createElement('div', { className: 'font-semibold text-gray-900' }, c.fullName || c.name),
                  createElement('div', { className: 'text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded' }, c.region)
                ),
                createElement('div', { className: 'text-sm text-gray-600 mb-1' }, c.phone || 'No phone'),
                createElement('div', { className: 'text-sm text-gray-600' }, c.rate ? `${c.rate}/hour` : 'Rate not set')
              )
            )
            : createElement('div', { className: 'text-sm text-gray-500' }, 'No cleaners available for this slot.')
        )
      ),

      // Booked Cleaners Section (Handles Assigned and Unassigned Jobs)
      slot.booked.length > 0 && createElement('div', { className: 'mb-6' },
        createElement('h3', { className: 'font-semibold text-red-700 mb-3 text-lg' }, `🔴 Booked / Unassigned Jobs (${slot.booked.length})`),
        createElement('div', { className: 'space-y-2' },
          slot.booked.map((booking, index) => {
            const cleaner = booking.cleaner;
            const jobInfo = booking.details.replace('BOOKED ', '');
            const isUnassigned = cleaner.id === 'unassigned';
            return createElement('div', {
              key: `${cleaner.id}-${index}`,
              className: `rounded-lg p-3 ${isUnassigned ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50'}`
            },
              createElement('div', { className: 'font-medium text-gray-900' }, cleaner.fullName || cleaner.name),
              createElement('div', {
                className: `text-sm font-semibold ${isUnassigned ? 'text-yellow-800' : 'text-red-700'}`
              }, jobInfo)
            );
          })
        )
      ),

      // Action Buttons
      createElement('div', { className: 'flex flex-col sm:flex-row gap-3 mt-6' },
        createElement('button', {
          onClick: () => alert('AI booking assistant coming soon!'),
          className: 'flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700'
        }, '🤖 Book with AI Assist'),
        createElement('button', {
          onClick: onClose,
          className: 'px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300'
        }, 'Close')
      )
    )
  );
};

export default SlotDetailsModal;
