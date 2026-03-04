import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, ScrollView
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from '../theme';
import { savePetData, listenToPet, feedPet, getUserRole } from '../firebase/firebaseService';

const { width } = Dimensions.get('window');

const MISSIONS = [
    { id: 'm1', label: 'Gửi lời yêu thương', emoji: '💬', points: 10 },
    { id: 'm2', label: 'Chụp ảnh selfie', emoji: '📸', points: 15 },
    { id: 'm3', label: 'Gọi điện cho nhau', emoji: '📞', points: 20 },
    { id: 'm4', label: 'Hôn nhau', emoji: '💋', points: 25 },
    { id: 'm5', label: 'Nói "Anh/Em yêu em/anh"', emoji: '❤️', points: 5 },
];

const PET_STAGES = [
    { minLevel: 1, name: 'Trứng tình yêu', emoji: '🥚', nextAt: 5 },
    { minLevel: 5, name: 'Baby Love', emoji: '🐣', nextAt: 15 },
    { minLevel: 15, name: 'Love Love', emoji: '💖', nextAt: 30 },
    { minLevel: 30, name: 'Super Love', emoji: '🌟', nextAt: 50 },
    { minLevel: 50, name: 'Ultimate Love', emoji: '👑', nextAt: 999 },
];

const getPetStage = (level) => {
    for (let i = PET_STAGES.length - 1; i >= 0; i--) {
        if (level >= PET_STAGES[i].minLevel) return PET_STAGES[i];
    }
    return PET_STAGES[0];
};

export default function VirtualPetScreen() {
    const [role, setRole] = useState('nhat');
    const [pet, setPet] = useState(null);
    const bounceAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        (async () => { const r = await getUserRole(); setRole(r || 'nhat'); })();
        const unsub = listenToPet((data) => {
            if (data) setPet(data);
            else initPet();
        });
        return () => unsub();
    }, []);

    const initPet = async () => {
        const defaultPet = { name: 'Love Love', level: 1, happiness: 50, hunger: 50, love: 0, daysTogether: 0, createdDate: new Date().toISOString().split('T')[0] };
        await savePetData(defaultPet);
    };

    const bounce = () => {
        Animated.sequence([
            Animated.timing(bounceAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
            Animated.timing(bounceAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(bounceAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
    };

    const doAction = async (action, stat, amount) => {
        if (!pet) return;
        bounce();
        const updated = { ...pet };
        updated[stat] = Math.min(100, (updated[stat] || 0) + amount);
        updated.love = (updated.love || 0) + 5;
        updated.level = Math.floor((updated.love || 0) / 50) + 1;
        await savePetData(updated);
        await feedPet(action);
    };

    const completeMission = async (mission) => {
        if (!pet) return;
        bounce();
        const today = new Date().toISOString().split('T')[0];
        const completedMissions = pet.completedMissions || {};
        if (completedMissions[`${today}_${mission.id}`]) {
            return showAlert({ title: 'Đã xong!', message: 'Đã hoàn thành nhiệm vụ này hôm nay rồi!', emoji: '🎉', type: 'info' });
        }
        completedMissions[`${today}_${mission.id}`] = true;
        const updated = {
            ...pet,
            love: (pet.love || 0) + mission.points,
            happiness: Math.min(100, (pet.happiness || 50) + 10),
            level: Math.floor(((pet.love || 0) + mission.points) / 50) + 1,
            completedMissions,
        };
        await savePetData(updated);
        showAlert({ title: 'Tuyệt vời!', message: `+${mission.points} Love Points!`, emoji: '🎉', type: 'love' });
    };

    if (!pet) {
        return (
            <View style={s.container}>
                <LinearGradient colors={['#fce4ec', '#fff3e0', '#f3e5f5']} style={[s.bg, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 40 }}>🥚</Text>
                    <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>Đang tải pet...</Text>
                </LinearGradient>
            </View>
        );
    }

    const stage = getPetStage(pet.level || 1);
    const today = new Date().toISOString().split('T')[0];
    const daysSinceCreated = pet.createdDate
        ? Math.floor((new Date() - new Date(pet.createdDate)) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <View style={s.container}>
            <LinearGradient colors={['#fce4ec', '#fff3e0', '#f3e5f5']} style={s.bg}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Days */}
                        <Text style={s.daysText}>Cùng nhau nuôi pet {daysSinceCreated} ngày 💕</Text>

                        {/* Pet display */}
                        <View style={s.petWrap}>
                            <Animated.View style={[s.petCircle, { transform: [{ scale: bounceAnim }] }]}>
                                <Text style={{ fontSize: 64 }}>{stage.emoji}</Text>
                            </Animated.View>
                            <Text style={s.petName}>{pet.name || 'Love Love'}</Text>
                            <View style={s.levelBadge}>
                                <Text style={s.levelText}>Lv.{pet.level || 1}</Text>
                            </View>
                            <Text style={s.stageName}>{stage.name}</Text>
                        </View>

                        {/* Stats */}
                        <View style={s.statsCard}>
                            <View style={s.statRow}>
                                <Text style={s.statLabel}>😊 Vui vẻ</Text>
                                <View style={s.statBarWrap}><View style={[s.statBar, { width: `${pet.happiness || 50}%`, backgroundColor: '#4CAF50' }]} /></View>
                                <Text style={s.statVal}>{pet.happiness || 50}%</Text>
                            </View>
                            <View style={s.statRow}>
                                <Text style={s.statLabel}>🍰 No bụng</Text>
                                <View style={s.statBarWrap}><View style={[s.statBar, { width: `${pet.hunger || 50}%`, backgroundColor: '#FF9800' }]} /></View>
                                <Text style={s.statVal}>{pet.hunger || 50}%</Text>
                            </View>
                            <View style={s.statRow}>
                                <Text style={s.statLabel}>💕 Love</Text>
                                <View style={s.statBarWrap}><View style={[s.statBar, { width: `${Math.min(100, ((pet.love || 0) / (stage.nextAt * 50)) * 100)}%`, backgroundColor: '#e94971' }]} /></View>
                                <Text style={s.statVal}>{pet.love || 0}</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={s.actionRow}>
                            <TouchableOpacity style={s.actionBtn} onPress={() => doAction('feed', 'hunger', 15)}>
                                <View style={[s.actionIcon, { backgroundColor: '#fff3e0' }]}><Text style={{ fontSize: 22 }}>🍰</Text></View>
                                <Text style={s.actionLabel}>Cho ăn</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.actionBtn} onPress={() => doAction('play', 'happiness', 15)}>
                                <View style={[s.actionIcon, { backgroundColor: '#e8f5e9' }]}><Text style={{ fontSize: 22 }}>🎮</Text></View>
                                <Text style={s.actionLabel}>Chơi</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.actionBtn} onPress={() => doAction('pet', 'happiness', 10)}>
                                <View style={[s.actionIcon, { backgroundColor: '#fce4ec' }]}><Text style={{ fontSize: 22 }}>🤗</Text></View>
                                <Text style={s.actionLabel}>Vuốt ve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.actionBtn} onPress={() => doAction('love', 'happiness', 20)}>
                                <View style={[s.actionIcon, { backgroundColor: '#f3e5f5' }]}><Text style={{ fontSize: 22 }}>💕</Text></View>
                                <Text style={s.actionLabel}>Yêu</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Daily Missions */}
                        <View style={s.missionCard}>
                            <Text style={s.missionTitle}>🎯 Nhiệm vụ hôm nay</Text>
                            {MISSIONS.map(m => {
                                const done = pet.completedMissions?.[`${today}_${m.id}`];
                                return (
                                    <TouchableOpacity key={m.id} style={s.missionRow} onPress={() => !done && completeMission(m)} disabled={done}>
                                        <View style={[s.missionCheck, done && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}>
                                            {done && <Ionicons name="checkmark" size={14} color="#fff" />}
                                        </View>
                                        <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                                        <Text style={[s.missionLabel, done && { textDecorationLine: 'line-through', color: '#bbb' }]}>{m.label}</Text>
                                        <Text style={s.missionPoints}>+{m.points}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    bg: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },
    daysText: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
    petWrap: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
    petCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', elevation: 8, borderWidth: 3, borderColor: '#fce4ec' },
    petName: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, marginTop: 12 },
    levelBadge: { backgroundColor: COLORS.primaryPink, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, marginTop: 6 },
    levelText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    stageName: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
    statsCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 20, marginBottom: 20 },
    statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 13, fontWeight: '700', width: 80, color: COLORS.textDark },
    statBarWrap: { flex: 1, height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
    statBar: { height: '100%', borderRadius: 4 },
    statVal: { fontSize: 12, fontWeight: '800', color: COLORS.textMedium, width: 36, textAlign: 'right' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    actionBtn: { alignItems: 'center' },
    actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    actionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textDark, marginTop: 6 },
    missionCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 20 },
    missionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 14 },
    missionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    missionCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    missionLabel: { flex: 1, fontSize: 14, color: COLORS.textDark, marginLeft: 8 },
    missionPoints: { fontSize: 12, fontWeight: '800', color: COLORS.primaryPink },
});
