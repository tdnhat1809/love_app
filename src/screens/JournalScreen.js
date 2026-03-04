import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';
import { saveJournalEntry, listenToJournal, getUserRole } from '../firebase/firebaseService';

export default function JournalScreen() {
    const [role, setRole] = useState('nhat');
    const [entries, setEntries] = useState([]);
    const [showWrite, setShowWrite] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mood, setMood] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const ENTRY_MOODS = ['😍', '🥰', '😊', '😢', '😡'];

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        (async () => { const r = await getUserRole(); setRole(r || 'nhat'); })();
        const unsub = listenToJournal((data) => setEntries(data));
        return () => unsub();
    }, []);

    const handleSave = async () => {
        if (!content.trim()) return showAlert({ title: 'Oops!', message: 'Viết gì đó vào nhật ký!', emoji: '📝', type: 'warning' });
        await saveJournalEntry({ title: title.trim() || 'Không tiêu đề', content: content.trim(), mood });
        setTitle(''); setContent(''); setMood(0); setShowWrite(false);
        showAlert({ title: 'Đã lưu!', message: 'Đã lưu vào nhật ký!', emoji: '📖', type: 'success' });
    };

    const formatDate = (ts) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={['#fff3e0', '#fce4ec', '#f3e5f5']} style={s.bg}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Header */}
                        <View style={s.header}>
                            <Text style={{ fontSize: 40 }}>📖</Text>
                            <Text style={s.title}>Nhật ký chung</Text>
                            <Text style={s.subtitle}>Ghi lại những khoảnh khắc bên nhau</Text>
                        </View>

                        {/* Write Button */}
                        <TouchableOpacity style={s.writeBtn} onPress={() => setShowWrite(true)}>
                            <LinearGradient colors={GRADIENTS.pink} style={s.writeGrad}>
                                <Ionicons name="create" size={20} color="#fff" />
                                <Text style={s.writeText}>Viết nhật ký mới</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Stats */}
                        <View style={s.statsRow}>
                            <View style={s.statCard}>
                                <Text style={s.statNum}>{entries.length}</Text>
                                <Text style={s.statLabel}>Bài viết</Text>
                            </View>
                            <View style={s.statCard}>
                                <Text style={s.statNum}>{entries.filter(e => e.author === 'nhat').length}</Text>
                                <Text style={s.statLabel}>Nhật viết</Text>
                            </View>
                            <View style={s.statCard}>
                                <Text style={s.statNum}>{entries.filter(e => e.author === 'nhi').length}</Text>
                                <Text style={s.statLabel}>Nhi viết</Text>
                            </View>
                        </View>

                        {/* Entries */}
                        {entries.length === 0 ? (
                            <View style={s.empty}>
                                <Text style={{ fontSize: 40 }}>📝</Text>
                                <Text style={s.emptyText}>Chưa có bài nhật ký nào</Text>
                            </View>
                        ) : (
                            entries.map((e, i) => (
                                <View key={e.id} style={s.entryCard}>
                                    <View style={s.entryHeader}>
                                        <Text style={{ fontSize: 20 }}>{ENTRY_MOODS[e.mood] || '😊'}</Text>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={s.entryTitle}>{e.title}</Text>
                                            <Text style={s.entryMeta}>
                                                {e.author === 'nhat' ? '👦 Nhật' : '👧 Nhi'} • {formatDate(e.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={s.entryContent} numberOfLines={4}>{e.content}</Text>
                                </View>
                            ))
                        )}
                    </Animated.View>
                </ScrollView>

                {/* Write Modal */}
                <Modal visible={showWrite} transparent animationType="slide">
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={s.modalOverlay}>
                            <View style={s.modalBox}>
                                <Text style={s.modalTitle}>📝 Viết nhật ký</Text>
                                <View style={s.moodRow}>
                                    {ENTRY_MOODS.map((em, i) => (
                                        <TouchableOpacity key={i} style={[s.moodBtn, mood === i && s.moodBtnActive]} onPress={() => setMood(i)}>
                                            <Text style={{ fontSize: 24 }}>{em}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={s.modalInputTitle}
                                    placeholder="Tiêu đề (không bắt buộc)"
                                    placeholderTextColor="#bbb"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                                <TextInput
                                    style={s.modalInputContent}
                                    placeholder="Hôm nay em muốn ghi lại điều gì..."
                                    placeholderTextColor="#bbb"
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    maxLength={2000}
                                />
                                <View style={s.modalActions}>
                                    <TouchableOpacity style={s.cancelBtn} onPress={() => setShowWrite(false)}>
                                        <Text style={s.cancelText}>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                                        <LinearGradient colors={GRADIENTS.pink} style={s.saveGrad}>
                                            <Text style={s.saveText}>Lưu 📝</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    bg: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },
    header: { alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginTop: 8 },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    writeBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
    writeGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    writeText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 14, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '900', color: COLORS.primaryPink },
    statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },
    entryCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2 },
    entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    entryTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },
    entryMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    entryContent: { fontSize: 14, color: COLORS.textMedium, lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginBottom: 12 },
    moodRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
    moodBtn: { padding: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    moodBtnActive: { borderColor: COLORS.primaryPink, backgroundColor: '#fce4ec' },
    modalInputTitle: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 10 },
    modalInputContent: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 16, minHeight: 120, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
    cancelText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
    saveBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    saveGrad: { paddingVertical: 14, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
