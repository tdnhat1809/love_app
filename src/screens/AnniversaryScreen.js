import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, TextInput, Alert, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { getMilestones, getNextAnniversary, getLoveDuration, formatDate } from '../utils/dateUtils';
import { listenToAvatars } from '../firebase/firebaseService';
import { HOLIDAYS } from '../data/holidays';

// Special dates data
const SPECIAL_DATES = [
    { id: 1, emoji: '💕', label: 'Kỷ niệm yêu nhau', date: '2022-05-25', recurring: true, color: COLORS.primaryPink },
    { id: 2, emoji: '🎂', label: 'Sinh nhật Nhi', date: '2007-04-05', recurring: true, color: '#ce93d8' },
    { id: 3, emoji: '👩', label: 'Quốc tế Phụ nữ', date: '2026-03-08', recurring: true, color: '#f48fb1' },
    { id: 4, emoji: '�', label: 'Valentine', date: '2027-02-14', recurring: true, color: '#ef5350' },
    { id: 5, emoji: '🤍', label: 'White Valentine', date: '2027-03-14', recurring: true, color: '#f8bbd0' },
    { id: 6, emoji: '👩‍🦰', label: 'Phụ nữ Việt Nam', date: '2026-10-20', recurring: true, color: '#ff6f00' },
    { id: 7, emoji: '🎄', label: 'Giáng sinh', date: '2026-12-25', recurring: true, color: '#c62828' },
    { id: 8, emoji: '🎆', label: 'Năm Mới', date: '2027-01-01', recurring: true, color: '#ffd54f' },
];

function getDaysUntilSpecial(dateStr) {
    const today = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    let target = new Date(today.getFullYear(), m - 1, d);
    if (target < today) target.setFullYear(today.getFullYear() + 1);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export default function AnniversaryScreen() {
    const [milestones, setMilestones] = useState([]);
    const [nextAnniv, setNextAnniv] = useState(getNextAnniversary());
    const [duration, setDuration] = useState(getLoveDuration());
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [avatars, setAvatars] = useState({});

    useEffect(() => {
        setMilestones(getMilestones());
        const t = setInterval(() => setDuration(getLoveDuration()), 1000);
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])).start();
        const unsubAvatars = listenToAvatars((data) => setAvatars(data));
        return () => { clearInterval(t); if (unsubAvatars) unsubAvatars(); };
    }, []);

    const passed = milestones.filter(m => m.passed);
    const upcoming = milestones.filter(m => !m.passed);
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

    const sortedSpecialDates = [...SPECIAL_DATES].sort((a, b) => getDaysUntilSpecial(a.date) - getDaysUntilSpecial(b.date));

    return (
        <View style={s.container}>
            <LinearGradient colors={GRADIENTS.background} style={s.bg}>
                <Animated.ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim }}>
                    <View style={s.header}><Text style={s.title}>Ngày đặc biệt</Text><Text style={s.subtitle}>Đừng bao giờ quên những ngày quan trọng 💕</Text></View>

                    {/* Hero Cover Card - Love8 style (unnamed (7).webp) */}
                    <Animated.View style={[s.heroCard, SHADOWS.card, { transform: [{ scale: pulseScale }] }]}>
                        <LinearGradient colors={['#2d1b3d', '#3a1d5c', '#4a2472']} style={s.heroBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Text style={s.heroLabel}>Bên nhau</Text>
                            <View style={s.heroTimerRow}>
                                {[
                                    { val: duration.totalDays, label: 'Days' },
                                    { val: duration.hours, label: 'Hours' },
                                    { val: duration.minutes, label: 'Minutes' },
                                    { val: duration.seconds, label: 'Seconds' },
                                ].map((item, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <Text style={s.heroSep}>:</Text>}
                                        <View style={s.heroTimeBox}>
                                            <Text style={s.heroTimeVal}>{item.val.toString().padStart(i === 0 ? 1 : 2, '0')}</Text>
                                            <Text style={s.heroTimeLabel}>{item.label}</Text>
                                        </View>
                                    </React.Fragment>
                                ))}
                            </View>
                            <View style={s.heroAvatars}>
                                <View style={[s.heroAvatar, { backgroundColor: 'rgba(244,143,177,0.3)', overflow: 'hidden' }]}>
                                    {avatars.nhat?.url ? <Image source={{ uri: avatars.nhat.url }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Text style={{ fontSize: 20 }}>👦</Text>}
                                </View>
                                <Text style={{ fontSize: 16, marginHorizontal: 8 }}>💙💗</Text>
                                <View style={[s.heroAvatar, { backgroundColor: 'rgba(206,147,216,0.3)', overflow: 'hidden' }]}>
                                    {avatars.nhi?.url ? <Image source={{ uri: avatars.nhi.url }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Text style={{ fontSize: 20 }}>👧</Text>}
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Our Special Dates - Love8 style (unnamed (7).webp) */}
                    <View style={s.specialSection}>
                        <View style={s.specialHeader}>
                            <Text style={s.specialTitle}>Our Special Date</Text>
                        </View>
                        {sortedSpecialDates.map((date) => {
                            const daysLeft = getDaysUntilSpecial(date.date);
                            const isClose = daysLeft <= 30;
                            return (
                                <View key={date.id} style={[s.specialCard, SHADOWS.soft]}>
                                    <View style={[s.specialBar, { backgroundColor: date.color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.specialLabel}>{date.emoji} {date.label}</Text>
                                    </View>
                                    <View>
                                        <Text style={[s.specialDays, isClose && { color: COLORS.primaryPink }]}>{daysLeft}</Text>
                                        <Text style={s.specialDaysLabel}>days left</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Next Anniversary */}
                    <View style={[s.annivBigCard, SHADOWS.soft]}>
                        <Text style={{ fontSize: 36, marginBottom: 8 }}>🎊</Text>
                        <Text style={s.annivLabel}>Kỷ niệm {nextAnniv.yearNumber} năm yêu nhau</Text>
                        <Text style={s.annivBigDays}>{nextAnniv.daysUntil}</Text>
                        <Text style={s.annivSub}>ngày nữa • {formatDate(nextAnniv.date)}</Text>
                    </View>

                    {/* Stats */}
                    <View style={[s.statsCard, SHADOWS.soft]}>
                        <Text style={s.statsHead}>hiện tại</Text>
                        <View style={s.statsRow}>
                            {[{ val: duration.years, label: 'Năm' }, { val: duration.months, label: 'Tháng' }, { val: duration.days, label: 'Ngày' }, { val: duration.totalDays, label: 'Tổng' }].map((item, i) => (
                                <View key={i} style={s.statItem}><Text style={s.statNum}>{item.val}</Text><Text style={s.statLabel}>{item.label}</Text></View>
                            ))}
                        </View>
                    </View>

                    {/* Milestones */}
                    {upcoming.length > 0 && <><Text style={s.sectionTitle}>sắp tới</Text>
                        {upcoming.map(m => <View key={m.days} style={[s.milestone, SHADOWS.soft]}><View style={s.mDot}><Text style={{ fontSize: 12 }}>⭐</Text></View><View style={{ flex: 1 }}><Text style={s.mLabel}>{m.label}</Text><Text style={s.mDate}>{formatDate(m.date)}</Text></View><View style={s.mBadge}><Text style={s.mBadgeText}>{m.daysUntil}d</Text></View></View>)}
                    </>}
                    {passed.length > 0 && <><Text style={s.sectionTitle}>đã qua</Text>
                        {[...passed].reverse().slice(0, 5).map(m => <View key={m.days} style={[s.milestone, SHADOWS.soft, { opacity: 0.6 }]}><View style={[s.mDot, { backgroundColor: 'rgba(102,187,106,0.15)' }]}><Text style={{ fontSize: 12 }}>✓</Text></View><View style={{ flex: 1 }}><Text style={s.mLabel}>{m.label}</Text><Text style={s.mDate}>{formatDate(m.date)}</Text></View></View>)}
                    </>}
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

    // Hero Card (Love8 style cover)
    heroCard: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
    heroBg: { padding: 28, alignItems: 'center' },
    heroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 8 },
    heroTimerRow: { flexDirection: 'row', alignItems: 'flex-start' },
    heroSep: { fontSize: 28, color: 'rgba(255,255,255,0.5)', fontWeight: '300', marginTop: 4, marginHorizontal: 4 },
    heroTimeBox: { alignItems: 'center' },
    heroTimeVal: { fontSize: 36, fontWeight: '900', color: '#fff' },
    heroTimeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: 1 },
    heroAvatars: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    heroAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Special Dates (Love8 unnamed (7).webp)
    specialSection: { marginHorizontal: 20, marginBottom: 20 },
    specialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    specialTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
    specialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardWhite, borderRadius: 16, padding: 16, marginBottom: 6, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden' },
    specialBar: { width: 4, height: '100%', borderRadius: 2, marginRight: 14, position: 'absolute', left: 0, top: 0, bottom: 0 },
    specialLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, paddingLeft: 8 },
    specialDays: { fontSize: 28, fontWeight: '900', color: COLORS.textDark, textAlign: 'right' },
    specialDaysLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'right' },

    // Anniversary Big Card
    annivBigCard: { marginHorizontal: 20, borderRadius: 24, padding: 28, alignItems: 'center', backgroundColor: COLORS.cardWhite, borderWidth: 1, borderColor: COLORS.borderPink, marginBottom: 16 },
    annivLabel: { fontSize: 15, fontWeight: '600', color: COLORS.primaryPink, textAlign: 'center' },
    annivBigDays: { fontSize: 56, fontWeight: '900', color: COLORS.primaryPink },
    annivSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

    // Stats
    statsCard: { marginHorizontal: 20, backgroundColor: COLORS.cardWhite, borderRadius: 18, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: COLORS.borderLight },
    statsHead: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: COLORS.primaryPink },
    statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },
    sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginHorizontal: 24, marginBottom: 10, letterSpacing: 3, textTransform: 'uppercase' },
    milestone: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: COLORS.cardWhite, borderRadius: 16, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: COLORS.borderLight },
    mDot: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.cardPinkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    mLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
    mDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    mBadge: { backgroundColor: COLORS.primaryPinkSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    mBadgeText: { fontSize: 11, color: COLORS.primaryPink, fontWeight: '600' },
});
