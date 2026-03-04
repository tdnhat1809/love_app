import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

const FEATURES = [
    { key: 'MissYou', label: 'Nhớ nhau', emoji: '💕', desc: 'Gửi nhớ nhung', colors: ['#f48fb1', '#e91e63'] },
    { key: 'Quiz', label: 'Love Quiz', emoji: '❤️', desc: 'Hiểu nhau bao nhiêu?', colors: ['#ce93d8', '#7c4dff'] },
    { key: 'Daily', label: 'Hôm nay', emoji: '💬', desc: 'Câu hỏi & Tâm trạng', colors: ['#90caf9', '#42a5f5'] },
    { key: 'VirtualPet', label: 'Pet', emoji: '🐱', desc: 'Nuôi thú cưng chung', colors: ['#ffcc80', '#ff9800'] },
    { key: 'Messages', label: 'Yêu thương', emoji: '💌', desc: 'Tin nhắn yêu', colors: ['#f48fb1', '#e94971'] },
];

export default function LoveHubScreen({ navigation }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const anims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        FEATURES.forEach((_, i) => {
            setTimeout(() => {
                Animated.spring(anims[i], { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
            }, i * 80);
        });
    }, []);

    return (
        <View style={s.container}>
            <LinearGradient colors={['#fce4ec', '#f3e5f5', '#ede7f6']} style={s.bg}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={s.header}>
                            <Text style={{ fontSize: 36 }}>💕</Text>
                            <Text style={s.title}>Yêu thương</Text>
                            <Text style={s.subtitle}>Tất cả tính năng tình yêu</Text>
                        </View>
                        <View style={s.grid}>
                            {FEATURES.map((f, i) => (
                                <Animated.View key={f.key} style={{ transform: [{ scale: anims[i] }], opacity: anims[i] }}>
                                    <TouchableOpacity style={s.card} onPress={() => navigation.navigate(f.key)} activeOpacity={0.8}>
                                        <LinearGradient colors={f.colors} style={s.cardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                            <Text style={{ fontSize: 28 }}>{f.emoji}</Text>
                                        </LinearGradient>
                                        <Text style={s.cardLabel}>{f.label}</Text>
                                        <Text style={s.cardDesc}>{f.desc}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const CARD_W = (width - 60) / 2;
const s = StyleSheet.create({
    container: { flex: 1 },
    bg: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },
    header: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginTop: 6 },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
    card: { width: CARD_W, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 18, alignItems: 'center', elevation: 3 },
    cardIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    cardLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
    cardDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, textAlign: 'center' },
});
