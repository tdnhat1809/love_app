import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    ScrollView, TextInput, Modal, FlatList
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';
import { saveTimeCapsule, listenToTimeCapsules, openTimeCapsule, getUserRole } from '../firebase/firebaseService';

export default function TimeCapsuleScreen() {
    const [role, setRole] = useState('nhat');
    const [capsules, setCapsules] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [message, setMessage] = useState('');
    const [unlockDate, setUnlockDate] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        (async () => { const r = await getUserRole(); setRole(r || 'nhat'); })();
        const unsub = listenToTimeCapsules((data) => setCapsules(data));
        return () => unsub();
    }, []);

    const handleCreate = async () => {
        if (!message.trim()) return showAlert({ title: 'Oops!', message: 'Viết gì đó vào capsule!', emoji: '💌', type: 'warning' });
        if (!unlockDate.match(/^\d{4}-\d{2}-\d{2}$/)) return showAlert({ title: 'Sai định dạng', message: 'Nhập ngày mở: YYYY-MM-DD', type: 'warning' });
        const unlock = new Date(unlockDate);
        if (unlock <= new Date()) return showAlert({ title: 'Oops!', message: 'Ngày mở phải trong tương lai!', type: 'warning' });
        await saveTimeCapsule({ message: message.trim(), unlockDate });
        setMessage(''); setUnlockDate(''); setShowCreate(false);
        showAlert({ title: 'Đã niêm phong!', message: 'Time Capsule đã được niêm phong!', emoji: '💌', type: 'love' });
    };

    const handleOpen = async (cap) => {
        const now = new Date();
        const unlock = new Date(cap.unlockDate);
        if (now < unlock) {
            const days = Math.ceil((unlock - now) / (1000 * 60 * 60 * 24));
            return showAlert({ title: 'Chưa đến lúc!', message: `Còn ${days} ngày nữa mới mở được!`, emoji: '🔒', type: 'lock' });
        }
        await openTimeCapsule(cap.id);
    };

    const getTimeLeft = (unlockDate) => {
        const now = new Date();
        const unlock = new Date(unlockDate);
        const diff = unlock - now;
        if (diff <= 0) return 'Có thể mở!';
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return `${days} ngày nữa`;
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={['#e8eaf6', '#f3e5f5', '#fce4ec']} style={s.bg}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Header */}
                        <View style={s.header}>
                            <Text style={{ fontSize: 48 }}>💌</Text>
                            <Text style={s.title}>Time Capsule</Text>
                            <Text style={s.subtitle}>Niêm phong kỷ niệm, mở trong tương lai</Text>
                        </View>

                        {/* Create Button */}
                        <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
                            <LinearGradient colors={['#7c4dff', '#b388ff']} style={s.createGrad}>
                                <Ionicons name="add-circle" size={20} color="#fff" />
                                <Text style={s.createText}>Tạo Time Capsule mới</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Capsule List */}
                        {capsules.length === 0 ? (
                            <View style={s.empty}>
                                <Text style={{ fontSize: 40 }}>📭</Text>
                                <Text style={s.emptyText}>Chưa có capsule nào</Text>
                                <Text style={s.emptyHint}>Tạo capsule đầu tiên của bạn!</Text>
                            </View>
                        ) : (
                            capsules.map((cap, i) => {
                                const canOpen = new Date() >= new Date(cap.unlockDate);
                                return (
                                    <View key={cap.id} style={s.capCard}>
                                        <View style={s.capHeader}>
                                            <Text style={{ fontSize: 24 }}>{cap.opened ? '📬' : '📦'}</Text>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={s.capBy}>Bởi {cap.createdBy === 'nhat' ? 'Nhật' : 'Nhi'}</Text>
                                                <Text style={s.capDate}>Mở: {cap.unlockDate}</Text>
                                            </View>
                                            {!cap.opened && (
                                                <View style={[s.capBadge, canOpen ? { backgroundColor: '#e8f5e9' } : {}]}>
                                                    <Text style={[s.capBadgeText, canOpen ? { color: '#2e7d32' } : {}]}>
                                                        {canOpen ? '🔓 Sẵn sàng' : `🔒 ${getTimeLeft(cap.unlockDate)}`}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {cap.opened ? (
                                            <View style={s.capMessage}>
                                                <Text style={s.capMsgText}>{cap.message}</Text>
                                            </View>
                                        ) : canOpen ? (
                                            <TouchableOpacity style={s.openBtn} onPress={() => handleOpen(cap)}>
                                                <Text style={s.openBtnText}>✨ Mở Capsule</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={s.lockedMsg}>
                                                <Ionicons name="lock-closed" size={16} color="#bbb" />
                                                <Text style={s.lockedText}>Nội dung đã được niêm phong...</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </Animated.View>
                </ScrollView>

                {/* Create Modal */}
                <Modal visible={showCreate} transparent animationType="slide">
                    <View style={s.modalOverlay}>
                        <View style={s.modalBox}>
                            <Text style={s.modalTitle}>💌 Tạo Time Capsule</Text>
                            <Text style={s.modalSub}>Tin nhắn sẽ bị niêm phong cho đến ngày bạn chọn</Text>
                            <TextInput
                                style={s.modalInput}
                                placeholder="Viết tin nhắn cho tương lai..."
                                placeholderTextColor="#bbb"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                maxLength={1000}
                            />
                            <TextInput
                                style={[s.modalInput, { minHeight: 48 }]}
                                placeholder="Ngày mở (VD: 2025-12-25)"
                                placeholderTextColor="#bbb"
                                value={unlockDate}
                                onChangeText={setUnlockDate}
                            />
                            <View style={s.modalActions}>
                                <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreate(false)}>
                                    <Text style={s.modalCancelText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.modalSave} onPress={handleCreate}>
                                    <LinearGradient colors={['#7c4dff', '#b388ff']} style={s.modalSaveGrad}>
                                        <Text style={s.modalSaveText}>Niêm phong 📮</Text>
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
    bg: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },
    header: { alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, marginTop: 8 },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    createBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
    createGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    createText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, marginTop: 10 },
    emptyHint: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    capCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2 },
    capHeader: { flexDirection: 'row', alignItems: 'center' },
    capBy: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
    capDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    capBadge: { backgroundColor: '#fff3e0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    capBadgeText: { fontSize: 11, fontWeight: '700', color: '#e65100' },
    capMessage: { backgroundColor: '#f8f4ff', borderRadius: 12, padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#7c4dff' },
    capMsgText: { fontSize: 14, color: COLORS.textDark, lineHeight: 20, fontStyle: 'italic' },
    openBtn: { backgroundColor: '#e8f5e9', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
    openBtnText: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },
    lockedMsg: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    lockedText: { fontSize: 13, color: '#bbb', marginLeft: 6, fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark, textAlign: 'center' },
    modalSub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    modalInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 12, minHeight: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
    modalCancelText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
    modalSave: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    modalSaveGrad: { paddingVertical: 14, alignItems: 'center' },
    modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
