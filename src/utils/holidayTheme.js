// Holiday Theme System — Dynamic colors based on upcoming holidays
import { getUpcomingHoliday, getTodayHoliday, getHolidaysWithinDays } from '../data/holidays';
import { COLORS, GRADIENTS } from '../theme';

// Get active holiday theme (if a holiday is within 3 days)
export function getActiveHolidayTheme() {
    const todayHoliday = getTodayHoliday();
    if (todayHoliday) {
        return {
            active: true,
            holiday: todayHoliday,
            isToday: true,
            gradient: todayHoliday.gradient,
            themeColors: todayHoliday.themeColors,
            banner: `🎉 Hôm nay là ${todayHoliday.name}!`,
            wish: todayHoliday.wish,
        };
    }

    const nearby = getHolidaysWithinDays(3);
    if (nearby.length > 0) {
        const closest = nearby[0];
        return {
            active: true,
            holiday: closest,
            isToday: false,
            gradient: closest.gradient,
            themeColors: closest.themeColors,
            banner: `${closest.emoji} ${closest.name} — còn ${closest.daysUntil} ngày!`,
            wish: closest.wish,
        };
    }

    return { active: false };
}

// Get dynamic background gradient — changes when holiday is near
export function getDynamicGradient() {
    const theme = getActiveHolidayTheme();
    if (theme.active && theme.gradient) {
        // Blend holiday gradient with soft background
        return [theme.gradient[0] + '30', theme.gradient[1] + '20', GRADIENTS.background[2]];
    }
    return GRADIENTS.background;
}

// Get dynamic accent color — changes when holiday is near
export function getDynamicAccentColor() {
    const theme = getActiveHolidayTheme();
    if (theme.active && theme.themeColors?.length > 0) {
        return theme.themeColors[0];
    }
    return COLORS.primaryPink;
}

// Get holiday banner info for HomeScreen
export function getHolidayBanner() {
    const todayHoliday = getTodayHoliday();
    if (todayHoliday) {
        return {
            show: true,
            text: `🎉 Hôm nay là ${todayHoliday.name}!`,
            subtext: todayHoliday.wish,
            emoji: todayHoliday.emoji,
            colors: todayHoliday.gradient || GRADIENTS.pink,
            isToday: true,
        };
    }

    const upcoming = getHolidaysWithinDays(7);
    if (upcoming.length > 0) {
        const h = upcoming[0];
        return {
            show: true,
            text: `${h.emoji} ${h.name}`,
            subtext: `Còn ${h.daysUntil} ngày nữa!`,
            emoji: h.emoji,
            colors: h.gradient || GRADIENTS.pink,
            isToday: false,
            daysUntil: h.daysUntil,
        };
    }

    return { show: false };
}
