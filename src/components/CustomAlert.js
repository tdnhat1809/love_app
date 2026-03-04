import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../theme';

const { width } = Dimensions.get('window');

// Global alert state
let _showAlert = null;

export function showAlert({ title, message, emoji = '💕', type = 'success', buttons = [{ text: 'OK' }] }) {
    if (_showAlert) _showAlert({ title, message, emoji, type, buttons });
}

// Type configs
const TYPE_CONFIG = {
    success: { colors: ['#4CAF50', '#66BB6A'], emoji: '🎉' },
    error: { colors: ['#ef5350', '#e53935'], emoji: '😢' },
    info: { colors: ['#7c4dff', '#b388ff'], emoji: '💡' },
    love: { colors: ['#e94971', '#FF6B9D'], emoji: '💕' },
    warning: { colors: ['#FF9800', '#FFB74D'], emoji: '⚠️' },
    lock: { colors: ['#7c4dff', '#b388ff'], emoji: '🔒' },
};

export default function CustomAlert() {
    const [visible, setVisible] = React.useState(false);
    const [config, setConfig] = React.useState({ title: '', message: '', emoji: '💕', type: 'success', buttons: [{ text: 'OK' }] });
    const scaleAnim = useRef(new Animated.Value(0.7)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        _showAlert = (cfg) => {
            setConfig(cfg);
            setVisible(true);
            scaleAnim.setValue(0.7);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        };
        return () => { _showAlert = null; };
    }, []);

    const handleClose = (onPress) => {
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setVisible(false);
            if (onPress) onPress();
        });
    };

    const typeConf = TYPE_CONFIG[config.type] || TYPE_CONFIG.success;
    const displayEmoji = config.emoji !== '💕' ? config.emoji : typeConf.emoji;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={() => handleClose()}>
            <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
                <Animated.View style={[s.alertBox, { transform: [{ scale: scaleAnim }] }]}>
                    {/* Emoji header */}
                    <View style={s.emojiWrap}>
                        <LinearGradient colors={typeConf.colors} style={s.emojiCircle}>
                            <Text style={s.emoji}>{displayEmoji}</Text>
                        </LinearGradient>
                    </View>

                    {/* Content */}
                    <Text style={s.title}>{config.title}</Text>
                    {config.message ? <Text style={s.message}>{config.message}</Text> : null}

                    {/* Buttons */}
                    <View style={s.btnRow}>
                        {config.buttons.map((btn, i) => {
                            const isMain = i === config.buttons.length - 1;
                            return isMain ? (
                                <TouchableOpacity key={i} style={[s.btn, { flex: 1 }]} onPress={() => handleClose(btn.onPress)} activeOpacity={0.8}>
                                    <LinearGradient colors={typeConf.colors} style={s.btnGrad}>
                                        <Text style={s.btnMainText}>{btn.text}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity key={i} style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => handleClose(btn.onPress)} activeOpacity={0.8}>
                                    <Text style={s.btnSecText}>{btn.text}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    alertBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: width - 60, maxWidth: 340, alignItems: 'center', elevation: 16 },
    emojiWrap: { marginTop: -48, marginBottom: 12 },
    emojiCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', elevation: 6 },
    emoji: { fontSize: 28 },
    title: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginBottom: 6 },
    message: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
    btn: { borderRadius: 14, overflow: 'hidden' },
    btnGrad: { paddingVertical: 13, alignItems: 'center' },
    btnMainText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnSecondary: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    btnSecText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
});
