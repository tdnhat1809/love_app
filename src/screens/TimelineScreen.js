import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { getEvents, saveEvent, deleteEvent } from '../utils/storage';

export default function TimelineScreen() {
    const [events, setEvents] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', emoji: '❤️', date: '', photo: null });
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { loadEvents(); Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, []);
    const loadEvents = async () => setEvents(await getEvents());

    const handleSave = async () => { if (!form.title.trim()) { Alert.alert('⚠️', 'Nhập tiêu đề!'); return; } await saveEvent({ ...form, date: form.date || new Date().toISOString().split('T')[0] }); setForm({ title: '', description: '', emoji: '❤️', date: '', photo: null }); setShowAdd(false); await loadEvents(); };
    const handleDelete = (id) => { Alert.alert('Xóa?', '', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteEvent(id); await loadEvents(); } }]); };
    const pickPhoto = async () => { const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true }); if (!res.canceled) setForm(f => ({ ...f, photo: res.assets[0].uri })); };
    const emojis = ['❤️', '🎉', '🎵', '✈️', '🍽️', '🎁', '💍', '🏠', '📸', '🌹', '💕', '⭐'];

    return (
        <View style={s.container}>
            <LinearGradient colors={GRADIENTS.background} style={s.bg}>
                <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
                    <View style={s.header}>
                        <View style={{ flex: 1 }}><Text style={s.title}>Kỷ niệm</Text><Text style={s.subtitle}>{events.length} khoảnh khắc đáng nhớ 💕</Text></View>
                        <TouchableOpacity onPress={() => setShowAdd(true)} activeOpacity={0.7}>
                            <LinearGradient colors={GRADIENTS.pink} style={s.addGrad}><Ionicons name="add" size={22} color="#fff" /></LinearGradient>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                        {events.length === 0 ? (
                            <View style={s.empty}><View style={s.emptyCircle}><Text style={{ fontSize: 40 }}>📅</Text></View><Text style={s.emptyTitle}>Chưa có sự kiện</Text><Text style={s.emptyText}>Thêm những khoảnh khắc{'\n'}đáng nhớ vào đây nhé!</Text></View>
                        ) : (
                            <View style={s.timeline}>{events.map((event, i) => (
                                <TouchableOpacity key={event.id} style={s.eventCard} onLongPress={() => handleDelete(event.id)} activeOpacity={0.8}>
                                    <View style={s.timeLine}><View style={s.dot}><Text style={{ fontSize: 14 }}>{event.emoji || '❤️'}</Text></View>{i < events.length - 1 && <View style={s.line} />}</View>
                                    <View style={[s.eventBody, SHADOWS.soft]}>
                                        <Text style={s.eventTitle}>{event.title}</Text><Text style={s.eventDate}>{event.date}</Text>
                                        {event.description ? <Text style={s.eventDesc}>{event.description}</Text> : null}
                                        {event.photo && <Image source={{ uri: event.photo }} style={s.eventImg} />}
                                    </View>
                                </TouchableOpacity>
                            ))}</View>
                        )}
                    </ScrollView>
                </Animated.View>
                <Modal visible={showAdd} transparent animationType="slide">
                    <View style={s.modalBg}>
                        <View style={s.modal}>
                            <View style={s.modalHeader}><Text style={s.modalTitle}>Thêm kỷ niệm</Text><TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={COLORS.textMuted} /></TouchableOpacity></View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={s.fieldLabel}>Emoji</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>{emojis.map(e => (<TouchableOpacity key={e} style={[s.emojiBtn, form.emoji === e && s.emojiBtnActive]} onPress={() => setForm(f => ({ ...f, emoji: e }))}><Text style={{ fontSize: 22 }}>{e}</Text></TouchableOpacity>))}</ScrollView>
                                <Text style={s.fieldLabel}>Tiêu đề *</Text><TextInput style={s.formInput} placeholder="VD: Ngày đầu tiên..." placeholderTextColor={COLORS.textMuted} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} />
                                <Text style={s.fieldLabel}>Ngày</Text><TextInput style={s.formInput} placeholder="2022-05-25" placeholderTextColor={COLORS.textMuted} value={form.date} onChangeText={t => setForm(f => ({ ...f, date: t }))} />
                                <Text style={s.fieldLabel}>Mô tả</Text><TextInput style={[s.formInput, { minHeight: 80 }]} placeholder="Kể lại..." placeholderTextColor={COLORS.textMuted} value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} multiline />
                                <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}><Ionicons name="camera-outline" size={18} color={COLORS.textMuted} /><Text style={{ color: COLORS.textMuted, marginLeft: 8, fontWeight: '600' }}>{form.photo ? 'Đổi ảnh' : 'Thêm ảnh'}</Text></TouchableOpacity>
                                {form.photo && <Image source={{ uri: form.photo }} style={{ width: '100%', height: 160, borderRadius: 14, marginTop: 10 }} />}
                                <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden' }}><LinearGradient colors={GRADIENTS.pink} style={{ padding: 16, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Lưu kỷ niệm 💕</Text></LinearGradient></TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 }, scroll: { paddingBottom: 100 },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    addGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
    empty: { alignItems: 'center', paddingTop: 100 },
    emptyCircle: { width: 100, height: 100, borderRadius: 30, backgroundColor: COLORS.cardWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...SHADOWS.card },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
    timeline: { paddingHorizontal: 20 },
    eventCard: { flexDirection: 'row', marginBottom: 4 },
    timeLine: { width: 40, alignItems: 'center' },
    dot: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.cardPinkSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderPink },
    line: { width: 2, flex: 1, backgroundColor: COLORS.borderPink, marginVertical: 4 },
    eventBody: { flex: 1, marginLeft: 10, backgroundColor: COLORS.cardWhite, borderRadius: 18, padding: 16, marginBottom: 6, borderWidth: 1, borderColor: COLORS.borderLight },
    eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
    eventDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
    eventDesc: { fontSize: 13, color: COLORS.textMedium, marginTop: 8, lineHeight: 20 },
    eventImg: { width: '100%', height: 160, borderRadius: 12, marginTop: 10 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textDark },
    fieldLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, marginTop: 14, letterSpacing: 1, textTransform: 'uppercase' },
    emojiBtn: { padding: 8, borderRadius: 12, marginRight: 6, backgroundColor: COLORS.primaryPinkSoft, borderWidth: 2, borderColor: 'transparent' },
    emojiBtnActive: { borderColor: COLORS.primaryPink },
    formInput: { backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, padding: 14, color: COLORS.textDark, fontSize: 15, borderWidth: 1, borderColor: COLORS.borderPink },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: COLORS.borderPink },
});
