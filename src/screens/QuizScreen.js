import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, ScrollView, ActivityIndicator, Modal, TextInput
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';
import { QUIZ_QUESTIONS, QUIZ_CATEGORIES } from '../data/quizData';
import {
    saveQuizAnswers, listenToQuizAnswers, computeQuizResults,
    getUserRole, isPaired, saveCustomQuizQuestion, listenToCustomQuizQuestions
} from '../firebase/firebaseService';

const { width } = Dimensions.get('window');

export default function QuizScreen() {
    const [role, setRole] = useState('nhat');
    const [paired, setPaired] = useState(false);
    const [loading, setLoading] = useState(true);

    // Quiz state
    const [phase, setPhase] = useState('menu'); // menu | self | guess | waiting | results
    const [currentQ, setCurrentQ] = useState(0);
    const [selfAnswers, setSelfAnswers] = useState({});
    const [guessAnswers, setGuessAnswers] = useState({});
    const [quizData, setQuizData] = useState({});
    const [results, setResults] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Custom quiz state
    const [showCreateQ, setShowCreateQ] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');
    const [customOptions, setCustomOptions] = useState(['', '', '', '']);
    const [customQuestions, setCustomQuestions] = useState([]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();

        (async () => {
            const p = await isPaired();
            const r = await getUserRole();
            setPaired(p);
            setRole(r || 'nhat');
            setLoading(false);
        })();

        const unsub = listenToQuizAnswers((data) => {
            setQuizData(data);
        });
        const unsub2 = listenToCustomQuizQuestions((data) => setCustomQuestions(data));

        return () => { if (unsub) unsub(); if (unsub2) unsub2(); };
    }, []);

    // Compute results when quiz data changes
    useEffect(() => {
        if (quizData && role) {
            const r = computeQuizResults(quizData, role);
            if (r) setResults(r);
        }
    }, [quizData, role]);

    // Animate progress bar
    useEffect(() => {
        const total = QUIZ_QUESTIONS.length;
        const progress = currentQ / total;
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [currentQ]);

    const questions = QUIZ_QUESTIONS;

    const selectAnswer = (answerIdx) => {
        const qId = questions[currentQ].id;

        if (phase === 'self') {
            setSelfAnswers(prev => ({ ...prev, [qId]: answerIdx }));
        } else if (phase === 'guess') {
            setGuessAnswers(prev => ({ ...prev, [qId]: answerIdx }));
        }

        // Auto advance after short delay
        setTimeout(() => {
            if (currentQ < questions.length - 1) {
                setCurrentQ(currentQ + 1);
            } else {
                // Finished this phase
                if (phase === 'self') {
                    setPhase('guess');
                    setCurrentQ(0);
                } else if (phase === 'guess') {
                    // Save and go to waiting/results
                    handleSubmit();
                }
            }
        }, 400);
    };

    const handleSubmit = async () => {
        try {
            const finalSelf = { ...selfAnswers, [questions[currentQ].id]: guessAnswers[questions[currentQ].id] !== undefined ? guessAnswers[questions[currentQ].id] : undefined };
            await saveQuizAnswers(selfAnswers, guessAnswers);
            setPhase('waiting');
        } catch (e) {
            showAlert({ title: 'Lỗi', message: 'Không lưu được. Thử lại!', type: 'error' });
        }
    };

    const startQuiz = () => {
        setSelfAnswers({});
        setGuessAnswers({});
        setCurrentQ(0);
        setPhase('self');
    };

    const handleCreateQ = async () => {
        if (!customQuestion.trim()) return showAlert({ title: 'Oops!', message: 'Nhập câu hỏi!', type: 'warning' });
        const validOpts = customOptions.filter(o => o.trim());
        if (validOpts.length < 2) return showAlert({ title: 'Oops!', message: 'Cần ít nhất 2 lựa chọn!', type: 'warning' });
        await saveCustomQuizQuestion({
            selfQuestion: customQuestion.trim(),
            guessQuestion: customQuestion.trim().replace('bạn', 'người yêu bạn'),
            options: validOpts.map(o => o.trim()),
            category: 'custom',
        });
        setCustomQuestion('');
        setCustomOptions(['', '', '', '']);
        setShowCreateQ(false);
        showAlert({ title: 'Tạo xong!', message: 'Đã tạo câu hỏi mới!', emoji: '🎉', type: 'success' });
    };

    const myData = quizData[role];
    const partnerRole = role === 'nhat' ? 'nhi' : 'nhat';
    const partnerData = quizData[partnerRole];
    const iCompleted = !!myData?.completedAt;
    const partnerCompleted = !!partnerData?.completedAt;
    const bothCompleted = iCompleted && partnerCompleted;

    if (loading) {
        return (
            <View style={s.container}>
                <LinearGradient colors={['#fce4ec', '#f3e5f5', '#e8eaf6']} style={s.bg}>
                    <ActivityIndicator size="large" color={COLORS.primaryPink} />
                </LinearGradient>
            </View>
        );
    }

    // ===== RESULTS SCREEN =====
    if ((phase === 'waiting' || phase === 'results' || phase === 'menu') && bothCompleted && results) {
        const scoreColor = results.overallScore >= 80 ? '#4CAF50' : results.overallScore >= 50 ? '#FF9800' : '#ef5350';
        const scoreEmoji = results.overallScore >= 80 ? '💯' : results.overallScore >= 50 ? '💕' : '💔';
        const scoreLabel = results.overallScore >= 80 ? 'Hiểu nhau tuyệt vời!' : results.overallScore >= 50 ? 'Khá hiểu nhau!' : 'Cần tìm hiểu thêm!';

        return (
            <View style={s.container}>
                <LinearGradient colors={['#fce4ec', '#f3e5f5', '#e8eaf6']} style={s.bg}>
                    <ScrollView contentContainerStyle={s.scrollContent}>
                        {/* Header */}
                        <View style={s.resultHeader}>
                            <Text style={s.resultEmoji}>{scoreEmoji}</Text>
                            <Text style={s.resultTitle}>Kết quả Quiz</Text>
                            <Text style={s.resultSubtitle}>Các bạn hiểu nhau đến đâu?</Text>
                        </View>

                        {/* Overall Score */}
                        <View style={s.scoreCard}>
                            <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']} style={s.scoreCardGrad}>
                                <Text style={[s.scoreNumber, { color: scoreColor }]}>{results.overallScore}%</Text>
                                <Text style={s.scoreLabel}>{scoreLabel}</Text>
                                <View style={s.scoreBar}>
                                    <View style={[s.scoreBarFill, { width: `${results.overallScore}%`, backgroundColor: scoreColor }]} />
                                </View>
                            </LinearGradient>
                        </View>

                        {/* Individual Scores */}
                        <View style={s.individualRow}>
                            <View style={s.individualCard}>
                                <Text style={s.individualEmoji}>{role === 'nhat' ? '👦' : '👧'}</Text>
                                <Text style={s.individualName}>{role === 'nhat' ? 'Nhật' : 'Nhi'}</Text>
                                <Text style={[s.individualScore, { color: '#7c4dff' }]}>{results.myScore}%</Text>
                                <Text style={s.individualLabel}>hiểu {partnerRole === 'nhi' ? 'Nhi' : 'Nhật'}</Text>
                                <Text style={s.individualDetail}>{results.myCorrect}/{results.totalQ} đúng</Text>
                            </View>
                            <View style={s.vsCircle}>
                                <Text style={s.vsText}>VS</Text>
                            </View>
                            <View style={s.individualCard}>
                                <Text style={s.individualEmoji}>{partnerRole === 'nhi' ? '👧' : '👦'}</Text>
                                <Text style={s.individualName}>{partnerRole === 'nhi' ? 'Nhi' : 'Nhật'}</Text>
                                <Text style={[s.individualScore, { color: '#e94971' }]}>{results.partnerScore}%</Text>
                                <Text style={s.individualLabel}>hiểu {role === 'nhat' ? 'Nhật' : 'Nhi'}</Text>
                                <Text style={s.individualDetail}>{results.partnerCorrect}/{results.partnerTotalQ} đúng</Text>
                            </View>
                        </View>

                        {/* Category breakdown */}
                        <View style={s.categorySection}>
                            <Text style={s.categorySectionTitle}>📊 Chi tiết theo danh mục</Text>
                            {QUIZ_CATEGORIES.map(cat => {
                                const catQs = QUIZ_QUESTIONS.filter(q => q.category === cat.key);
                                let catCorrect = 0;
                                let catTotal = 0;
                                catQs.forEach(q => {
                                    if (results.myResults[q.id]) {
                                        catTotal++;
                                        if (results.myResults[q.id].correct) catCorrect++;
                                    }
                                });
                                const catPct = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : 0;
                                return (
                                    <View key={cat.key} style={s.catRow}>
                                        <View style={[s.catIcon, { backgroundColor: cat.color + '20' }]}>
                                            <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={s.catLabel}>{cat.label}</Text>
                                            <View style={s.catBar}>
                                                <View style={[s.catBarFill, { width: `${catPct}%`, backgroundColor: cat.color }]} />
                                            </View>
                                        </View>
                                        <Text style={[s.catPct, { color: cat.color }]}>{catPct}%</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Retry */}
                        <TouchableOpacity style={s.retryBtn} onPress={startQuiz}>
                            <LinearGradient colors={GRADIENTS.pink} style={s.retryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="refresh" size={18} color="#fff" />
                                <Text style={s.retryText}>Làm lại Quiz</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </LinearGradient>
            </View>
        );
    }

    // ===== WAITING SCREEN =====
    if (phase === 'waiting' || (phase === 'menu' && iCompleted && !partnerCompleted)) {
        return (
            <View style={s.container}>
                <LinearGradient colors={['#fce4ec', '#f3e5f5', '#e8eaf6']} style={s.bg}>
                    <View style={s.waitingWrap}>
                        <Text style={{ fontSize: 60 }}>⏳</Text>
                        <Text style={s.waitingTitle}>Đã hoàn thành!</Text>
                        <Text style={s.waitingSubtitle}>Đang đợi người yêu trả lời...</Text>
                        <View style={s.waitingStatus}>
                            <View style={s.waitingDot}>
                                <Text style={{ fontSize: 14 }}>{role === 'nhat' ? '👦' : '👧'}</Text>
                            </View>
                            <Text style={s.waitingLabel}>✅ Bạn đã xong</Text>
                        </View>
                        <View style={[s.waitingStatus, { marginTop: 8 }]}>
                            <View style={[s.waitingDot, { backgroundColor: '#ffebee' }]}>
                                <Text style={{ fontSize: 14 }}>{partnerRole === 'nhi' ? '👧' : '👦'}</Text>
                            </View>
                            <Text style={s.waitingLabel}>⏳ Đang đợi {partnerRole === 'nhi' ? 'Nhi' : 'Nhật'}...</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    // ===== QUIZ IN PROGRESS =====
    if (phase === 'self' || phase === 'guess') {
        const q = questions[currentQ];
        const currentAnswers = phase === 'self' ? selfAnswers : guessAnswers;
        const questionText = phase === 'self' ? q.selfQuestion : q.guessQuestion;
        const phaseLabel = phase === 'self' ? '📝 Trả lời về bản thân' : '🤔 Đoán câu trả lời của người yêu';
        const catInfo = QUIZ_CATEGORIES.find(c => c.key === q.category);

        return (
            <View style={s.container}>
                <LinearGradient colors={['#fce4ec', '#f3e5f5', '#e8eaf6']} style={s.bg}>
                    {/* Phase indicator */}
                    <View style={s.phaseBar}>
                        <Text style={s.phaseLabel}>{phaseLabel}</Text>
                        <Text style={s.phaseCount}>Câu {currentQ + 1}/{questions.length}</Text>
                    </View>

                    {/* Progress bar */}
                    <View style={s.progressWrap}>
                        <Animated.View style={[s.progressFill, {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        }]} />
                    </View>

                    {/* Category badge */}
                    <View style={s.catBadgeWrap}>
                        <View style={[s.catBadge, { backgroundColor: catInfo?.color + '20' }]}>
                            <Text style={{ fontSize: 14 }}>{catInfo?.emoji}</Text>
                            <Text style={[s.catBadgeText, { color: catInfo?.color }]}>{catInfo?.label}</Text>
                        </View>
                    </View>

                    {/* Question card */}
                    <View style={s.questionCard}>
                        <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']} style={s.questionCardGrad}>
                            <Text style={s.questionText}>{questionText}</Text>
                        </LinearGradient>
                    </View>

                    {/* Options */}
                    <View style={s.optionsWrap}>
                        {q.options.map((opt, idx) => {
                            const selected = currentAnswers[q.id] === idx;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[s.optionBtn, selected && s.optionBtnSelected]}
                                    onPress={() => selectAnswer(idx)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.optionLetter, selected && { backgroundColor: COLORS.primaryPink }]}>
                                        <Text style={[s.optionLetterText, selected && { color: '#fff' }]}>
                                            {String.fromCharCode(65 + idx)}
                                        </Text>
                                    </View>
                                    <Text style={[s.optionText, selected && { color: COLORS.primaryPink, fontWeight: '700' }]}>
                                        {opt}
                                    </Text>
                                    {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primaryPink} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </LinearGradient>
            </View>
        );
    }

    // ===== MENU SCREEN =====
    return (
        <View style={s.container}>
            <LinearGradient colors={['#fce4ec', '#f3e5f5', '#e8eaf6']} style={s.bg}>
                <ScrollView contentContainerStyle={s.scrollContent}>
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        {/* Header */}
                        <View style={s.menuHeader}>
                            <Text style={{ fontSize: 48 }}>💕</Text>
                            <Text style={s.menuTitle}>Love Quiz</Text>
                            <Text style={s.menuSubtitle}>Bạn hiểu người yêu đến đâu?</Text>
                        </View>

                        {/* Category preview */}
                        <View style={s.catPreviewWrap}>
                            {QUIZ_CATEGORIES.map(cat => (
                                <View key={cat.key} style={s.catPreview}>
                                    <View style={[s.catPreviewIcon, { backgroundColor: cat.color + '20' }]}>
                                        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                                    </View>
                                    <Text style={s.catPreviewLabel}>{cat.label}</Text>
                                    <Text style={s.catPreviewCount}>
                                        {QUIZ_QUESTIONS.filter(q => q.category === cat.key).length} câu
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* How it works */}
                        <View style={s.howItWorks}>
                            <Text style={s.howTitle}>📋 Cách chơi</Text>
                            <View style={s.howStep}>
                                <View style={s.howNum}><Text style={s.howNumText}>1</Text></View>
                                <Text style={s.howText}>Trả lời {QUIZ_QUESTIONS.length} câu về bản thân</Text>
                            </View>
                            <View style={s.howStep}>
                                <View style={s.howNum}><Text style={s.howNumText}>2</Text></View>
                                <Text style={s.howText}>Đoán câu trả lời của người yêu</Text>
                            </View>
                            <View style={s.howStep}>
                                <View style={s.howNum}><Text style={s.howNumText}>3</Text></View>
                                <Text style={s.howText}>Xem kết quả khi cả 2 hoàn thành!</Text>
                            </View>
                        </View>

                        {/* Start button */}
                        {paired ? (
                            <TouchableOpacity style={s.startBtn} onPress={startQuiz} activeOpacity={0.8}>
                                <LinearGradient colors={GRADIENTS.pink} style={s.startGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Ionicons name="heart" size={20} color="#fff" />
                                    <Text style={s.startText}>Bắt đầu Quiz</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <View style={s.notPaired}>
                                <Text style={{ fontSize: 20 }}>🔗</Text>
                                <Text style={s.notPairedText}>Ghép đôi trước để chơi Quiz</Text>
                            </View>
                        )}

                        {/* Total questions info */}
                        <Text style={s.totalInfo}>
                            📝 {QUIZ_QUESTIONS.length} câu hỏi • 5 danh mục • ~5 phút
                        </Text>

                        {/* Custom Quiz Section */}
                        <View style={s.customSection}>
                            <Text style={s.customTitle}>✨ Câu hỏi tự tạo</Text>
                            <Text style={s.customDesc}>Tự tạo câu hỏi để thử sự hiểu nhau!</Text>

                            <TouchableOpacity style={s.customCreateBtn} onPress={() => setShowCreateQ(true)}>
                                <LinearGradient colors={['#7c4dff', '#b388ff']} style={s.customCreateGrad}>
                                    <Ionicons name="add-circle" size={18} color="#fff" />
                                    <Text style={s.customCreateText}>Tạo câu hỏi mới</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {customQuestions.length > 0 && (
                                <View style={s.customList}>
                                    {customQuestions.map((cq, i) => (
                                        <View key={cq.id} style={s.customItem}>
                                            <Text style={s.customItemQ}>{cq.selfQuestion}</Text>
                                            <Text style={s.customItemMeta}>Bởi {cq.createdBy === 'nhat' ? 'Nhật' : 'Nhi'} • {cq.options?.length || 0} lựa chọn</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>

                {/* Create Custom Question Modal */}
                <Modal visible={showCreateQ} transparent animationType="slide">
                    <View style={s.modalOverlay}>
                        <View style={s.modalBox}>
                            <Text style={s.modalTitle}>✨ Tạo câu hỏi mới</Text>
                            <TextInput
                                style={s.modalInput}
                                placeholder="Nhập câu hỏi... (VD: Sở thích của bạn?)"
                                placeholderTextColor="#bbb"
                                value={customQuestion}
                                onChangeText={setCustomQuestion}
                                multiline
                            />
                            <Text style={s.modalOptLabel}>📝 Các lựa chọn (tối thiểu 2)</Text>
                            {customOptions.map((opt, i) => (
                                <TextInput
                                    key={i}
                                    style={s.modalOptInput}
                                    placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                                    placeholderTextColor="#ccc"
                                    value={opt}
                                    onChangeText={(t) => {
                                        const newOpts = [...customOptions];
                                        newOpts[i] = t;
                                        setCustomOptions(newOpts);
                                    }}
                                />
                            ))}
                            <View style={s.modalActions}>
                                <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreateQ(false)}>
                                    <Text style={s.modalCancelText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.modalSave} onPress={handleCreateQ}>
                                    <LinearGradient colors={['#7c4dff', '#b388ff']} style={s.modalSaveGrad}>
                                        <Text style={s.modalSaveText}>Tạo ✨</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    bg: { flex: 1, justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },

    // Menu
    menuHeader: { alignItems: 'center', marginBottom: 24 },
    menuTitle: { fontSize: 28, fontWeight: '900', color: COLORS.textDark, marginTop: 8 },
    menuSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
    catPreviewWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 24 },
    catPreview: { alignItems: 'center', width: (width - 80) / 3 },
    catPreviewIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    catPreviewLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
    catPreviewCount: { fontSize: 10, color: COLORS.textMuted },
    howItWorks: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 20, marginBottom: 24 },
    howTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 14 },
    howStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    howNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryPink, alignItems: 'center', justifyContent: 'center' },
    howNumText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    howText: { fontSize: 14, color: COLORS.textMedium, marginLeft: 12, flex: 1 },
    startBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
    startGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    startText: { color: '#fff', fontWeight: '800', fontSize: 17, marginLeft: 8 },
    notPaired: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16 },
    notPairedText: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8 },
    totalInfo: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

    // Quiz in progress
    phaseBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
    phaseLabel: { fontSize: 14, fontWeight: '700', color: COLORS.primaryPink },
    phaseCount: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
    progressWrap: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 20, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.primaryPink, borderRadius: 3 },
    catBadgeWrap: { alignItems: 'center', marginTop: 16 },
    catBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    catBadgeText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
    questionCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 20, overflow: 'hidden', elevation: 4 },
    questionCardGrad: { padding: 28, alignItems: 'center' },
    questionText: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, textAlign: 'center', lineHeight: 28 },
    optionsWrap: { paddingHorizontal: 20, marginTop: 24, gap: 10 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'transparent' },
    optionBtnSelected: { borderColor: COLORS.primaryPink, backgroundColor: '#fff' },
    optionLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
    optionLetterText: { fontWeight: '800', fontSize: 14, color: COLORS.textMedium },
    optionText: { flex: 1, fontSize: 15, color: COLORS.textDark, marginLeft: 12, fontWeight: '500' },

    // Waiting
    waitingWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    waitingTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginTop: 16 },
    waitingSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },
    waitingStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, width: '100%' },
    waitingDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
    waitingLabel: { fontSize: 14, color: COLORS.textMedium, marginLeft: 12, fontWeight: '600' },

    // Results
    resultHeader: { alignItems: 'center', marginBottom: 20 },
    resultEmoji: { fontSize: 56 },
    resultTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, marginTop: 8 },
    resultSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
    scoreCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 20, elevation: 4 },
    scoreCardGrad: { padding: 28, alignItems: 'center' },
    scoreNumber: { fontSize: 56, fontWeight: '900' },
    scoreLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginTop: 4 },
    scoreBar: { width: '100%', height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, marginTop: 16, overflow: 'hidden' },
    scoreBarFill: { height: '100%', borderRadius: 5 },
    individualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
    individualCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 16, alignItems: 'center' },
    individualEmoji: { fontSize: 32 },
    individualName: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginTop: 4 },
    individualScore: { fontSize: 28, fontWeight: '900', marginTop: 6 },
    individualLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    individualDetail: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
    vsCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryPink, alignItems: 'center', justifyContent: 'center' },
    vsText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    categorySection: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 20, marginBottom: 20 },
    categorySectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 14 },
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
    catBar: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
    catBarFill: { height: '100%', borderRadius: 3 },
    catPct: { fontSize: 14, fontWeight: '800', marginLeft: 12, width: 42, textAlign: 'right' },
    retryBtn: { borderRadius: 18, overflow: 'hidden' },
    retryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },

    // Custom quiz
    customSection: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 20, marginTop: 20 },
    customTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
    customDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: 14 },
    customCreateBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
    customCreateGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    customCreateText: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 6 },
    customList: { gap: 8 },
    customItem: { backgroundColor: '#f8f4ff', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: '#7c4dff' },
    customItemQ: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
    customItemMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginBottom: 14 },
    modalInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 12, minHeight: 60, textAlignVertical: 'top' },
    modalOptLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMedium, marginBottom: 8 },
    modalOptInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: '#fafafa', marginBottom: 8 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
    modalCancelText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
    modalSave: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    modalSaveGrad: { paddingVertical: 14, alignItems: 'center' },
    modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
