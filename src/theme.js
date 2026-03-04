// Theme inspired by Love8 app - Soft pastel glassmorphism
export const COLORS = {
    // Gradient backgrounds
    gradientStart: '#fce4ec',
    gradientMid: '#f3e5f5',
    gradientEnd: '#e8eaf6',

    // Primary
    primaryPink: '#e94971',
    primaryPinkLight: '#f48fb1',
    primaryPinkSoft: '#fce4ec',

    // Accent
    accentPurple: '#ce93d8',
    accentLavender: '#b39ddb',
    accentBlue: '#90caf9',

    // Cards (glassmorphism)
    cardWhite: 'rgba(255, 255, 255, 0.85)',
    cardWhiteSoft: 'rgba(255, 255, 255, 0.6)',
    cardPink: 'rgba(233, 73, 113, 0.08)',
    cardPinkSoft: 'rgba(248, 187, 208, 0.3)',

    // Text
    textDark: '#2d1b3d',
    textMedium: '#5c4573',
    textMuted: '#9e8aad',
    textLight: 'rgba(255, 255, 255, 0.9)',

    // Status
    online: '#66bb6a',
    gold: '#ffd54f',
    danger: '#ef5350',

    // Borders
    borderLight: 'rgba(255, 255, 255, 0.5)',
    borderPink: 'rgba(233, 73, 113, 0.15)',
};

export const GRADIENTS = {
    background: ['#fce4ec', '#f3e5f5', '#e8eaf6'],
    backgroundAlt: ['#fce4ec', '#f8bbd0', '#f3e5f5'],
    pink: ['#e94971', '#f06292'],
    pinkSoft: ['#f48fb1', '#ce93d8'],
    purple: ['#ce93d8', '#b39ddb'],
    card: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'],
    gold: ['#ffd54f', '#ffb74d'],
};

export const SPACING = {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const FONT_SIZES = {
    xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, hero: 56,
};

export const BORDER_RADIUS = {
    sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 100,
};

export const SHADOWS = {
    card: {
        shadowColor: 'rgba(233, 73, 113, 0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 6,
    },
    soft: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
};
