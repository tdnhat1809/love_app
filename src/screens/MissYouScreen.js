import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { sendMissYou, listenToMissYou, isPaired } from '../firebase/firebaseService';

const { width } = Dimensions.get('window');

export default function MissYouScreen({ navigation }) {
    const [count, setCount] = useState(0);
    const [lastSender, setLastSender] = useState('');
    const [paired, setPaired] = useState(false);
    const [tapping, setTapping] = useState(false);
    const heartScale = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const ripple1 = useRef(new Animated.Value(0)).current;
    const ripple2 = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const floatHearts = useRef([...Array(6)].map(() => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
    }))).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        (async () => { setPaired(await isPaired()); })();
        const unsub = listenToMissYou((data) => {
            setCount(data.count || 0);
            setLastSender(data.lastSenderName || '');
        });
        // Glow animation loop
        Animated.loop(Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])).start();
        return () => { if (unsub) unsub(); };
    }, []);

    const animateFloatingHeart = (index) => {
        const h = floatHearts[index];
        const randX = (Math.random() - 0.5) * 200;
        h.x.setValue(0); h.y.setValue(0); h.opacity.setValue(1); h.scale.setValue(0.3);
        Animated.parallel([
            Animated.timing(h.x, { toValue: randX, duration: 1500, useNativeDriver: true }),
            Animated.timing(h.y, { toValue: -250 - Math.random() * 150, duration: 1500, useNativeDriver: true }),
            Animated.timing(h.opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
            Animated.spring(h.scale, { toValue: 1 + Math.random() * 0.5, friction: 4, useNativeDriver: true }),
        ]).start();
    };

    const handleMiss = async () => {
        if (tapping) return;
        setTapping(true);
        Vibration.vibrate(50);

        // Heart beat animation
        Animated.sequence([
            Animated.spring(heartScale, { toValue: 1.35, friction: 3, useNativeDriver: true }),
            Animated.spring(heartScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]).start();

        // Ripple effects
        ripple1.setValue(0); ripple2.setValue(0);
        Animated.stagger(200, [
            Animated.timing(ripple1, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(ripple2, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]).start();

        // Float hearts
        floatHearts.forEach((_, i) => setTimeout(() => animateFloatingHeart(i), i * 100));

        try {
            if (paired) { const newCount = await sendMissYou(); setCount(newCount); }
            else { setCount(c => c + 1); }
        } catch (e) { console.log(e); }
        setTimeout(() => setTapping(false), 600);
    };

    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
    const rippleScale1 = ripple1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
    const rippleOp1 = ripple1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.15, 0] });
    const rippleScale2 = ripple2.interpolate({ inputRange: [0, 1], outputRange: [1, 3] });
    const rippleOp2 = ripple2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

    return (
        <View style={s.container}>
            <LinearGradient colors={['#fce4ec', '#f8bbd0', '#f3e5f5']} style={s.bg}>
                <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
                    <View style={s.header}>
                        <Text style={s.title}>I Miss You</Text>
                        <Text style={s.subtitle}>Nhấn vào trái tim để gửi nhớ nhung 💕</Text>
                    </View>

                    <View style={s.heartArea}>
                        {/* Glow behind heart */}
                        <Animated.View style={[s.glow, { opacity: glowOpacity }]} />

                        {/* Ripple effects */}
                        <Animated.View style={[s.ripple, { transform: [{ scale: rippleScale1 }], opacity: rippleOp1 }]} />
                        <Animated.View style={[s.ripple, { transform: [{ scale: rippleScale2 }], opacity: rippleOp2 }]} />

                        {/* Floating hearts */}
                        {floatHearts.map((h, i) => (
                            <Animated.Text key={i} style={[s.floatHeart, {
                                transform: [{ translateX: h.x }, { translateY: h.y }, { scale: h.scale }],
                                opacity: h.opacity,
                            }]}>
                                {['💕', '💗', '💖', '💘', '❤️', '✨'][i]}
                            </Animated.Text>
                        ))}

                        {/* Main heart button */}
                        <TouchableOpacity onPress={handleMiss} activeOpacity={0.8}>
                            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                                <LinearGradient colors={['#ff6b9d', '#e94971', '#d81b60']} style={s.heartBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <Text style={s.heartEmoji}>💕</Text>
                                    <Text style={s.counterBig}>x{count}</Text>
                                    <Text style={s.counterLabel}>Times</Text>
                                </LinearGradient>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>

                    <Text style={s.tapHint}>long press to send</Text>

                    {lastSender ? (
                        <View style={[s.lastCard, SHADOWS.soft]}>
                            <Text style={{ fontSize: 20 }}>💌</Text>
                            <Text style={s.lastText}>Lần cuối bởi <Text style={{ fontWeight: '700', color: COLORS.primaryPink }}>{lastSender}</Text></Text>
                        </View>
                    ) : null}

                    {/* Emotion stickers */}
                    <View style={s.stickersRow}>
                        {[
                            { emoji: '🥰', label: 'Yêu', color: '#f48fb1' },
                            { emoji: '😘', label: 'Hôn', color: '#ce93d8' },
                            { emoji: '🤗', label: 'Ôm', color: '#90caf9' },
                            { emoji: '😍', label: 'Mê', color: '#a5d6a7' },
                            { emoji: '💋', label: 'Kiss', color: '#ffab91' },
                        ].map((item, i) => (
                            <TouchableOpacity key={i} style={[s.stickerBtn, { backgroundColor: item.color + '20' }]} onPress={handleMiss} activeOpacity={0.7}>
                                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                                <Text style={[s.stickerLabel, { color: item.color }]}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {!paired && (
                        <TouchableOpacity style={s.pairHint} onPress={() => navigation.navigate('More', { screen: 'Pairing' })} activeOpacity={0.7}>
                            <LinearGradient colors={GRADIENTS.pinkSoft} style={s.pairGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="link" size={16} color="#fff" />
                                <Text style={s.pairText}>Ghép đôi để gửi nhớ nhung</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </LinearGradient>
        </View>
    );
}

const HEART_SIZE = width * 0.5;
const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 24, alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '900', color: COLORS.primaryPink, letterSpacing: 1 },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
    heartArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
    glow: { position: 'absolute', width: HEART_SIZE * 1.8, height: HEART_SIZE * 1.8, borderRadius: HEART_SIZE, backgroundColor: '#ff6b9d' },
    ripple: { position: 'absolute', width: HEART_SIZE, height: HEART_SIZE, borderRadius: HEART_SIZE / 2, borderWidth: 3, borderColor: '#f48fb1' },
    heartBtn: { width: HEART_SIZE, height: HEART_SIZE, borderRadius: HEART_SIZE / 2, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
    heartEmoji: { fontSize: 40 },
    counterBig: { fontSize: 42, fontWeight: '900', color: '#fff', marginTop: -4 },
    counterLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    floatHeart: { position: 'absolute', fontSize: 28 },
    tapHint: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: -10, marginBottom: 16 },
    lastCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 40, padding: 14, backgroundColor: COLORS.cardWhite, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 20 },
    lastText: { fontSize: 13, color: COLORS.textMedium, marginLeft: 10 },
    stickersRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 20 },
    stickerBtn: { alignItems: 'center', padding: 10, borderRadius: 16, marginHorizontal: 4, minWidth: 56 },
    stickerLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },
    pairHint: { marginHorizontal: 40, borderRadius: 14, overflow: 'hidden' },
    pairGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 13 },
    pairText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 13 },
});
