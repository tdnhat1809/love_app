import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { loveMessages } from '../data/quotes';
import { requestNotificationPermission, scheduleDailyLoveNotification } from '../utils/notifications';
import { sendLoveNotificationToPartner, isPaired, getUserRole, listenToLoveMessages } from '../firebase/firebaseService';

export default function MessagesScreen() {
    const [messages, setMessages] = useState([]);
    const [customMessage, setCustomMessage] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const [sending, setSending] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        // Listen to Firebase for synced love messages
        const unsub = listenToLoveMessages((msgs) => setMessages(msgs));
        return () => { if (unsub) unsub(); };
    }, []);

    const handleSend = async (text) => {
        if (!text.trim()) return;
        setSending(true);
        try {
            const p = await isPaired();
            if (p) {
                await sendLoveNotificationToPartner(text);
                Alert.alert('💌 Đã gửi!', 'Đã gửi đến người yêu! 📲', [{ text: 'Yêu ❤️' }]);
            } else {
                Alert.alert('⚠️', 'Ghép đôi trước để gửi đến máy người yêu!', [{ text: 'OK' }]);
            }
            setCustomMessage('');
        } catch (e) { Alert.alert('Lỗi', e.message); }
        setSending(false);
    };

    const fmtTime = (ts) => {
        if (!ts) return '';
        try {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch { return ''; }
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={GRADIENTS.background} style={s.bg}>
                <Animated.ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim }}>
                    <View style={s.header}><Text style={s.title}>Lời yêu thương</Text><Text style={s.subtitle}>Gửi yêu thương đến người bạn yêu 💕</Text></View>

                    <View style={[s.sendBox, SHADOWS.card]}>
                        <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>💌</Text>
                        <TextInput style={s.input} placeholder="Viết lời yêu thương..." placeholderTextColor={COLORS.textMuted} value={customMessage} onChangeText={setCustomMessage} multiline maxLength={200} />
                        <TouchableOpacity style={[s.sendBtn, !customMessage.trim() && { opacity: 0.4 }]} onPress={() => handleSend(customMessage)} disabled={!customMessage.trim() || sending}>
                            <LinearGradient colors={customMessage.trim() ? GRADIENTS.pink : ['#ccc', '#ddd']} style={s.sendGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name={sending ? 'hourglass' : 'send'} size={18} color="#fff" />
                                <Text style={s.sendText}>{sending ? 'Đang gửi...' : 'Gửi yêu ❤️'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[s.toggle, SHADOWS.soft]} onPress={() => setShowTemplates(!showTemplates)} activeOpacity={0.7}>
                        <Ionicons name={showTemplates ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                        <Text style={s.toggleText}>Tin nhắn mẫu ({loveMessages.length})</Text>
                    </TouchableOpacity>

                    {showTemplates && <View style={s.templates}>{loveMessages.map((msg, i) => (
                        <TouchableOpacity key={i} style={[s.tplItem, SHADOWS.soft]} onPress={() => handleSend(msg)} activeOpacity={0.7}>
                            <Text style={s.tplText}>{msg}</Text><Ionicons name="send-outline" size={14} color={COLORS.primaryPink} />
                        </TouchableOpacity>
                    ))}</View>}

                    <TouchableOpacity style={[s.dailyCard, SHADOWS.soft]} onPress={async () => { const ok = await requestNotificationPermission(); if (!ok) return; Alert.alert('💕', 'Bật nhắc nhở 8:00 sáng?', [{ text: 'Hủy' }, { text: 'Bật ❤️', onPress: async () => { await scheduleDailyLoveNotification(8, 0); Alert.alert('✅', 'Đã bật!'); } }]); }}>
                        <View style={s.dailyIcon}><Text style={{ fontSize: 20 }}>⏰</Text></View>
                        <View style={{ flex: 1 }}><Text style={s.dailyTitle}>Nhắc nhở hàng ngày</Text><Text style={s.dailySub}>Gửi lời yêu thương mỗi sáng</Text></View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>

                    <Text style={s.histTitle}>Lịch sử ({messages.length})</Text>
                    {messages.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 36 }}>💭</Text><Text style={s.emptyText}>Chưa có tin nhắn nào</Text></View>
                        : messages.slice(0, 30).map(msg => (
                            <View key={msg.id} style={[s.msgCard, SHADOWS.soft]}>
                                <View style={s.msgHead}>
                                    <Text style={s.msgFrom}>💕 {msg.senderName || 'Người yêu'}</Text>
                                    <Text style={s.msgTime}>{fmtTime(msg.createdAt)}</Text>
                                </View>
                                <Text style={s.msgText}>{msg.text}</Text>
                            </View>
                        ))}
                </Animated.ScrollView>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 }, scroll: { paddingBottom: 100 },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    sendBox: { marginHorizontal: 20, backgroundColor: COLORS.cardWhite, borderRadius: BORDER_RADIUS.xxl, padding: 20, borderWidth: 1, borderColor: COLORS.borderPink, marginBottom: 14 },
    input: { backgroundColor: COLORS.primaryPinkSoft, borderRadius: 16, padding: 14, color: COLORS.textDark, fontSize: 15, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.borderPink, marginBottom: 12 },
    sendBtn: { borderRadius: 14, overflow: 'hidden' },
    sendGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14 },
    sendText: { color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 14 },
    toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, padding: 14, backgroundColor: COLORS.cardWhite, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 12 },
    toggleText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginLeft: 6 },
    templates: { marginHorizontal: 20, marginBottom: 20 },
    tplItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardWhite, borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: COLORS.borderLight },
    tplText: { flex: 1, color: COLORS.textMedium, fontSize: 14 },
    dailyCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 18, padding: 16, marginBottom: 24, backgroundColor: COLORS.cardWhite, borderWidth: 1, borderColor: COLORS.borderLight },
    dailyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,213,79,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    dailyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
    dailySub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    histTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, marginHorizontal: 24, letterSpacing: 2, textTransform: 'uppercase' },
    empty: { alignItems: 'center', paddingVertical: 28 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
    msgCard: { backgroundColor: COLORS.cardWhite, borderRadius: 16, padding: 14, marginBottom: 4, marginHorizontal: 20, borderWidth: 1, borderColor: COLORS.borderLight },
    msgHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    msgFrom: { fontSize: 12, color: COLORS.primaryPink, fontWeight: '600' },
    msgTime: { fontSize: 10, color: COLORS.textMuted },
    msgText: { fontSize: 14, color: COLORS.textMedium, lineHeight: 22 },
});
