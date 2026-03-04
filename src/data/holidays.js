// Vietnamese holidays for girls/women + couple special dates
// Each holiday has: month (1-indexed), day, name, emoji, wish message for Nhi, theme colors

export const HOLIDAYS = [
    {
        month: 1, day: 1,
        name: 'Năm Mới',
        emoji: '🎆',
        wish: 'Chúc Nhi năm mới vui vẻ, hạnh phúc và luôn xinh đẹp! Anh yêu em nhiều lắm! 🎆💕',
        themeColors: ['#FFD700', '#FF6B6B', '#4ECDC4'],
        gradient: ['#667eea', '#764ba2'],
        icon: '🎆',
    },
    {
        month: 2, day: 14,
        name: 'Valentine',
        emoji: '💕',
        wish: 'Happy Valentine, Nhi yêu! Em là tình yêu đẹp nhất đời anh. Mãi yêu em! 💕🌹',
        themeColors: ['#FF1744', '#FF4081', '#F50057'],
        gradient: ['#ff416c', '#ff4b2b'],
        icon: '💘',
    },
    {
        month: 3, day: 8,
        name: 'Quốc tế Phụ nữ',
        emoji: '👩',
        wish: 'Chúc Nhi ngày 8/3 vui vẻ! Em mãi là cô gái tuyệt vời nhất trong lòng anh! 🌷💐',
        themeColors: ['#E040FB', '#CE93D8', '#F48FB1'],
        gradient: ['#f093fb', '#f5576c'],
        icon: '🌷',
    },
    {
        month: 3, day: 14,
        name: 'White Valentine',
        emoji: '🤍',
        wish: 'White Valentine vui vẻ, Nhi yêu! Anh muốn tặng em cả thế giới! 🤍🎀',
        themeColors: ['#FFFFFF', '#F8BBD0', '#FCE4EC'],
        gradient: ['#ffecd2', '#fcb69f'],
        icon: '🤍',
    },
    {
        month: 4, day: 5,
        name: 'Sinh nhật Nhi 🎂',
        emoji: '🎂',
        wish: 'Happy Birthday Nhi yêu! 🎂🎉 Chúc em luôn xinh đẹp, vui vẻ và hạnh phúc! Anh yêu em rất nhiều! 💕🎁',
        themeColors: ['#FFD54F', '#FF6F00', '#E040FB'],
        gradient: ['#f5af19', '#f12711'],
        icon: '🎂',
        isBirthday: true,
        birthYear: 2007,
    },
    {
        month: 5, day: 25,
        name: 'Kỷ niệm yêu nhau',
        emoji: '💑',
        wish: 'Kỷ niệm ngày mình bên nhau! Cảm ơn Nhi đã đến bên anh, yêu em mãi mãi! 💑💕',
        themeColors: ['#E94971', '#F48FB1', '#CE93D8'],
        gradient: ['#e94971', '#f48fb1'],
        icon: '💑',
    },
    {
        month: 6, day: 1,
        name: 'Quốc tế Thiếu nhi',
        emoji: '🧒',
        wish: 'Happy Children\'s Day, bé Nhi! Mãi là cô bé đáng yêu nhất của anh! 🧒💕',
        themeColors: ['#00BCD4', '#4CAF50', '#FFEB3B'],
        gradient: ['#43e97b', '#38f9d7'],
        icon: '🧒',
    },
    {
        month: 10, day: 20,
        name: 'Phụ nữ Việt Nam',
        emoji: '👩‍🦰',
        wish: 'Chúc Nhi ngày 20/10 thật hạnh phúc! Em là người phụ nữ tuyệt vời nhất! 🌸💝',
        themeColors: ['#FF6F00', '#F4511E', '#E040FB'],
        gradient: ['#fa709a', '#fee140'],
        icon: '🌺',
    },
    {
        month: 11, day: 20,
        name: 'Ngày Nhà giáo',
        emoji: '📚',
        wish: 'Chúc mừng ngày Nhà giáo Việt Nam! Cảm ơn Nhi đã dạy anh biết yêu! 📚💕',
        themeColors: ['#1E88E5', '#42A5F5', '#90CAF9'],
        gradient: ['#4facfe', '#00f2fe'],
        icon: '📚',
    },
    {
        month: 12, day: 24,
        name: 'Giáng Sinh',
        emoji: '🎄',
        wish: 'Merry Christmas, Nhi yêu! 🎄🎅 Giáng Sinh vui vẻ bên nhau nhé! Anh yêu em! 🎁❄️',
        themeColors: ['#C62828', '#2E7D32', '#FFD54F'],
        gradient: ['#c62828', '#2e7d32'],
        icon: '🎄',
    },
    {
        month: 12, day: 31,
        name: 'Đêm Giao thừa',
        emoji: '🎇',
        wish: 'Chúc Nhi đón giao thừa vui vẻ! Năm mới bên nhau thật hạnh phúc! 🎇🎊',
        themeColors: ['#FFD700', '#9C27B0', '#E040FB'],
        gradient: ['#a18cd1', '#fbc2eb'],
        icon: '🎇',
    },
];

// Get the next upcoming holiday
export function getUpcomingHoliday() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();

    let closest = null;
    let minDays = Infinity;

    for (const h of HOLIDAYS) {
        let holidayDate = new Date(currentYear, h.month - 1, h.day);
        if (holidayDate < now) {
            holidayDate = new Date(currentYear + 1, h.month - 1, h.day);
        }
        const diff = Math.ceil((holidayDate - now) / (1000 * 60 * 60 * 24));
        if (diff < minDays) {
            minDays = diff;
            closest = { ...h, daysUntil: diff, date: holidayDate };
        }
    }
    return closest;
}

// Get today's holiday (if any)
export function getTodayHoliday() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return HOLIDAYS.find(h => h.month === m && h.day === d) || null;
}

// Get holidays within the next N days
export function getHolidaysWithinDays(days = 7) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const results = [];

    for (const h of HOLIDAYS) {
        let holidayDate = new Date(currentYear, h.month - 1, h.day);
        if (holidayDate < now) {
            holidayDate = new Date(currentYear + 1, h.month - 1, h.day);
        }
        const diff = Math.ceil((holidayDate - now) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= days) {
            results.push({ ...h, daysUntil: diff, date: holidayDate });
        }
    }
    return results;
}

// Get Nhi's age
export function getNhiAge() {
    const birthday = new Date(2007, 3, 5); // April 5, 2007
    const now = new Date();
    let age = now.getFullYear() - birthday.getFullYear();
    const monthDiff = now.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthday.getDate())) {
        age--;
    }
    return age;
}

// Get days until Nhi's birthday
export function getDaysUntilBirthday() {
    const now = new Date();
    const year = now.getFullYear();
    let birthday = new Date(year, 3, 5); // April 5
    if (birthday <= now) {
        birthday = new Date(year + 1, 3, 5);
    }
    return Math.ceil((birthday - now) / (1000 * 60 * 60 * 24));
}
