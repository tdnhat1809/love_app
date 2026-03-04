import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Dimensions, Animated, ScrollView,
    TouchableOpacity, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { getLoveDuration, COUPLE_NAMES, getNextAnniversary } from '../utils/dateUtils';
import { getDailyQuote, getRandomQuote } from '../data/quotes';
import { listenToPartnerStatus, updateMyStatus, isPaired, listenToMissYou, saveAvatar, listenToAvatars, getUserRole } from '../firebase/firebaseService';
import FloatingHearts from '../components/FloatingHearts';
import { getHolidayBanner, getDynamicGradient } from '../utils/holidayTheme';
import { getDaysUntilBirthday, getNhiAge, getUpcomingHoliday } from '../data/holidays';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const [duration, setDuration] = useState(getLoveDuration());
    const [quote, setQuote] = useState(getDailyQuote());
    const [nextAnniv, setNextAnniv] = useState(getNextAnniversary());
    const [partnerStatus, setPartnerStatus] = useState(null);
    const [paired, setPaired] = useState(false);
    const [missCount, setMissCount] = useState(0);
    const [avatars, setAvatars] = useState({});
    const [myRole, setMyRole] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [holidayBanner, setHolidayBanner] = useState({ show: false });
    const [dynamicGradient, setDynamicGradient] = useState(GRADIENTS.background);
    const [birthdayDays, setBirthdayDays] = useState(getDaysUntilBirthday());
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const heartScale = useRef(new Animated.Value(0.9)).current;

    const pickAvatar = async () => {
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], quality: 0.7,
            });
            if (res.canceled) return;

            setUploading(true);
            const base64 = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: 'base64' });
            await saveAvatar(base64);
            Alert.alert('✅', 'Avatar đã cập nhật!');
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể cập nhật avatar: ' + (e.message || ''));
        }
        setUploading(false);
    };

    useEffect(() => {
        const timer = setInterval(() => setDuration(getLoveDuration()), 1000);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();

        const heartbeat = () => {
            Animated.sequence([
                Animated.timing(heartScale, { toValue: 1.15, duration: 300, useNativeDriver: true }),
                Animated.timing(heartScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
                Animated.timing(heartScale, { toValue: 1.08, duration: 250, useNativeDriver: true }),
                Animated.timing(heartScale, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(1500),
            ]).start(() => heartbeat());
        };
        heartbeat();

        // Holiday banner & dynamic theme
        setHolidayBanner(getHolidayBanner());
        setDynamicGradient(getDynamicGradient());
        setBirthdayDays(getDaysUntilBirthday());

        (async () => {
            const p = await isPaired();
            setPaired(p);
            const role = await getUserRole();
            setMyRole(role);
            if (p) {
                const { getDeviceInfo } = require('../utils/deviceInfo');
                const info = await getDeviceInfo();
                const batStr = info.batteryLevel >= 0 ? `${info.batteryLevel}%` : '--';
                const netStr = info.networkType === 'wifi' ? '📶' : '📱';
                await updateMyStatus({ mood: '😊', status: 'Online', battery: batStr, wifi: netStr });
            }
        })();

        const unsubStatus = listenToPartnerStatus((data) => setPartnerStatus(data));
        const unsubMiss = listenToMissYou((data) => setMissCount(data.count || 0));
        const unsubAvatars = listenToAvatars((data) => setAvatars(data));

        return () => { clearInterval(timer); if (unsubStatus) unsubStatus(); if (unsubMiss) unsubMiss(); if (unsubAvatars) unsubAvatars(); };
    }, []);

    return (
        <View style={s.container}>
            <LinearGradient colors={dynamicGradient} style={s.bg}>
                <FloatingHearts count={5} />
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                        {/* Couple Header with Avatar Upload */}
                        <View style={s.coupleSection}>
                            <View style={s.avatarRow}>
                                <View style={s.avatarWrap}>
                                    <TouchableOpacity onPress={myRole === 'nhat' ? pickAvatar : null} activeOpacity={myRole === 'nhat' ? 0.7 : 1}>
                                        <LinearGradient colors={['#f48fb1', '#e94971']} style={s.avatarGrad}>
                                            {avatars.nhat?.url ? (
                                                <Image source={{ uri: avatars.nhat.url }} style={s.avatarImg} />
                                            ) : (
                                                <Text style={s.avatarEmoji}>👦</Text>
                                            )}
                                        </LinearGradient>
                                        {myRole === 'nhat' && (
                                            <View style={s.cameraBadge}>
                                                <Ionicons name="camera" size={12} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <Text style={s.avatarName}>Nhật</Text>
                                </View>
                                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                                    <Text style={s.heartIcon}>💕</Text>
                                </Animated.View>
                                <View style={s.avatarWrap}>
                                    <TouchableOpacity onPress={myRole === 'nhi' ? pickAvatar : null} activeOpacity={myRole === 'nhi' ? 0.7 : 1}>
                                        <LinearGradient colors={['#ce93d8', '#b39ddb']} style={s.avatarGrad}>
                                            {avatars.nhi?.url ? (
                                                <Image source={{ uri: avatars.nhi.url }} style={s.avatarImg} />
                                            ) : (
                                                <Text style={s.avatarEmoji}>👧</Text>
                                            )}
                                        </LinearGradient>
                                        {myRole === 'nhi' && (
                                            <View style={s.cameraBadge}>
                                                <Ionicons name="camera" size={12} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <Text style={s.avatarName}>Nhi</Text>
                                </View>
                            </View>
                            <Text style={s.sinceText}>Since 25 • 05 • 2022</Text>
                            {uploading && <Text style={{ fontSize: 11, color: COLORS.primaryPink, marginTop: 4 }}>Đang cập nhật avatar...</Text>}
                        </View>

                        {/* Holiday Banner */}
                        {holidayBanner.show && (
                            <TouchableOpacity activeOpacity={0.8}>
                                <LinearGradient colors={holidayBanner.colors || GRADIENTS.pink} style={s.holidayBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <Text style={s.holidayEmoji}>{holidayBanner.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.holidayTitle}>{holidayBanner.text}</Text>
                                        <Text style={s.holidaySub}>{holidayBanner.subtext}</Text>
                                    </View>
                                    {holidayBanner.daysUntil !== undefined && (
                                        <View style={s.holidayDaysBadge}>
                                            <Text style={s.holidayDaysNum}>{holidayBanner.daysUntil}</Text>
                                            <Text style={s.holidayDaysLabel}>ngày</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* Birthday Countdown */}
                        {birthdayDays <= 30 && birthdayDays > 0 && (
                            <View style={[s.birthdayCard, SHADOWS.soft]}>
                                <Text style={{ fontSize: 28 }}>🎂</Text>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={s.annivTitle}>Sinh nhật Nhi ({getNhiAge() + 1} tuổi)</Text>
                                    <Text style={s.annivSub}>05/04 — Còn {birthdayDays} ngày nữa!</Text>
                                </View>
                                <View style={[s.annivBadge, { backgroundColor: '#FFF3E0' }]}>
                                    <Text style={[s.annivDays, { color: '#FF6F00' }]}>{birthdayDays}</Text>
                                    <Text style={[s.annivDaysLabel, { color: '#FFB74D' }]}>ngày</Text>
                                </View>
                            </View>
                        )}

                        {/* Main Counter Card */}
                        <View style={[s.glassCard, SHADOWS.card]}>
                            <Text style={s.counterLabel}>Bên nhau</Text>
                            <View style={s.bigRow}>
                                <Text style={s.bigNumber}>{duration.totalDays.toLocaleString()}</Text>
                                <Text style={s.bigUnit}>ngày</Text>
                            </View>
                            <View style={s.statsRow}>
                                {[
                                    { val: duration.years, label: 'Năm', icon: '📅' },
                                    { val: duration.months, label: 'Tháng', icon: '🌙' },
                                    { val: duration.days, label: 'Ngày', icon: '☀️' },
                                ].map((item, i) => (
                                    <View key={i} style={s.statBox}>
                                        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                                        <Text style={s.statVal}>{item.val}</Text>
                                        <Text style={s.statLabel}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={s.timerRow}>
                                {[
                                    { val: duration.hours, label: 'giờ' },
                                    { val: duration.minutes, label: 'phút' },
                                    { val: duration.seconds, label: 'giây' },
                                ].map((item, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <Text style={s.timerSep}>:</Text>}
                                        <View style={s.timerBox}>
                                            <Text style={s.timerVal}>{item.val.toString().padStart(2, '0')}</Text>
                                            <Text style={s.timerLabel}>{item.label}</Text>
                                        </View>
                                    </React.Fragment>
                                ))}
                            </View>
                        </View>

                        {/* Partner Status Card (Love8 style) */}
                        <View style={[s.partnerCard, SHADOWS.soft]}>
                            <View style={s.partnerHeader}>
                                <View style={s.partnerAvatar}>
                                    {(() => {
                                        const partnerRole = partnerStatus?.role || (myRole === 'nhat' ? 'nhi' : 'nhat');
                                        const partnerAvatarUrl = avatars[partnerRole]?.url;
                                        return partnerAvatarUrl ? (
                                            <Image source={{ uri: partnerAvatarUrl }} style={s.partnerAvatarImg} />
                                        ) : (
                                            <Text style={{ fontSize: 24 }}>{partnerRole === 'nhi' ? '👧' : '👦'}</Text>
                                        );
                                    })()}
                                    <View style={[s.onlineDot, { backgroundColor: partnerStatus ? COLORS.online : '#ccc' }]} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={s.partnerName}>{partnerStatus?.name || (paired ? 'Đang kết nối...' : 'Chưa ghép đôi')}</Text>
                                    <Text style={s.partnerStatusText}>{partnerStatus?.status || 'Offline'}</Text>
                                </View>
                                <View style={s.missYouBadge}>
                                    <Text style={{ fontSize: 14 }}>💕</Text>
                                    <Text style={s.missNum}>{missCount}</Text>
                                </View>
                            </View>
                            <View style={s.partnerInfo}>
                                {[
                                    { icon: '🔋', val: partnerStatus?.battery || '--', label: 'Pin' },
                                    { icon: '📶', val: partnerStatus?.wifi || '--', label: 'Mạng' },
                                    { icon: '😊', val: partnerStatus?.mood || '--', label: 'Tâm trạng' },
                                    { icon: '📍', val: partnerStatus?.location || '--', label: 'Vị trí' },
                                ].map((item, i) => (
                                    <View key={i} style={s.infoItem}>
                                        <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                                        <Text style={s.infoVal}>{item.val}</Text>
                                        <Text style={s.infoLabel}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Miss You Mini Card */}
                        <TouchableOpacity onPress={() => navigation.navigate('Love', { screen: 'MissYou' })} activeOpacity={0.8}>
                            <View style={[s.missCard, SHADOWS.card]}>
                                <LinearGradient colors={['rgba(233,73,113,0.08)', 'rgba(206,147,216,0.06)']} style={s.missCardInner}>
                                    <View style={s.missLeft}>
                                        <Text style={{ fontSize: 32 }}>💗</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.missTitle}>I Miss You</Text>
                                        <Text style={s.missSub}>Đã nhớ nhau {missCount} lần</Text>
                                    </View>
                                    <View style={s.missBtnWrap}>
                                        <LinearGradient colors={GRADIENTS.pink} style={s.missBtn}>
                                            <Text style={s.missBtnText}>Gửi 💕</Text>
                                        </LinearGradient>
                                    </View>
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>

                        {/* Anniversary Card */}
                        <TouchableOpacity onPress={() => navigation.navigate('Memories', { screen: 'Anniversary' })} activeOpacity={0.8}>
                            <View style={[s.annivCard, SHADOWS.soft]}>
                                <View style={s.annivIconBox}><Text style={{ fontSize: 24 }}>🎉</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.annivTitle}>Kỷ niệm {nextAnniv.yearNumber} năm</Text>
                                    <Text style={s.annivSub}>Sắp đến rồi!</Text>
                                </View>
                                <View style={s.annivBadge}>
                                    <Text style={s.annivDays}>{nextAnniv.daysUntil}</Text>
                                    <Text style={s.annivDaysLabel}>ngày</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Quote Card */}
                        <TouchableOpacity onPress={() => setQuote(getRandomQuote())} activeOpacity={0.8}>
                            <View style={[s.quoteCard, SHADOWS.soft]}>
                                <View style={s.quoteLeft}><Text style={{ fontSize: 28 }}>💭</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.quoteText}>"{quote.text}"</Text>
                                    <Text style={s.quoteTap}>chạm để đổi ✨</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Quick Actions */}
                        <View style={s.actionsGrid}>
                            {[
                                { icon: 'chatbubbles', label: 'Nhắn tin', colors: ['#ce93d8', '#b39ddb'], tab: 'Chat' },
                                { icon: 'heart', label: 'I Miss U', colors: ['#f48fb1', '#e94971'], tab: 'Love', screen: 'MissYou' },
                                { icon: 'camera', label: 'Ảnh đẹp', colors: ['#90caf9', '#64b5f6'], tab: 'Memories', screen: 'Gallery' },
                                { icon: 'calendar', label: 'Kỷ niệm', colors: ['#a5d6a7', '#81c784'], tab: 'Memories', screen: 'Anniversary' },
                            ].map((item, i) => (
                                <TouchableOpacity key={i} style={s.actionCard} onPress={() => navigation.navigate(item.tab, item.screen ? { screen: item.screen } : undefined)} activeOpacity={0.7}>
                                    <LinearGradient colors={item.colors} style={s.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                        <View style={s.actionIconWrap}>
                                            <Ionicons name={item.icon} size={22} color="#fff" />
                                        </View>
                                        <Text style={s.actionLabel}>{item.label}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Love Stats */}
                        <View style={[s.glassCard, SHADOWS.soft, { marginBottom: 20 }]}>
                            <Text style={s.sectionHead}>tình yêu trong con số</Text>
                            <View style={s.loveStats}>
                                {[
                                    { num: duration.totalHours.toLocaleString(), label: 'giờ bên nhau', emoji: '⏰' },
                                    { num: Math.floor(duration.totalDays * 3).toLocaleString(), label: 'lần nói yêu', emoji: '💋' },
                                    { num: duration.totalMinutes.toLocaleString(), label: 'phút yêu thương', emoji: '💕' },
                                    { num: '∞', label: 'lần nhớ em', emoji: '💭' },
                                ].map((item, i) => (
                                    <View key={i} style={s.loveStatItem}>
                                        <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                                        <Text style={s.loveStatNum}>{item.num}</Text>
                                        <Text style={s.loveStatLabel}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 },
    scroll: { paddingBottom: 100 },
    coupleSection: { alignItems: 'center', paddingTop: 60, paddingBottom: 8 },
    avatarRow: { flexDirection: 'row', alignItems: 'center' },
    avatarWrap: { alignItems: 'center' },
    avatarGrad: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
    avatarEmoji: { fontSize: 32 },
    avatarImg: { width: 62, height: 62, borderRadius: 31 },
    cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primaryPink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    avatarName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 6 },
    heartIcon: { fontSize: 30, marginHorizontal: 20 },
    sinceText: { fontSize: 12, color: COLORS.textMuted, marginTop: 8, letterSpacing: 3 },
    glassCard: { marginHorizontal: 20, borderRadius: BORDER_RADIUS.xxl, backgroundColor: COLORS.cardWhite, padding: 24, marginTop: 16, borderWidth: 1, borderColor: COLORS.borderLight },
    counterLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
    bigRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
    bigNumber: { fontSize: 60, fontWeight: '900', color: COLORS.primaryPink },
    bigUnit: { fontSize: 18, color: COLORS.primaryPinkLight, fontWeight: '600', marginLeft: 8 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, marginBottom: 16, backgroundColor: COLORS.cardPink, borderRadius: BORDER_RADIUS.lg, padding: 12 },
    statBox: { alignItems: 'center' },
    statVal: { fontSize: 22, fontWeight: '800', color: COLORS.textDark, marginTop: 2 },
    statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    timerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    timerBox: { alignItems: 'center', minWidth: 48 },
    timerVal: { fontSize: 20, fontWeight: '700', color: COLORS.accentPurple, fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 9, color: COLORS.textMuted },
    timerSep: { fontSize: 18, color: COLORS.accentPurple, fontWeight: '300', marginHorizontal: 4 },

    // Partner Status Card
    partnerCard: { marginHorizontal: 20, marginTop: 14, borderRadius: BORDER_RADIUS.xl, padding: 16, backgroundColor: COLORS.cardWhite, borderWidth: 1, borderColor: COLORS.borderLight },
    partnerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.cardPinkSoft, alignItems: 'center', justifyContent: 'center' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
    partnerName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
    partnerStatusText: { fontSize: 12, color: COLORS.online, marginTop: 2 },
    missYouBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryPinkSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
    missNum: { fontSize: 14, fontWeight: '800', color: COLORS.primaryPink, marginLeft: 4 },
    partnerInfo: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: COLORS.cardPink, borderRadius: 14, padding: 12 },
    infoItem: { alignItems: 'center' },
    infoVal: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
    infoLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },

    // Miss You Card
    missCard: { marginHorizontal: 20, marginTop: 14, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderPink },
    missCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    missLeft: { marginRight: 12 },
    missTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primaryPink },
    missSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    missBtnWrap: { borderRadius: 12, overflow: 'hidden' },
    missBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    missBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Anniversary
    annivCard: { marginHorizontal: 20, marginTop: 14, borderRadius: BORDER_RADIUS.xl, padding: 16, backgroundColor: COLORS.cardWhite, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
    annivIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.cardPinkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    annivTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
    annivSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    annivBadge: { alignItems: 'center', backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
    annivDays: { fontSize: 20, fontWeight: '900', color: COLORS.primaryPink },
    annivDaysLabel: { fontSize: 10, color: COLORS.primaryPinkLight },

    // Quote
    quoteCard: { marginHorizontal: 20, marginTop: 14, borderRadius: BORDER_RADIUS.xl, padding: 16, backgroundColor: COLORS.cardWhite, flexDirection: 'row', borderWidth: 1, borderColor: COLORS.borderLight },
    quoteLeft: { marginRight: 12, marginTop: 2 },
    quoteText: { fontSize: 14, color: COLORS.textMedium, lineHeight: 22, fontStyle: 'italic' },
    quoteTap: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },

    // Actions
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, marginTop: 18 },
    actionCard: { width: '48%', margin: '1%', borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.soft },
    actionGrad: { padding: 18, minHeight: 80 },
    actionIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    actionLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Love Stats
    sectionHead: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 },
    loveStats: { flexDirection: 'row', flexWrap: 'wrap' },
    loveStatItem: { width: '50%', alignItems: 'center', paddingVertical: 12 },
    loveStatNum: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginTop: 4 },
    loveStatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

    // Holiday Banner
    holidayBanner: { marginHorizontal: 20, marginTop: 14, borderRadius: BORDER_RADIUS.xl, padding: 16, flexDirection: 'row', alignItems: 'center' },
    holidayEmoji: { fontSize: 32, marginRight: 12 },
    holidayTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    holidaySub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    holidayDaysBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
    holidayDaysNum: { fontSize: 20, fontWeight: '900', color: '#fff' },
    holidayDaysLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },

    // Birthday Card
    birthdayCard: { marginHorizontal: 20, marginTop: 14, borderRadius: BORDER_RADIUS.xl, padding: 16, backgroundColor: COLORS.cardWhite, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFE0B2' },

    // Partner Avatar Image
    partnerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
});
