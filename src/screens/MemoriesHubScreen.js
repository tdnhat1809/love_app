import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

const FEATURES = [
    { key: 'Gallery', label: 'Ảnh chung', emoji: '📸', desc: 'Bộ sưu tập ảnh', colors: ['#4fc3f7', '#0288d1'] },
    { key: 'Journal', label: 'Nhật ký', emoji: '📖', desc: 'Ghi lại kỷ niệm', colors: ['#ffcc80', '#ff9800'] },
    { key: 'TimeCapsule', label: 'Capsule', emoji: '💌', desc: 'Hộp thời gian', colors: ['#b39ddb', '#7c4dff'] },
    { key: 'Anniversary', label: 'Đặc biệt', emoji: '🎁', desc: 'Ngày kỷ niệm', colors: ['#f48fb1', '#e91e63'] },
];

export default function MemoriesHubScreen({ navigation }) {
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
            <LinearGradient colors={['#fff3e0', '#fce4ec', '#f3e5f5']} style={s.bg}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={s.header}>
                            <Text style={{ fontSize: 36 }}>📸</Text>
                            <Text style={s.title}>Kỷ niệm</Text>
                            <Text style={s.subtitle}>Lưu giữ những khoảnh khắc</Text>
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
