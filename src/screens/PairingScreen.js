import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { createCoupleCode, joinCoupleCode, getCoupleCode, isPaired, getUserRole, setUserRole } from '../firebase/firebaseService';

const showMsg = (title, msg) => {
    if (Platform.OS === 'web') { window.alert(`${title}\n${msg}`); }
    else { Alert.alert(title, msg); }
};

export default function PairingScreen({ onPaired }) {
    const [coupleCode, setCoupleCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [paired, setPaired] = useState(false);
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkPairing();
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const checkPairing = async () => {
        try {
            const code = await getCoupleCode();
            const r = await getUserRole();
            if (code) setCoupleCode(code);
            if (r) setRole(r);
            const p = await isPaired();
            setPaired(p);
            if (p && r && onPaired) onPaired();
        } catch (e) {
            console.log('Check pairing error:', e);
        }
    };

    const selectRole = async (r) => {
        try {
            await setUserRole(r);
            setRole(r);
            setError('');
            setSuccess(`Đã chọn: ${r === 'nhat' ? 'Nhật 👦' : 'Nhi 👧'}`);
        } catch (e) {
            console.log('selectRole error:', e);
        }
    };

    const handleCreate = async () => {
        setError(''); setSuccess('');
        if (!role) { setError('⚠️ Chọn bạn là Nhật hoặc Nhi trước!'); return; }
        setLoading(true);
        try {
            console.log('Creating couple code...');
            const code = await createCoupleCode();
            console.log('Code created:', code);
            setCoupleCode(code);
            setSuccess(`✅ Mã ghép đôi: ${code} — Gửi mã này cho người yêu!`);
        } catch (e) {
            console.error('Create code error:', e);
            setError(`❌ Lỗi: ${e.message}`);
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        setError(''); setSuccess('');
        if (!role) { setError('⚠️ Chọn bạn là ai trước!'); return; }
        if (!inputCode.trim()) { setError('⚠️ Nhập mã ghép đôi!'); return; }
        setLoading(true);
        try {
            await joinCoupleCode(inputCode.trim());
            setPaired(true);
            setSuccess('💕 Ghép đôi thành công!');
            if (onPaired) onPaired();
        } catch (e) {
            console.error('Join code error:', e);
            setError(`❌ ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={GRADIENTS.background} style={s.bg}>
                <Animated.View style={[s.content, { opacity: fadeAnim }]}>
                    <View style={s.heroArea}>
                        <View style={s.coupleIcon}>
                            <View style={s.avatarSmall}><Text style={{ fontSize: 28 }}>👦</Text></View>
                            <View style={s.heartLink}><LinearGradient colors={GRADIENTS.pink} style={s.heartGrad}><Ionicons name="heart" size={14} color="#fff" /></LinearGradient></View>
                            <View style={s.avatarSmall}><Text style={{ fontSize: 28 }}>👧</Text></View>
                        </View>
                        <Text style={s.title}>Ghép đôi</Text>
                        <Text style={s.subtitle}>Kết nối hai điện thoại để nhắn tin 💕</Text>
                    </View>

                    {/* Status messages */}
                    {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
                    {success ? <View style={s.successBox}><Text style={s.successText}>{success}</Text></View> : null}

                    <Text style={s.label}>Bạn là ai?</Text>
                    <View style={s.roleRow}>
                        {['nhat', 'nhi'].map(r => (
                            <TouchableOpacity key={r} style={[s.roleBtn, SHADOWS.soft, role === r && s.roleActive]} onPress={() => selectRole(r)} activeOpacity={0.7}>
                                <Text style={{ fontSize: 26, marginBottom: 4 }}>{r === 'nhat' ? '👦' : '👧'}</Text>
                                <Text style={[s.roleText, role === r && s.roleTextActive]}>{r === 'nhat' ? 'Nhật' : 'Nhi'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {paired ? (
                        <View style={[s.pairedBox, SHADOWS.card]}>
                            <Ionicons name="checkmark-circle" size={40} color={COLORS.online} />
                            <Text style={s.pairedText}>Đã ghép đôi thành công!</Text>
                            <Text style={s.pairedCode}>Mã: {coupleCode}</Text>
                            <Text style={s.pairedHint}>Vào tab "Nhắn tin" để chat 💕</Text>
                        </View>
                    ) : (<>
                        <View style={[s.section, SHADOWS.soft]}>
                            <View style={s.sectionHead}>
                                <View style={s.sectionIcon}><Text style={{ fontSize: 16 }}>📱</Text></View>
                                <View><Text style={s.sectionTitle}>Điện thoại thứ nhất</Text><Text style={s.sectionSub}>Tạo mã và gửi cho người yêu</Text></View>
                            </View>
                            {coupleCode ? (
                                <View style={s.codeBox}>
                                    <Text style={s.codeDisplay}>{coupleCode}</Text>
                                    <TouchableOpacity onPress={() => { setSuccess(`📋 Mã: ${coupleCode}`); }}><Ionicons name="copy-outline" size={18} color={COLORS.primaryPink} /></TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={handleCreate} activeOpacity={0.7} disabled={loading} style={{ borderRadius: 14, overflow: 'hidden', opacity: loading ? 0.5 : 1 }}>
                                    <LinearGradient colors={GRADIENTS.pink} style={s.createGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="link" size={18} color="#fff" />}
                                        <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>{loading ? 'Đang tạo...' : 'Tạo mã ghép đôi'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[s.section, SHADOWS.soft]}>
                            <View style={s.sectionHead}>
                                <View style={s.sectionIcon}><Text style={{ fontSize: 16 }}>📲</Text></View>
                                <View><Text style={s.sectionTitle}>Điện thoại thứ hai</Text><Text style={s.sectionSub}>Nhập mã từ người yêu</Text></View>
                            </View>
                            <View style={s.joinRow}>
                                <TextInput style={s.joinInput} placeholder="Nhập mã..." placeholderTextColor={COLORS.textMuted} value={inputCode} onChangeText={setInputCode} autoCapitalize="characters" maxLength={6} />
                                <TouchableOpacity onPress={handleJoin} disabled={loading} style={{ borderRadius: 14, overflow: 'hidden', opacity: loading ? 0.5 : 1 }}>
                                    <LinearGradient colors={GRADIENTS.purple} style={s.joinGrad}>
                                        <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? '...' : 'Ghép 💕'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>)}
                </Animated.View>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    heroArea: { alignItems: 'center', marginBottom: 20 },
    coupleIcon: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.cardWhite, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft },
    heartLink: { marginHorizontal: 10, borderRadius: 14, overflow: 'hidden' },
    heartGrad: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 26, fontWeight: '800', color: COLORS.textDark },
    subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
    label: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
    roleRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    roleBtn: { alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: COLORS.cardWhite, marginHorizontal: 8, minWidth: 100, borderWidth: 2, borderColor: 'transparent' },
    roleActive: { borderColor: COLORS.primaryPink, backgroundColor: COLORS.primaryPinkSoft },
    roleText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
    roleTextActive: { color: COLORS.primaryPink },
    errorBox: { backgroundColor: '#ffebee', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ef9a9a' },
    errorText: { color: '#c62828', fontSize: 13, textAlign: 'center' },
    successBox: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#a5d6a7' },
    successText: { color: '#2e7d32', fontSize: 13, textAlign: 'center', fontWeight: '600' },
    section: { backgroundColor: COLORS.cardWhite, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderLight },
    sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primaryPinkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
    sectionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    createGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14 },
    codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderPink },
    codeDisplay: { fontSize: 26, fontWeight: '900', color: COLORS.primaryPink, letterSpacing: 6, marginRight: 12 },
    joinRow: { flexDirection: 'row' },
    joinInput: { flex: 1, backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, padding: 14, color: COLORS.textDark, fontSize: 18, fontWeight: '700', letterSpacing: 4, textAlign: 'center', borderWidth: 1, borderColor: COLORS.borderPink, marginRight: 8 },
    joinGrad: { padding: 14, paddingHorizontal: 22, justifyContent: 'center' },
    pairedBox: { alignItems: 'center', padding: 28, backgroundColor: COLORS.cardWhite, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(102,187,106,0.2)' },
    pairedText: { fontSize: 18, fontWeight: '700', color: COLORS.online, marginTop: 12 },
    pairedCode: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
    pairedHint: { fontSize: 13, color: COLORS.textMuted, marginTop: 10 },
});
