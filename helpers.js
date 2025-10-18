// DustBusters Calendar - Helper Functions

const getScheduleSignatureForSort = (cleaner, weekStr) => {
    const schedule = cleaner.schedule?.find(s => s.weekStarting === weekStr);
    if (!schedule) return "";
    return Object.values(schedule)
        .filter(val => typeof val === 'string' && val.startsWith('BOOKED'))
        .sort()
        .join(',');
};
