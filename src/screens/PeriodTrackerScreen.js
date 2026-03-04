import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Alert, Dimensions, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import {
    CYCLE_PHASES, SYMPTOMS, MOODS, FLOW_LEVELS, PHASE_TIPS,
    getCurrentCycleDay, getCurrentPhase, predictNextPeriod,
    getAverageCycleLength, getCyclePhaseProgress,
    savePeriodLog, getPeriodLogs, saveDailySymptoms, getDailySymptoms,
    getCycleSettings, saveCycleSettings, checkAbnormalities,
} from '../data/periodData';

const { width: SW } = Dimensions.get('window');
const RING_SIZE = SW * 0.55;

// =============================================
// SYMPTOM-BASED HEALTH ADVICE ENGINE
// =============================================
const SYMPTOM_ADVICE = {
    cramps: { emoji: '🩹', title: 'Đau bụng kinh', advice: 'Chườm ấm bụng dưới 15-20 phút, uống trà gừng hoặc trà hoa cúc, massage nhẹ vùng bụng theo chiều kim đồng hồ. Nếu đau dữ dội kéo dài hãy đi khám nhé.' },
    headache: { emoji: '🤕', title: 'Đau đầu', advice: 'Nghỉ ngơi ở nơi yên tĩnh, uống đủ nước (2-3 lít/ngày), tránh caffein. Massage thái dương nhẹ nhàng. Nếu kéo dài quá 3 ngày nên khám bác sĩ.' },
    bloating: { emoji: '😤', title: 'Đầy hơi', advice: 'Tránh thức ăn nhiều muối, đồ chiên, nước có ga. Ăn nhiều rau xanh, uống trà bạc hà. Đi bộ nhẹ nhàng 15 phút sau bữa ăn.' },
    breast_pain: { emoji: '😖', title: 'Đau ngực', advice: 'Mặc áo ngực thoải mái, chườm ấm hoặc lạnh. Giảm caffein và muối. Vitamin E và omega-3 có thể giúp giảm đau ngực theo chu kỳ.' },
    back_pain: { emoji: '🔙', title: 'Đau lưng', advice: 'Chườm ấm vùng lưng, tập yoga nhẹ (tư thế em bé, tư thế mèo-bò). Tránh ngồi lâu một chỗ, điều chỉnh tư thế khi ngồi.' },
    fatigue: { emoji: '😴', title: 'Mệt mỏi', advice: 'Ngủ đủ 7-8 tiếng, bổ sung sắt từ thịt đỏ, rau bina. Tránh hoạt động quá sức. Vitamin B12 có thể giúp giảm mệt mỏi.' },
    nausea: { emoji: '🤢', title: 'Buồn nôn', advice: 'Ăn ít nhiều bữa thay vì ăn nhiều một lúc. Uống trà gừng, ngậm kẹo bạc hà. Tránh thức ăn có mùi nặng. Nếu kéo dài hơn 3 ngày, hãy đi khám.' },
    insomnia: { emoji: '🌙', title: 'Khó ngủ', advice: 'Tắt điện thoại trước khi ngủ 1 tiếng, uống sữa ấm + mật ong, thử thiền hoặc hít thở sâu. Phòng ngủ nên tối và mát (22-24°C).' },
    acne: { emoji: '😫', title: 'Mụn', advice: 'Rửa mặt 2 lần/ngày với sữa rửa mặt dịu nhẹ, tránh sờ mặt. Uống nhiều nước, giảm đường và sữa. Dùng kem trị mụn có salicylic acid.' },
    mood_swings: { emoji: '🎭', title: 'Thay đổi tâm trạng', advice: 'Tập thể dục nhẹ (đi bộ, yoga), ăn thực phẩm giàu omega-3 (cá hồi, hạt óc chó). Trò chuyện với người thân, viết nhật ký cảm xúc.' },
    appetite: { emoji: '🍫', title: 'Thèm ăn', advice: 'Thay đồ ngọt bằng trái cây, socola đen (70%+). Ăn thực phẩm giàu magiê (chuối, hạnh nhân, bơ). Uống đủ nước để tránh nhầm khát với đói.' },
    dizziness: { emoji: '💫', title: 'Chóng mặt', advice: 'Đứng dậy từ từ, tránh thay đổi tư thế đột ngột. Bổ sung sắt và vitamin C. Nếu chóng mặt kèm mờ mắt hoặc ngất xỉu, hãy đi khám ngay.' },
};

// Get advice based on current symptoms + mood combination
function getSymptomAdvice(symptoms, mood, phase) {
    const advice = [];
    // Direct symptom matching
    symptoms.forEach(s => {
        if (SYMPTOM_ADVICE[s]) advice.push(SYMPTOM_ADVICE[s]);
    });
    // Mood-based advice
    if (mood === 'sad' || mood === 'anxious') {
        advice.push({ emoji: '💕', title: 'Tâm trạng xuống', advice: 'Anh hiểu em đang không vui. Hãy nghỉ ngơi, nghe nhạc yêu thích, hoặc gọi cho anh nhé! Tập thể dục nhẹ giúp tăng endorphin. 💕' });
    }
    if (mood === 'irritable') {
        advice.push({ emoji: '🧘', title: 'Dễ cáu gắt', advice: 'Thử hít thở sâu 4-7-8 (hít 4s, giữ 7s, thở 8s). Uống trà hoa cúc giúp thư giãn. Đây là phản ứng bình thường của cơ thể trong chu kỳ.' });
    }
    // Combination alerts
    if (symptoms.includes('cramps') && symptoms.includes('nausea') && symptoms.includes('dizziness')) {
        advice.unshift({ emoji: '⚠️', title: 'Nhiều triệu chứng cùng lúc', advice: 'Em có nhiều triệu chứng cùng lúc (đau bụng + buồn nôn + chóng mặt). Hãy nghỉ ngơi hoàn toàn, uống nước ấm. Nếu không đỡ sau 2 tiếng, nên đi khám bác sĩ.' });
    }
    if (symptoms.includes('fatigue') && symptoms.includes('dizziness')) {
        advice.unshift({ emoji: '🩸', title: 'Có thể thiếu máu', advice: 'Mệt mỏi kèm chóng mặt có thể là dấu hiệu thiếu máu do mất máu trong kỳ kinh. Bổ sung sắt: thịt bò, gan, rau bina, đậu lăng. Nên đi xét nghiệm công thức máu.' });
    }
    return advice;
}

export default function PeriodTrackerScreen() {
    const [cycleDay, setCycleDay] = useState(null);
    const [cycleLength, setCycleLength] = useState(28);
    const [periodLength, setPeriodLength] = useState(5);
    const [currentPhase, setCurrentPhase] = useState(CYCLE_PHASES.follicular);
    const [prediction, setPrediction] = useState(null);
    const [periodLogs, setPeriodLogs] = useState([]);
    const [todaySymptoms, setTodaySymptoms] = useState([]);
    const [todayMood, setTodayMood] = useState(null);
    const [todayFlow, setTodayFlow] = useState(null);
    const [todayNote, setTodayNote] = useState('');
    const [warnings, setWarnings] = useState([]);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [logTab, setLogTab] = useState('symptoms'); // symptoms | mood | flow | notes
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadData();
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])).start();
    }, []);

    const loadData = async () => {
        const settings = await getCycleSettings();
        setCycleLength(settings.cycleLength);
        setPeriodLength(settings.periodLength);
        const logs = await getPeriodLogs();
        setPeriodLogs(logs);
        if (logs.length > 0) {
            const latest = logs.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
            const day = getCurrentCycleDay(latest.startDate);
            setCycleDay(day);
            setCurrentPhase(getCurrentPhase(day, settings.cycleLength));
            setPrediction(predictNextPeriod(latest.startDate, settings.cycleLength));
            const avgLen = getAverageCycleLength(logs);
            setCycleLength(avgLen);
            setWarnings(checkAbnormalities(logs, latest));
        }
        const symptoms = await getDailySymptoms(new Date());
        if (symptoms) {
            setTodaySymptoms(symptoms.symptoms || []);
            setTodayMood(symptoms.mood);
            setTodayFlow(symptoms.flow);
            setTodayNote(symptoms.note || '');
        }
    };

    const handleStartPeriod = async () => {
        const log = { startDate: new Date().toISOString(), periodLength, flowLevel: 'medium' };
        await savePeriodLog(log);
        Alert.alert('💕', 'Đã ghi nhận ngày bắt đầu kinh nguyệt!');
        loadData();
    };

    const handleEndPeriod = async () => {
        const logs = await getPeriodLogs();
        if (logs.length > 0) {
            const latest = logs.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
            latest.endDate = new Date().toISOString();
            latest.periodDays = Math.ceil((new Date() - new Date(latest.startDate)) / (1000 * 60 * 60 * 24));
            await savePeriodLog(latest);
            Alert.alert('✅', 'Đã ghi nhận ngày kết thúc kinh nguyệt!');
            loadData();
        }
    };

    const toggleSymptom = async (symptomId) => {
        const ns = todaySymptoms.includes(symptomId) ? todaySymptoms.filter(s => s !== symptomId) : [...todaySymptoms, symptomId];
        setTodaySymptoms(ns);
        await saveDailySymptoms(new Date(), ns, todayMood, todayFlow, todayNote);
    };
    const selectMood = async (moodId) => { setTodayMood(moodId); await saveDailySymptoms(new Date(), todaySymptoms, moodId, todayFlow, todayNote); };
    const selectFlow = async (flowId) => { setTodayFlow(flowId); await saveDailySymptoms(new Date(), todaySymptoms, todayMood, flowId, todayNote); };
    const saveNote = async (text) => { setTodayNote(text); await saveDailySymptoms(new Date(), todaySymptoms, todayMood, todayFlow, text); };

    // Compute dynamic advice based on symptoms + mood
    const symptomAdvice = useMemo(() => {
        const phaseKey = Object.keys(CYCLE_PHASES).find(k => CYCLE_PHASES[k] === currentPhase) || 'follicular';
        return getSymptomAdvice(todaySymptoms, todayMood, phaseKey);
    }, [todaySymptoms, todayMood, currentPhase]);

    const phaseTips = PHASE_TIPS[Object.keys(CYCLE_PHASES).find(k => CYCLE_PHASES[k] === currentPhase)] || PHASE_TIPS.follicular;
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

    // Render cycle ring
    const renderCycleRing = () => {
        const phases = Object.values(CYCLE_PHASES);
        return (
            <View style={s.ringContainer}>
                <Animated.View style={[s.ringOuter, { transform: [{ scale: pulseScale }] }]}>
                    <View style={s.ringBg}>
                        {phases.map((phase, i) => {
                            const startAngle = (phase.dayRange[0] - 1) / cycleLength * 360;
                            return (
                                <View key={i} style={[s.ringSegment, {
                                    backgroundColor: phase.color,
                                    transform: [{ rotate: `${startAngle}deg` }],
                                    opacity: currentPhase === phase ? 1 : 0.4,
                                }]} />
                            );
                        })}
                    </View>
                    <View style={s.ringInner}>
                        <Text style={s.ringDayLabel}>NGÀY</Text>
                        <Text style={s.ringDayNum}>{cycleDay || '—'}</Text>
                        <Text style={s.ringCycleLabel}>/{cycleLength}</Text>
                        <View style={[s.phaseIndicator, { backgroundColor: currentPhase.bgColor || currentPhase.color + '20' }]}>
                            <Text style={[s.phaseIndicatorText, { color: currentPhase.color }]}>
                                {currentPhase.emoji} {currentPhase.name}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </View>
        );
    };

    // LOG MODAL TABS
    const LOG_TABS = [
        { key: 'symptoms', label: '🤒 Triệu chứng', color: '#E91E63' },
        { key: 'mood', label: '😊 Tâm trạng', color: '#9C27B0' },
        { key: 'flow', label: '💧 Lượng kinh', color: '#F44336' },
        { key: 'notes', label: '📝 Ghi chú', color: '#3F51B5' },
    ];

    const renderLogModalContent = () => {
        switch (logTab) {
            case 'symptoms':
                return (
                    <View>
                        <Text style={s.logSectionTitle}>Chọn triệu chứng hôm nay</Text>
                        <View style={s.symptomGrid}>
                            {SYMPTOMS.map(symptom => (
                                <TouchableOpacity key={symptom.id} onPress={() => toggleSymptom(symptom.id)}
                                    style={[s.symptomItem, todaySymptoms.includes(symptom.id) && s.symptomActive]}>
                                    <Text style={{ fontSize: 22 }}>{symptom.emoji}</Text>
                                    <Text style={[s.symptomLabel, todaySymptoms.includes(symptom.id) && s.symptomLabelActive]}>{symptom.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 'mood':
                return (
                    <View>
                        <Text style={s.logSectionTitle}>Tâm trạng hôm nay thế nào?</Text>
                        <View style={s.moodGrid}>
                            {MOODS.map(mood => (
                                <TouchableOpacity key={mood.id} onPress={() => selectMood(mood.id)}
                                    style={[s.moodGridItem, todayMood === mood.id && { backgroundColor: mood.color + '25', borderColor: mood.color }]}>
                                    <Text style={{ fontSize: 30 }}>{mood.emoji}</Text>
                                    <Text style={[s.moodGridLabel, todayMood === mood.id && { color: mood.color, fontWeight: '700' }]}>{mood.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 'flow':
                return (
                    <View>
                        <Text style={s.logSectionTitle}>Lượng kinh nguyệt</Text>
                        {FLOW_LEVELS.map(flow => (
                            <TouchableOpacity key={flow.id} onPress={() => selectFlow(flow.id)}
                                style={[s.flowListItem, todayFlow === flow.id && { backgroundColor: flow.color + '20', borderColor: flow.color }]}>
                                <View style={s.flowDropsRow}>
                                    {Array(flow.drops).fill(0).map((_, i) => <Text key={i} style={{ fontSize: 16 }}>💧</Text>)}
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[s.flowListLabel, todayFlow === flow.id && { color: flow.color, fontWeight: '700' }]}>{flow.label}</Text>
                                    <Text style={s.flowListDesc}>{flow.id === 'spotting' ? 'Chỉ lốm đốm' : flow.id === 'light' ? 'Ít, không ướt băng' : flow.id === 'medium' ? 'Bình thường' : flow.id === 'heavy' ? 'Nhiều, ướt nhanh' : 'Rất nhiều, cần thay thường xuyên'}</Text>
                                </View>
                                {todayFlow === flow.id && <Ionicons name="checkmark-circle" size={24} color={flow.color} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 'notes':
                return (
                    <View>
                        <Text style={s.logSectionTitle}>Ghi chú thêm</Text>
                        <TextInput
                            style={s.noteInput}
                            placeholder="Hôm nay em cảm thấy..."
                            placeholderTextColor="#bbb"
                            multiline
                            value={todayNote}
                            onChangeText={saveNote}
                            textAlignVertical="top"
                        />
                        <Text style={s.noteHint}>💕 Ghi lại bất kỳ điều gì em muốn nhớ</Text>
                    </View>
                );
        }
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={['#FFF0F5', '#F8F0FF', '#FFF5F8']} style={s.bg}>
                <Animated.ScrollView contentContainerStyle={s.scroll} style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <Text style={s.title}>Chu kỳ của Nhi</Text>
                            <Text style={s.subtitle}>Theo dõi sức khỏe hàng ngày 💕</Text>
                        </View>
                        <TouchableOpacity style={s.settingsBtn} onPress={() => setShowSettingsModal(true)}>
                            <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {renderCycleRing()}

                    {/* Phase Info Card */}
                    <LinearGradient colors={[currentPhase.color + '20', currentPhase.color + '08']} style={s.phaseCard}>
                        <View style={s.phaseCardHeader}>
                            <Text style={{ fontSize: 28 }}>{currentPhase.emoji}</Text>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={[s.phaseCardTitle, { color: currentPhase.color }]}>{currentPhase.name}</Text>
                                <Text style={s.phaseCardDesc}>{currentPhase.description}</Text>
                            </View>
                            {prediction && (
                                <View style={[s.predictionBadge, { backgroundColor: currentPhase.color + '20' }]}>
                                    <Text style={[s.predictionNum, { color: currentPhase.color }]}>{prediction.daysUntil}</Text>
                                    <Text style={[s.predictionLabel, { color: currentPhase.color }]}>ngày</Text>
                                </View>
                            )}
                        </View>
                        {prediction && (
                            <View style={s.predictionRow}>
                                <Ionicons name="calendar-outline" size={14} color={currentPhase.color} />
                                <Text style={[s.predictionText, { color: currentPhase.color }]}>Kỳ kinh tiếp theo: còn {prediction.daysUntil} ngày nữa</Text>
                            </View>
                        )}
                    </LinearGradient>

                    {/* Quick Actions */}
                    <View style={s.quickActions}>
                        <TouchableOpacity style={s.actionBtn} onPress={handleStartPeriod}>
                            <LinearGradient colors={['#E53935', '#FF5252']} style={s.actionBtnGrad}>
                                <Text style={{ fontSize: 20 }}>🔴</Text>
                                <Text style={s.actionBtnText}>Bắt đầu</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionBtn} onPress={handleEndPeriod}>
                            <LinearGradient colors={['#66BB6A', '#81C784']} style={s.actionBtnGrad}>
                                <Text style={{ fontSize: 20 }}>✅</Text>
                                <Text style={s.actionBtnText}>Kết thúc</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionBtn} onPress={() => setShowLogModal(true)}>
                            <LinearGradient colors={['#7B1FA2', '#AB47BC']} style={s.actionBtnGrad}>
                                <Text style={{ fontSize: 20 }}>📝</Text>
                                <Text style={s.actionBtnText}>Ghi chép</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* TODAY SUMMARY - quick view of logged data */}
                    {(todaySymptoms.length > 0 || todayMood || todayFlow) && (
                        <View style={[s.sectionCard, SHADOWS.soft]}>
                            <Text style={s.sectionTitle}>📋 Hôm nay đã ghi</Text>
                            {todayMood && <Text style={s.todaySummary}>
                                Tâm trạng: {MOODS.find(m => m.id === todayMood)?.emoji} {MOODS.find(m => m.id === todayMood)?.label}
                            </Text>}
                            {todayFlow && <Text style={s.todaySummary}>
                                Lượng kinh: {FLOW_LEVELS.find(f => f.id === todayFlow)?.label}
                            </Text>}
                            {todaySymptoms.length > 0 && <Text style={s.todaySummary}>
                                Triệu chứng: {todaySymptoms.map(s => SYMPTOMS.find(sy => sy.id === s)?.emoji).join(' ')}
                            </Text>}
                            {todayNote ? <Text style={s.todaySummary}>📝 {todayNote}</Text> : null}
                        </View>
                    )}

                    {/* SYMPTOM-BASED ADVICE — main feature */}
                    {symptomAdvice.length > 0 && (
                        <View style={[s.sectionCard, SHADOWS.soft, { borderColor: '#E91E63', borderWidth: 1.5 }]}>
                            <View style={s.tipsHeader}>
                                <Text style={{ fontSize: 20 }}>🩺</Text>
                                <Text style={[s.sectionTitle, { color: '#C2185B' }]}> Lời khuyên cho em</Text>
                            </View>
                            <Text style={s.adviceNote}>Dựa trên triệu chứng và tâm trạng hôm nay:</Text>
                            {symptomAdvice.map((adv, i) => (
                                <View key={i} style={s.adviceItem}>
                                    <View style={s.adviceHeader}>
                                        <Text style={{ fontSize: 18 }}>{adv.emoji}</Text>
                                        <Text style={s.adviceTitle}>{adv.title}</Text>
                                    </View>
                                    <Text style={s.adviceText}>{adv.advice}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Health Tips */}
                    <View style={[s.sectionCard, SHADOWS.soft]}>
                        <View style={s.tipsHeader}>
                            <Text style={{ fontSize: 20 }}>💝</Text>
                            <Text style={s.sectionTitle}> Mẹo sức khỏe</Text>
                        </View>
                        <Text style={s.tipsPhase}>Giai đoạn: {currentPhase.name}</Text>
                        {phaseTips.slice(0, 4).map((tip, i) => (
                            <View key={i} style={s.tipItem}>
                                <Text style={s.tipText}>{tip}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <View style={[s.warningCard, SHADOWS.soft]}>
                            <Text style={s.warningTitle}>⚠️ Lưu ý sức khỏe</Text>
                            {warnings.map((w, i) => (
                                <View key={i} style={s.warningItem}>
                                    <Text style={s.warningText}>{w.warning}</Text>
                                    <Text style={s.warningAdvice}>{w.advice}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Cycle History */}
                    <View style={[s.sectionCard, SHADOWS.soft]}>
                        <Text style={s.sectionTitle}>Lịch sử chu kỳ</Text>
                        {periodLogs.length === 0 ? (
                            <View style={s.emptyHistory}>
                                <Text style={{ fontSize: 40 }}>📅</Text>
                                <Text style={s.emptyText}>Chưa có dữ liệu{'\n'}Nhấn "Bắt đầu" để ghi nhận chu kỳ!</Text>
                            </View>
                        ) : (
                            periodLogs.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 6).map((log, i) => {
                                const start = new Date(log.startDate);
                                const days = log.periodDays || periodLength;
                                return (
                                    <View key={i} style={s.historyItem}>
                                        <View style={s.historyDot} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.historyDate}>{start.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                            <Text style={s.historyDays}>{days} ngày • {log.flowLevel || 'Chưa ghi'}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    <View style={[s.infoCard, SHADOWS.soft]}>
                        <Text style={{ fontSize: 16 }}>💡</Text>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.infoTitle}>Anh luôn ở đây</Text>
                            <Text style={s.infoText}>Theo dõi sức khỏe em để anh hiểu và chăm sóc em tốt hơn 💕</Text>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </Animated.ScrollView>
            </LinearGradient>

            {/* ========= GHI CHÉP LOG MODAL ========= */}
            <Modal visible={showLogModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, SHADOWS.card, { maxHeight: '85%' }]}>
                        <View style={s.logModalHeader}>
                            <Text style={s.modalTitle}>📝 Ghi chép hôm nay</Text>
                            <TouchableOpacity onPress={() => setShowLogModal(false)}>
                                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Tab Bar */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.logTabBar}>
                            {LOG_TABS.map(tab => (
                                <TouchableOpacity key={tab.key} onPress={() => setLogTab(tab.key)}
                                    style={[s.logTab, logTab === tab.key && { backgroundColor: tab.color + '15', borderColor: tab.color }]}>
                                    <Text style={[s.logTabText, logTab === tab.key && { color: tab.color, fontWeight: '700' }]}>{tab.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {renderLogModalContent()}
                        </ScrollView>

                        <TouchableOpacity style={s.modalClose} onPress={() => { setShowLogModal(false); Alert.alert('✅', 'Đã lưu ghi chép!'); }}>
                            <LinearGradient colors={GRADIENTS.pink} style={s.modalCloseGrad}>
                                <Text style={s.modalCloseText}>Lưu & Đóng</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal visible={showSettingsModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, SHADOWS.card]}>
                        <Text style={s.modalTitle}>⚙️ Cài đặt chu kỳ</Text>
                        <View style={s.settingRow}>
                            <Text style={s.settingLabel}>Độ dài chu kỳ</Text>
                            <View style={s.stepper}>
                                <TouchableOpacity onPress={() => { const v = Math.max(21, cycleLength - 1); setCycleLength(v); saveCycleSettings({ cycleLength: v, periodLength }); }}>
                                    <Ionicons name="remove-circle" size={32} color={COLORS.primaryPink} />
                                </TouchableOpacity>
                                <Text style={s.stepperVal}>{cycleLength}</Text>
                                <TouchableOpacity onPress={() => { const v = Math.min(40, cycleLength + 1); setCycleLength(v); saveCycleSettings({ cycleLength: v, periodLength }); }}>
                                    <Ionicons name="add-circle" size={32} color={COLORS.primaryPink} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={s.settingRow}>
                            <Text style={s.settingLabel}>Số ngày kinh nguyệt</Text>
                            <View style={s.stepper}>
                                <TouchableOpacity onPress={() => { const v = Math.max(2, periodLength - 1); setPeriodLength(v); saveCycleSettings({ cycleLength, periodLength: v }); }}>
                                    <Ionicons name="remove-circle" size={32} color={COLORS.primaryPink} />
                                </TouchableOpacity>
                                <Text style={s.stepperVal}>{periodLength}</Text>
                                <TouchableOpacity onPress={() => { const v = Math.min(10, periodLength + 1); setPeriodLength(v); saveCycleSettings({ cycleLength, periodLength: v }); }}>
                                    <Ionicons name="add-circle" size={32} color={COLORS.primaryPink} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity style={s.modalClose} onPress={() => setShowSettingsModal(false)}>
                            <LinearGradient colors={GRADIENTS.pink} style={s.modalCloseGrad}>
                                <Text style={s.modalCloseText}>Xong</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 }, scroll: { paddingBottom: 40 },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#2d1b3d' },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft },

    ringContainer: { alignItems: 'center', paddingVertical: 20 },
    ringOuter: { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
    ringBg: { position: 'absolute', width: '100%', height: '100%', borderRadius: RING_SIZE / 2, overflow: 'hidden' },
    ringSegment: { position: 'absolute', width: '50%', height: 6, top: '50%', left: '50%', transformOrigin: 'left center' },
    ringInner: { width: RING_SIZE - 40, height: RING_SIZE - 40, borderRadius: (RING_SIZE - 40) / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft },
    ringDayLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '600' },
    ringDayNum: { fontSize: 48, fontWeight: '900', color: '#2d1b3d', marginTop: -2 },
    ringCycleLabel: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600', marginTop: -4 },
    phaseIndicator: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
    phaseIndicatorText: { fontSize: 12, fontWeight: '700' },

    phaseCard: { marginHorizontal: 20, borderRadius: 20, padding: 16, marginBottom: 14 },
    phaseCardHeader: { flexDirection: 'row', alignItems: 'center' },
    phaseCardTitle: { fontSize: 17, fontWeight: '800' },
    phaseCardDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    predictionBadge: { alignItems: 'center', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
    predictionNum: { fontSize: 22, fontWeight: '900' }, predictionLabel: { fontSize: 10 },
    predictionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
    predictionText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },

    quickActions: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 14 },
    actionBtn: { flex: 1, marginHorizontal: 4, borderRadius: 16, overflow: 'hidden' },
    actionBtnGrad: { padding: 14, alignItems: 'center', borderRadius: 16 },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, marginTop: 4 },

    sectionCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, backgroundColor: '#fff', padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d1b3d', marginBottom: 10 },
    todaySummary: { fontSize: 13, color: '#555', marginBottom: 4, lineHeight: 20 },

    // Symptom advice
    adviceNote: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10, fontStyle: 'italic' },
    adviceItem: { marginBottom: 12, backgroundColor: '#FFF0F5', borderRadius: 14, padding: 12, borderLeftWidth: 3, borderLeftColor: '#E91E63' },
    adviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    adviceTitle: { fontSize: 14, fontWeight: '700', color: '#C2185B', marginLeft: 8 },
    adviceText: { fontSize: 12, color: '#555', lineHeight: 19 },

    // Mood & Symptoms
    moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    moodGridItem: { alignItems: 'center', width: '22%', paddingVertical: 12, margin: '1.5%', borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: '#F8F4FF' },
    moodGridLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
    symptomGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    symptomItem: { width: '23%', alignItems: 'center', paddingVertical: 10, marginBottom: 8, marginHorizontal: '1%', borderRadius: 14, backgroundColor: '#F8F4FF', borderWidth: 1.5, borderColor: 'transparent' },
    symptomActive: { backgroundColor: '#FFE0EB', borderColor: COLORS.primaryPink },
    symptomLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
    symptomLabelActive: { color: COLORS.primaryPink, fontWeight: '700' },

    // Flow list
    flowListItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: 'transparent' },
    flowDropsRow: { flexDirection: 'row', width: 50 },
    flowListLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
    flowListDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

    // Notes
    noteInput: { backgroundColor: '#F8F4FF', borderRadius: 16, padding: 16, fontSize: 14, minHeight: 120, color: '#333', borderWidth: 1, borderColor: '#E8E0F0' },
    noteHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },

    // Tips
    tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    tipsPhase: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
    tipItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    tipText: { fontSize: 13, color: '#2d1b3d', lineHeight: 20 },

    warningCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, backgroundColor: '#FFF3E0', padding: 16, borderWidth: 1, borderColor: '#FFE0B2' },
    warningTitle: { fontSize: 16, fontWeight: '700', color: '#E65100', marginBottom: 10 },
    warningItem: { marginBottom: 10 },
    warningText: { fontSize: 14, fontWeight: '600', color: '#E65100' },
    warningAdvice: { fontSize: 12, color: '#BF360C', marginTop: 4, lineHeight: 18 },

    emptyHistory: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935', marginRight: 12 },
    historyDate: { fontSize: 14, fontWeight: '600', color: '#2d1b3d' },
    historyDays: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

    infoCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, backgroundColor: '#F3E5F5', padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E1BEE7' },
    infoTitle: { fontSize: 14, fontWeight: '700', color: '#4A148C' },
    infoText: { fontSize: 12, color: '#7B1FA2', marginTop: 2 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
    logModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#2d1b3d' },
    logTabBar: { marginBottom: 14, maxHeight: 44 },
    logTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5' },
    logTabText: { fontSize: 12, color: COLORS.textMuted },
    logSectionTitle: { fontSize: 15, fontWeight: '700', color: '#2d1b3d', marginBottom: 12 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    settingLabel: { fontSize: 15, fontWeight: '600', color: '#2d1b3d' },
    stepper: { flexDirection: 'row', alignItems: 'center' },
    stepperVal: { fontSize: 22, fontWeight: '800', color: COLORS.primaryPink, marginHorizontal: 16 },
    modalClose: { borderRadius: 16, overflow: 'hidden', marginTop: 10 },
    modalCloseGrad: { padding: 14, alignItems: 'center' },
    modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
