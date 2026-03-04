// Love start date: May 25, 2022
export const LOVE_START_DATE = new Date(2022, 4, 25); // Month is 0-indexed

export const COUPLE_NAMES = {
    person1: 'Nhật',
    person2: 'Nhi',
};

export function getLoveDuration() {
    const now = new Date();
    const diff = now - LOVE_START_DATE;

    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const years = Math.floor(totalDays / 365.25);
    const months = Math.floor((totalDays % 365.25) / 30.44);
    const days = Math.floor(totalDays % 30.44);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    return {
        totalDays,
        totalHours,
        totalMinutes,
        totalSeconds,
        years,
        months,
        days,
        hours,
        minutes,
        seconds,
    };
}

export function getMilestones() {
    const now = new Date();
    const milestones = [
        { days: 100, label: '100 ngày yêu nhau 💕' },
        { days: 200, label: '200 ngày yêu nhau 💗' },
        { days: 365, label: '1 năm yêu nhau 🎉' },
        { days: 500, label: '500 ngày yêu nhau 🌟' },
        { days: 730, label: '2 năm yêu nhau 💝' },
        { days: 1000, label: '1000 ngày yêu nhau 🏆' },
        { days: 1095, label: '3 năm yêu nhau 💖' },
        { days: 1461, label: '4 năm yêu nhau 🌸' },
        { days: 1826, label: '5 năm yêu nhau 💎' },
        { days: 2000, label: '2000 ngày yêu nhau 👑' },
        { days: 2555, label: '7 năm yêu nhau 🌈' },
        { days: 3650, label: '10 năm yêu nhau 💍' },
    ];

    const { totalDays } = getLoveDuration();

    return milestones.map(m => {
        const milestoneDate = new Date(LOVE_START_DATE);
        milestoneDate.setDate(milestoneDate.getDate() + m.days);
        const daysUntil = m.days - totalDays;

        return {
            ...m,
            date: milestoneDate,
            passed: daysUntil <= 0,
            daysUntil: Math.abs(daysUntil),
            isCurrent: daysUntil === 0,
        };
    });
}

export function getNextAnniversary() {
    const now = new Date();
    const thisYearAnniversary = new Date(now.getFullYear(), 4, 25);

    if (thisYearAnniversary <= now) {
        thisYearAnniversary.setFullYear(thisYearAnniversary.getFullYear() + 1);
    }

    const diff = thisYearAnniversary - now;
    const daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return {
        date: thisYearAnniversary,
        daysUntil,
        yearNumber: thisYearAnniversary.getFullYear() - 2022,
    };
}

export function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
