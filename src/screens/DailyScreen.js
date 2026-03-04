import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';
import { getTodayQuestion } from '../data/dailyQuestions';
import { saveDailyAnswer, listenToDailyAnswers, saveMood, listenToMoods, getUserRole } from '../firebase/firebaseService';

const { width } = Dimensions.get('window');
const MOODS = [
    { emoji: '😍', label: 'Yêu', color: '#e94971' },
    { emoji: '🥰', label: 'Hạnh phúc', color: '#FF6B9D' },
    { emoji: '😊', label: 'Vui', color: '#4ECDC4' },
    { emoji: '😐', label: 'Bình thường', color: '#FFB74D' },
    { emoji: '😢', label: 'Buồn', color: '#7986CB' },
];

export default function DailyScreen() {
    const [role, setRole] = useState('nhat');
    const [todayQ, setTodayQ] = useState(getTodayQuestion());
    const [myAnswer, setMyAnswer] = useState('');
    const [answers, setAnswers] = useState({});
    const [selectedMood, setSelectedMood] = useState(null);
    const [moodHistory, setMoodHistory] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        (async () => { const r = await getUserRole(); setRole(r || 'nhat'); })();
    }, []);

    useEffect(() => {
        const unsub1 = listenToDailyAnswers(todayQ.date, (data) => {
            setAnswers(data);
        });
        const unsub2 = listenToMoods((data) => setMoodHistory(data));
        return () => { unsub1(); unsub2(); };
    }, [role]);

    useEffect(() => { if (answers[role]) setSubmitted(true); }, [answers, role]);

    const submitAnswer = async () => {
        if (!myAnswer.trim()) return showAlert({ title: 'Oops!', message: 'Viết gì đó đi nào!', emoji: '💕', type: 'warning' });
        await saveDailyAnswer(todayQ.date, myAnswer.trim());
        setSubmitted(true);
    };

    const submitMood = async (moodIdx) => {
        setSelectedMood(moodIdx);
        await saveMood(todayQ.date, moodIdx);
    };

    const partnerRole = role === 'nhat' ? 'nhi' : 'nhat';
    const partnerAnswer = answers[partnerRole];
    const myData = answers[role];
    const bothAnswered = !!myData && !!partnerAnswer;

    // Get last 7 days moods
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
        const myM = moodHistory.find(m => m.date === dateStr && m.role === role);
        const pM = moodHistory.find(m => m.date === dateStr && m.role === partnerRole);
        last7.push({ date: dateStr, day: dayLabel, myMood: myM?.mood, partnerMood: pM?.mood });
    }

    // Current streak
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const hasEntry = moodHistory.some(m => m.date === dateStr && m.role === role);
        if (hasEntry) streak++; else break;
    }

    return (
        <View style={s.container}>
            <LinearGradient colors={['#fce4ec', '#f3e5f5', '#ede7f6']} style={s.bg}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                        <Animated.View style={{ opacity: fadeAnim }}>
                            {/* Header */}
                            <View style={s.header}>
                                <Text style={s.headerEmoji}>💬</Text>
                                <Text style={s.headerTitle}>Câu hỏi hôm nay</Text>
                                {streak > 0 && <View style={s.streakBadge}><Text style={s.streakText}>🔥 {streak} ngày liên tiếp</Text></View>}
                            </View>

                            {/* Question Card */}
                            <View style={s.qCard}>
                                <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']} style={s.qCardGrad}>
                                    <Text style={s.qText}>{todayQ.question}</Text>
                                </LinearGradient>
                            </View>

                            {/* Answer Input */}
                            {!submitted ? (
                                <View style={s.answerWrap}>
                                    <TextInput
                                        style={s.answerInput}
                                        placeholder="Viết câu trả lời của bạn..."
                                        placeholderTextColor="#bbb"
                                        value={myAnswer}
                                        onChangeText={setMyAnswer}
                                        multiline
                                        maxLength={500}
                                    />
                                    <TouchableOpacity style={s.sendBtn} onPress={submitAnswer}>
                                        <LinearGradient colors={GRADIENTS.pink} style={s.sendGrad}>
                                            <Ionicons name="send" size={18} color="#fff" />
                                            <Text style={s.sendText}>Gửi</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={s.answeredWrap}>
                                    <View style={s.myAnswerCard}>
                                        <Text style={s.answerLabel}>📝 Câu trả lời của bạn</Text>
                                        <Text style={s.answerText}>{myData?.answer}</Text>
                                    </View>

                                    {bothAnswered ? (
                                        <View style={[s.myAnswerCard, { borderLeftColor: '#e94971' }]}>
                                            <Text style={s.answerLabel}>💕 Câu trả lời của {partnerRole === 'nhi' ? 'Nhi' : 'Nhật'}</Text>
                                            <Text style={s.answerText}>{partnerAnswer.answer}</Text>
                                        </View>
                                    ) : (
                                        <View style={s.waitCard}>
                                            <Text style={{ fontSize: 20 }}>⏳</Text>
                                            <Text style={s.waitText}>Đợi {partnerRole === 'nhi' ? 'Nhi' : 'Nhật'} trả lời...</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Mood Section */}
                            <View style={s.moodSection}>
                                <Text style={s.moodTitle}>Hôm nay em cảm thấy thế nào?</Text>
                                <View style={s.moodRow}>
                                    {MOODS.map((m, i) => (
                                        <TouchableOpacity key={i} style={[s.moodBtn, selectedMood === i && { borderColor: m.color, backgroundColor: m.color + '15' }]} onPress={() => submitMood(i)}>
                                            <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                                            <Text style={[s.moodLabel, selectedMood === i && { color: m.color }]}>{m.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Mood History */}
                            <View style={s.histSection}>
                                <Text style={s.histTitle}>📊 Tâm trạng 7 ngày qua</Text>
                                <View style={s.histRow}>
                                    {last7.map((d, i) => (
                                        <View key={i} style={s.histDay}>
                                            <Text style={{ fontSize: 16 }}>{d.myMood != null ? MOODS[d.myMood]?.emoji : '·'}</Text>
                                            <Text style={{ fontSize: 16, marginTop: 4 }}>{d.partnerMood != null ? MOODS[d.partnerMood]?.emoji : '·'}</Text>
                                            <Text style={s.histDayLabel}>{d.day}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={s.histLegend}>
                                    <Text style={s.histLegendText}>👆 Bạn</Text>
                                    <Text style={s.histLegendText}>👇 Người yêu</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    bg: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },
    header: { alignItems: 'center', marginBottom: 20 },
    headerEmoji: { fontSize: 40 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginTop: 6 },
    streakBadge: { backgroundColor: '#fff3e0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
    streakText: { fontSize: 13, fontWeight: '700', color: '#e65100' },
    qCard: { borderRadius: 20, overflow: 'hidden', elevation: 4, marginBottom: 20 },
    qCardGrad: { padding: 28, alignItems: 'center' },
    qText: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, textAlign: 'center', lineHeight: 28 },
    answerWrap: { marginBottom: 20 },
    answerInput: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 16, fontSize: 15, color: COLORS.textDark, minHeight: 80, textAlignVertical: 'top', borderWidth: 1.5, borderColor: '#e0e0e0' },
    sendBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
    sendGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    sendText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
    answeredWrap: { gap: 12, marginBottom: 20 },
    myAnswerCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#7c4dff' },
    answerLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6 },
    answerText: { fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
    waitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 16 },
    waitText: { fontSize: 14, color: COLORS.textMuted, marginLeft: 10 },
    moodSection: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 20, marginBottom: 16 },
    moodTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, textAlign: 'center', marginBottom: 14 },
    moodRow: { flexDirection: 'row', justifyContent: 'space-around' },
    moodBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    moodLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, marginTop: 4 },
    histSection: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 20 },
    histTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginBottom: 14 },
    histRow: { flexDirection: 'row', justifyContent: 'space-around' },
    histDay: { alignItems: 'center' },
    histDayLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginTop: 4 },
    histLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
    histLegendText: { fontSize: 10, color: COLORS.textMuted },
});
