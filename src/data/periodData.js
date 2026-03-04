// Period/Menstrual Cycle Tracker Data & Logic
// For tracking Nhi's menstrual cycle with predictions, symptoms, and health advice

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============ CYCLE PHASES ============
export const CYCLE_PHASES = {
    menstruation: {
        name: 'Kinh nguyệt',
        emoji: '🔴',
        color: '#E53935',
        bgColor: '#FFCDD2',
        description: 'Giai đoạn kinh nguyệt',
        dayRange: [1, 5], // typical days 1-5
    },
    follicular: {
        name: 'Nang trứng',
        emoji: '🌸',
        color: '#EC407A',
        bgColor: '#F8BBD0',
        description: 'Cơ thể chuẩn bị rụng trứng',
        dayRange: [6, 13],
    },
    ovulation: {
        name: 'Rụng trứng',
        emoji: '💜',
        color: '#7B1FA2',
        bgColor: '#E1BEE7',
        description: 'Giai đoạn rụng trứng',
        dayRange: [14, 16],
    },
    luteal: {
        name: 'Hoàng thể',
        emoji: '💙',
        color: '#1565C0',
        bgColor: '#BBDEFB',
        description: 'Sau rụng trứng, trước kỳ kinh tiếp theo',
        dayRange: [17, 28],
    },
};

// ============ SYMPTOMS ============
export const SYMPTOMS = [
    { id: 'cramps', emoji: '😣', label: 'Đau bụng', category: 'pain' },
    { id: 'headache', emoji: '🤕', label: 'Đau đầu', category: 'pain' },
    { id: 'backpain', emoji: '😩', label: 'Đau lưng', category: 'pain' },
    { id: 'bloating', emoji: '🫃', label: 'Đầy hơi', category: 'physical' },
    { id: 'fatigue', emoji: '😴', label: 'Mệt mỏi', category: 'physical' },
    { id: 'acne', emoji: '😖', label: 'Mụn', category: 'physical' },
    { id: 'breast_tender', emoji: '🩹', label: 'Ngực căng', category: 'physical' },
    { id: 'nausea', emoji: '🤢', label: 'Buồn nôn', category: 'physical' },
    { id: 'cravings', emoji: '🍫', label: 'Thèm ăn', category: 'other' },
    { id: 'insomnia', emoji: '🌙', label: 'Mất ngủ', category: 'other' },
    { id: 'dizziness', emoji: '😵', label: 'Chóng mặt', category: 'other' },
    { id: 'hot_flash', emoji: '🥵', label: 'Nóng bừng', category: 'other' },
];

// ============ MOODS ============
export const MOODS = [
    { id: 'happy', emoji: '😊', label: 'Vui vẻ', color: '#66BB6A' },
    { id: 'calm', emoji: '😌', label: 'Bình tĩnh', color: '#42A5F5' },
    { id: 'loving', emoji: '🥰', label: 'Yêu đời', color: '#EC407A' },
    { id: 'energetic', emoji: '💪', label: 'Năng động', color: '#FFA726' },
    { id: 'sad', emoji: '😢', label: 'Buồn', color: '#78909C' },
    { id: 'anxious', emoji: '😰', label: 'Lo lắng', color: '#AB47BC' },
    { id: 'irritable', emoji: '😤', label: 'Cáu gắt', color: '#EF5350' },
    { id: 'tired', emoji: '😞', label: 'Mệt', color: '#8D6E63' },
    { id: 'sensitive', emoji: '🥺', label: 'Nhạy cảm', color: '#F48FB1' },
    { id: 'confident', emoji: '😎', label: 'Tự tin', color: '#26A69A' },
];

// ============ FLOW LEVELS ============
export const FLOW_LEVELS = [
    { id: 'spotting', label: 'Lốm đốm', emoji: '💧', drops: 1, color: '#FFCDD2' },
    { id: 'light', label: 'Nhẹ', emoji: '💧💧', drops: 2, color: '#EF9A9A' },
    { id: 'medium', label: 'Trung bình', emoji: '💧💧💧', drops: 3, color: '#E57373' },
    { id: 'heavy', label: 'Nhiều', emoji: '💧💧💧💧', drops: 4, color: '#EF5350' },
    { id: 'very_heavy', label: 'Rất nhiều', emoji: '💧💧💧💧💧', drops: 5, color: '#E53935' },
];

// ============ HEALTH TIPS PER PHASE ============
export const PHASE_TIPS = {
    menstruation: [
        '🩸 Uống nhiều nước ấm và trà gừng giúp giảm đau bụng',
        '🛀 Chườm ấm bụng dưới giúp giãn cơ, giảm co thắt',
        '🍌 Ăn thực phẩm giàu kali như chuối, bơ để giảm chuột rút',
        '😴 Ngủ đủ giấc 7-8 tiếng, tránh thức khuya',
        '🧘 Yoga nhẹ nhàng giúp lưu thông máu và giảm đau',
        '🍫 Ăn sô-cô-la đen giúp cải thiện tâm trạng',
        '❌ Tránh caffeine và đồ ăn cay, lạnh',
        '💊 Uống bổ sung sắt nếu ra máu nhiều',
    ],
    follicular: [
        '🏃 Thời điểm tốt để tập thể dục cường độ cao',
        '🥗 Ăn nhiều rau xanh và protein để bổ sung năng lượng',
        '✨ Estrogen tăng → da đẹp hơn, tâm trạng tốt hơn!',
        '📚 Thời gian tập trung tốt nhất để học tập, làm việc',
        '💪 Năng lượng dồi dào - hãy tận dụng!',
        '🥑 Ăn thực phẩm giàu omega-3 (cá hồi, quả óc chó)',
    ],
    ovulation: [
        '💜 Đây là giai đoạn năng lượng và sức hấp dẫn cao nhất',
        '🌡️ Nhiệt độ cơ thể có thể tăng nhẹ',
        '💧 Dịch nhầy trong và co giãn hơn bình thường',
        '🏋️ Tiếp tục duy trì tập luyện cường độ cao',
        '🥰 Tâm trạng và ham muốn có thể tăng cao',
        '🍇 Ăn thực phẩm giàu chất chống oxy hóa',
    ],
    luteal: [
        '😌 Giảm cường độ tập luyện, chuyển sang yoga/đi bộ',
        '🍠 Ăn carbohydrate phức hợp (khoai lang, yến mạch)',
        '🫖 Uống trà hoa cúc giúp thư giãn và ngủ ngon',
        '⚠️ PMS có thể xảy ra: đau ngực, thay đổi tâm trạng',
        '🧴 Chăm sóc da kỹ hơn vì progesterone tăng gây mụn',
        '💆 Massage nhẹ nhàng giúp giảm stress',
        '🍫 Thèm ngọt là bình thường - hãy ăn vừa đủ',
    ],
};

// ============ ABNORMALITY WARNINGS ============
export const ABNORMALITY_CHECKS = [
    {
        id: 'short_cycle',
        check: (cycleLength) => cycleLength < 21,
        warning: '⚠️ Chu kỳ ngắn hơn 21 ngày',
        advice: 'Chu kỳ dưới 21 ngày có thể do stress, thay đổi cân nặng, hoặc vấn đề nội tiết. Nên theo dõi thêm 2-3 tháng và tham khảo bác sĩ nếu tiếp tục.',
        severity: 'warning',
    },
    {
        id: 'long_cycle',
        check: (cycleLength) => cycleLength > 35,
        warning: '⚠️ Chu kỳ dài hơn 35 ngày',
        advice: 'Chu kỳ trên 35 ngày có thể liên quan đến PCOS, stress, hoặc vấn đề tuyến giáp. Nên đi khám phụ khoa nếu kéo dài.',
        severity: 'warning',
    },
    {
        id: 'irregular',
        check: (cycles) => {
            if (cycles.length < 3) return false;
            const lengths = cycles.map(c => c.cycleLength);
            const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            return lengths.some(l => Math.abs(l - avg) > 7);
        },
        warning: '⚠️ Chu kỳ không đều',
        advice: 'Dao động hơn 7 ngày giữa các chu kỳ có thể do stress, thay đổi lối sống. Hãy duy trì lịch sinh hoạt đều đặn.',
        severity: 'info',
    },
    {
        id: 'heavy_flow',
        check: (_, log) => log && log.flowLevel === 'very_heavy' && log.flowDays > 3,
        warning: '🩸 Ra máu nhiều kéo dài',
        advice: 'Ra máu nhiều hơn 3 ngày liên tục có thể gây thiếu máu. Bổ sung sắt và vitamin C, uống nhiều nước.',
        severity: 'warning',
    },
    {
        id: 'long_period',
        check: (_, log) => log && log.periodDays > 7,
        warning: '⚠️ Kinh nguyệt kéo dài hơn 7 ngày',
        advice: 'Thời gian kinh nguyệt trên 7 ngày nên được kiểm tra. Có thể do polyp tử cung, u xơ, hoặc rối loạn đông máu.',
        severity: 'caution',
    },
];

// ============ STORAGE KEYS ============
const STORAGE_KEYS = {
    PERIOD_LOGS: '@period_logs',
    CYCLE_SETTINGS: '@cycle_settings',
    SYMPTOMS_LOG: '@symptoms_log',
};

// ============ CYCLE CALCULATIONS ============

export function getCurrentCycleDay(lastPeriodStart, today = new Date()) {
    if (!lastPeriodStart) return null;
    const start = new Date(lastPeriodStart);
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    return diff + 1; // Day 1 is the first day of period
}

export function getCurrentPhase(cycleDay, cycleLength = 28) {
    if (!cycleDay) return CYCLE_PHASES.follicular;
    const ratio = cycleDay / cycleLength;
    if (cycleDay <= 5) return CYCLE_PHASES.menstruation;
    if (ratio <= 0.46) return CYCLE_PHASES.follicular;
    if (ratio <= 0.57) return CYCLE_PHASES.ovulation;
    return CYCLE_PHASES.luteal;
}

export function predictNextPeriod(lastPeriodStart, cycleLength = 28) {
    if (!lastPeriodStart) return null;
    const next = new Date(lastPeriodStart);
    next.setDate(next.getDate() + cycleLength);
    const today = new Date();
    const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    return { date: next, daysUntil: Math.max(0, daysUntil) };
}

export function getAverageCycleLength(periodLogs) {
    if (!periodLogs || periodLogs.length < 2) return 28;
    const sorted = [...periodLogs].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
        const diff = Math.floor((new Date(sorted[i].startDate) - new Date(sorted[i - 1].startDate)) / (1000 * 60 * 60 * 24));
        if (diff > 15 && diff < 50) gaps.push(diff);
    }
    return gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
}

export function getCyclePhaseProgress(cycleDay, cycleLength = 28) {
    if (!cycleDay) return 0;
    return Math.min(1, cycleDay / cycleLength);
}

// ============ LOCAL STORAGE FUNCTIONS ============

export async function savePeriodLog(log) {
    try {
        const existing = await getPeriodLogs();
        const idx = existing.findIndex(l => l.id === log.id);
        if (idx >= 0) existing[idx] = log;
        else existing.push({ ...log, id: Date.now().toString() });
        await AsyncStorage.setItem(STORAGE_KEYS.PERIOD_LOGS, JSON.stringify(existing));
        return true;
    } catch (e) { console.error('Save period log error:', e); return false; }
}

export async function getPeriodLogs() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.PERIOD_LOGS);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

export async function saveDailySymptoms(date, symptoms, mood, flow, notes) {
    try {
        const key = STORAGE_KEYS.SYMPTOMS_LOG;
        const existing = JSON.parse(await AsyncStorage.getItem(key) || '{}');
        const dateStr = date.toISOString().split('T')[0];
        existing[dateStr] = { symptoms, mood, flow, notes, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(key, JSON.stringify(existing));
        return true;
    } catch (e) { console.error('Save symptoms error:', e); return false; }
}

export async function getDailySymptoms(date) {
    try {
        const data = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.SYMPTOMS_LOG) || '{}');
        const dateStr = date.toISOString().split('T')[0];
        return data[dateStr] || null;
    } catch (e) { return null; }
}

export async function getCycleSettings() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CYCLE_SETTINGS);
        return data ? JSON.parse(data) : { cycleLength: 28, periodLength: 5 };
    } catch (e) { return { cycleLength: 28, periodLength: 5 }; }
}

export async function saveCycleSettings(settings) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.CYCLE_SETTINGS, JSON.stringify(settings));
    } catch (e) { console.error('Save settings error:', e); }
}

export function checkAbnormalities(periodLogs, latestLog) {
    const warnings = [];
    const cycleLength = getAverageCycleLength(periodLogs);
    for (const check of ABNORMALITY_CHECKS) {
        try {
            if (check.id === 'irregular') {
                if (check.check(periodLogs)) warnings.push(check);
            } else if (check.id === 'heavy_flow' || check.id === 'long_period') {
                if (check.check(cycleLength, latestLog)) warnings.push(check);
            } else {
                if (check.check(cycleLength)) warnings.push(check);
            }
        } catch (e) { /* skip */ }
    }
    return warnings;
}
