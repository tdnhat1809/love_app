import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Dimensions, Image, Modal, StatusBar, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { sendChatMessage, listenToMessages, getDeviceId, getUserRole, isPaired, listenToAvatars, addReaction } from '../firebase/firebaseService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');
const REACTION_EMOJIS = ['❤️', '😂', '😢', '😮', '🔥', '👍'];

export default function ChatScreen({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [myDeviceId, setMyDeviceId] = useState('');
    const [myRole, setMyRole] = useState('');
    const [paired, setPaired] = useState(false);
    const [sending, setSending] = useState(false);
    const [avatars, setAvatars] = useState({});
    const [reactionMsg, setReactionMsg] = useState(null);
    const [zoomImage, setZoomImage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let unsub = null;
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        (async () => {
            const id = await getDeviceId(); const role = await getUserRole(); const p = await isPaired();
            setMyDeviceId(id); setMyRole(role || 'nhat'); setPaired(p);
            if (p) unsub = listenToMessages((msgs) => setMessages(msgs));
        })();
        const unsubAvatars = listenToAvatars((data) => setAvatars(data));
        return () => { if (unsub) unsub(); if (unsubAvatars) unsubAvatars(); };
    }, []);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try { await sendChatMessage(text.trim()); setText(''); }
        catch (e) { alert(e.message); }
        setSending(false);
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
                setSending(true);
                setUploadProgress('📷 Đang gửi ảnh...');
                const uri = result.assets[0].uri;
                try {
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                    if (!base64 || base64.length < 100) {
                        setUploadProgress(null);
                        alert('Base64 rỗng hoặc quá ngắn');
                        return;
                    }
                    await sendChatMessage('[📷 Ảnh]', base64);
                } catch (err) {
                    alert('Lỗi gửi ảnh: ' + (err.message || ''));
                } finally {
                    setSending(false);
                    setUploadProgress(null);
                }
            }
        } catch (e) {
            alert('Chọn ảnh thất bại: ' + (e.message || ''));
            setSending(false);
            setUploadProgress(null);
        }
    };

    const [videoModal, setVideoModal] = useState(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoLoading, setVideoLoading] = useState(true);
    const videoRef = useRef(null);

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                videoQuality: 0,
                videoMaxDuration: 300,
            });
            if (!result.canceled && result.assets[0]) {
                setSending(true);
                setUploadProgress('🎬 Đang tải video lên...');
                const uri = result.assets[0].uri;
                try {
                    await sendChatMessage('', null, uri);
                } catch (err) {
                    alert('Lỗi gửi video: ' + (err.message || ''));
                } finally {
                    setSending(false);
                    setUploadProgress(null);
                }
            }
        } catch (e) {
            alert('Chọn video thất bại: ' + (e.message || ''));
            setSending(false);
            setUploadProgress(null);
        }
    };

    const handleReaction = async (emoji) => {
        if (!reactionMsg) return;
        try {
            await addReaction(reactionMsg.id, emoji);
        } catch (e) {
            console.log('Reaction error:', e);
        }
        setReactionMsg(null);
    };

    const fmt = (ts) => { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; };
    const fmtDate = (ts) => { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); const t = new Date(); if (d.toDateString() === t.toDateString()) return 'Hôm nay'; const y = new Date(t); y.setDate(t.getDate() - 1); if (d.toDateString() === y.toDateString()) return 'Hôm qua'; return d.toLocaleDateString('vi-VN'); };

    if (!paired) {
        return (
            <View style={s.container}>
                <LinearGradient colors={GRADIENTS.background} style={s.bg}>
                    <Animated.View style={[s.notPaired, { opacity: fadeAnim }]}>
                        <View style={s.npIcon}><Text style={{ fontSize: 48 }}>🔗</Text></View>
                        <Text style={s.npTitle}>Chưa ghép đôi</Text>
                        <Text style={s.npSub}>Kết nối hai điện thoại để bắt đầu{'\n'}nhắn tin cho nhau 💕</Text>
                        <TouchableOpacity style={s.npBtn} onPress={() => navigation.navigate('More', { screen: 'Pairing' })} activeOpacity={0.7}>
                            <LinearGradient colors={GRADIENTS.pink} style={s.npBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="link" size={18} color="#fff" />
                                <Text style={s.npBtnText}>Ghép đôi ngay</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </LinearGradient>
            </View>
        );
    }

    const renderMessage = ({ item, index }) => {
        const isMe = item.senderId === myDeviceId;
        const showDate = index === messages.length - 1 || (messages[index + 1] && fmtDate(item.createdAt) !== fmtDate(messages[index + 1]?.createdAt));
        const reactions = item.reactions || {};
        const reactionList = Object.entries(reactions);
        return (
            <View>
                {showDate && <View style={s.dateRow}><View style={s.dateLine} /><Text style={s.dateText}>💕 {fmtDate(item.createdAt)} 💕</Text><View style={s.dateLine} /></View>}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => setReactionMsg(item)}
                    delayLongPress={300}
                >
                    <View style={[s.msgRow, isMe ? s.msgRight : s.msgLeft]}>
                        {!isMe && <View style={s.msgAvatar}>
                            {(() => {
                                const senderRole = item.senderName === 'Nhi' ? 'nhi' : 'nhat';
                                const avatarUrl = avatars[senderRole]?.url;
                                return avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                                ) : (
                                    <Text style={{ fontSize: 16 }}>{item.senderName === 'Nhi' ? '👧' : '👦'}</Text>
                                );
                            })()}
                        </View>}
                        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubblePartner]}>
                            {item.videoUrl ? (
                                <TouchableOpacity activeOpacity={0.9} onPress={() => { setVideoModal(item.videoUrl); setVideoPlaying(true); setVideoLoading(true); }}>
                                    <View style={s.videoWrap}>
                                        <Video
                                            source={{ uri: item.videoUrl }}
                                            style={s.chatVideo}
                                            resizeMode={ResizeMode.COVER}
                                            shouldPlay={false}
                                            isMuted
                                            positionMillis={500}
                                        />
                                        <View style={s.videoOverlay}>
                                            <View style={s.videoPlayBtn}>
                                                <Ionicons name="play" size={24} color="#fff" />
                                            </View>
                                        </View>
                                        <View style={s.videoBadge}>
                                            <Ionicons name="videocam" size={12} color="#fff" />
                                            <Text style={s.videoBadgeText}>Video</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ) : item.imageUrl ? (
                                <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomImage(item.imageUrl)}>
                                    <Image source={{ uri: item.imageUrl }} style={s.chatImage} resizeMode="cover" />
                                    <View style={s.zoomHint}>
                                        <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.8)" />
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <Text style={[s.msgText, isMe && s.msgTextMe]}>{item.text}</Text>
                            )}
                            <Text style={[s.timeText, isMe && { textAlign: 'right', color: 'rgba(255,255,255,0.6)' }]}>{fmt(item.createdAt)}</Text>
                        </View>
                    </View>
                    {/* Reactions display */}
                    {reactionList.length > 0 && (
                        <View style={[s.reactionsRow, isMe ? s.reactionsRight : s.reactionsLeft]}>
                            {reactionList.map(([name, emoji]) => (
                                <View key={name} style={s.reactionChip}>
                                    <Text style={s.reactionEmoji}>{emoji}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={GRADIENTS.background} style={s.bg}>
                <View style={[s.header, SHADOWS.soft]}>
                    <View style={s.headerAv}>
                        {avatars.nhat?.url ? <Image source={{ uri: avatars.nhat.url }} style={{ width: 28, height: 28, borderRadius: 14 }} /> : <Text style={{ fontSize: 16 }}>👦</Text>}
                        {avatars.nhi?.url ? <Image source={{ uri: avatars.nhi.url }} style={{ width: 28, height: 28, borderRadius: 14, marginLeft: -4 }} /> : <Text style={{ fontSize: 16, marginLeft: -4 }}>👧</Text>}
                    </View>
                    <View style={{ flex: 1 }}><Text style={s.headerTitle}>Nhật & Nhi</Text><View style={s.onlineRow}><View style={s.dot} /><Text style={s.onlineText}>Online</Text></View></View>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                    <FlatList data={messages} renderItem={renderMessage} keyExtractor={i => i.id} inverted contentContainerStyle={s.msgList} showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40 }}>💌</Text><Text style={s.emptyText}>Gửi tin nhắn đầu tiên cho{'\n'}người yêu nào! 💕</Text></View>} />

                    {/* Upload Progress */}
                    {uploadProgress && (
                        <View style={s.uploadBar}>
                            <ActivityIndicator size="small" color={COLORS.primaryPink} />
                            <Text style={s.uploadText}>{uploadProgress}</Text>
                        </View>
                    )}
                    <View style={s.inputWrap}>
                        <TouchableOpacity style={s.photoBtn} onPress={pickImage} disabled={sending}>
                            <Ionicons name="image-outline" size={22} color={COLORS.primaryPink} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.photoBtn} onPress={pickVideo} disabled={sending}>
                            <Ionicons name="videocam-outline" size={22} color={COLORS.primaryPink} />
                        </TouchableOpacity>
                        <TextInput style={s.input} placeholder="Nhập tin nhắn yêu thương..." placeholderTextColor={COLORS.textMuted} value={text} onChangeText={setText} multiline maxLength={500} />
                        {sending ? (
                            <View style={s.sendBtn}><ActivityIndicator size="small" color={COLORS.primaryPink} /></View>
                        ) : (
                            <TouchableOpacity style={[s.sendBtn, !text.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!text.trim()}>
                                <LinearGradient colors={GRADIENTS.pink} style={s.sendGrad}><Ionicons name="send" size={18} color="#fff" /></LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>

                {/* Reaction Picker Modal */}
                <Modal visible={!!reactionMsg} transparent animationType="fade" onRequestClose={() => setReactionMsg(null)}>
                    <TouchableOpacity style={s.reactionOverlay} activeOpacity={1} onPress={() => setReactionMsg(null)}>
                        <View style={s.reactionPicker}>
                            <Text style={s.reactionPickerTitle}>Thả cảm xúc 💕</Text>
                            <View style={s.reactionPickerRow}>
                                {REACTION_EMOJIS.map(emoji => (
                                    <TouchableOpacity key={emoji} style={s.reactionPickerBtn} onPress={() => handleReaction(emoji)} activeOpacity={0.6}>
                                        <Text style={s.reactionPickerEmoji}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {reactionMsg && reactionMsg.text && (
                                <Text style={s.reactionPreview} numberOfLines={2}>"{reactionMsg.text}"</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Image Zoom Modal */}
                <Modal visible={!!zoomImage} transparent animationType="fade" onRequestClose={() => setZoomImage(null)} statusBarTranslucent>
                    <StatusBar hidden={!!zoomImage} />
                    <View style={s.zoomOverlay}>
                        <TouchableOpacity style={s.zoomClose} onPress={() => setZoomImage(null)}>
                            <View style={s.zoomCloseBg}><Ionicons name="close" size={24} color="#fff" /></View>
                        </TouchableOpacity>
                        {zoomImage && <Image source={{ uri: zoomImage }} style={s.zoomImg} resizeMode="contain" />}
                    </View>
                </Modal>

                {/* Video Player Modal */}
                <Modal visible={!!videoModal} transparent animationType="fade" onRequestClose={() => { setVideoModal(null); setVideoPlaying(false); }} statusBarTranslucent>
                    <StatusBar hidden={!!videoModal} />
                    <View style={s.videoModalBg}>
                        <TouchableOpacity style={s.videoCloseBtn} onPress={() => { setVideoModal(null); setVideoPlaying(false); }}>
                            <LinearGradient colors={['rgba(233,30,99,0.9)', 'rgba(233,30,99,0.7)']} style={s.videoCloseBtnGrad}>
                                <Ionicons name="close" size={22} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                        {videoModal && (
                            <TouchableOpacity activeOpacity={1} style={s.videoPlayerWrap} onPress={async () => {
                                if (videoRef.current) {
                                    const status = await videoRef.current.getStatusAsync();
                                    if (status.isPlaying) { await videoRef.current.pauseAsync(); setVideoPlaying(false); }
                                    else { await videoRef.current.playAsync(); setVideoPlaying(true); }
                                }
                            }}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: videoModal }}
                                    style={s.videoPlayer}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                    isLooping={false}
                                    onPlaybackStatusUpdate={(status) => {
                                        if (status.isLoaded) setVideoLoading(false);
                                        if (status.isLoaded) setVideoPlaying(status.isPlaying);
                                    }}
                                />
                                {videoLoading && (
                                    <View style={s.videoLoadingOverlay}>
                                        <ActivityIndicator size="large" color={COLORS.primaryPink} />
                                        <Text style={{ color: '#fff', marginTop: 12, fontSize: 13 }}>Đang tải video...</Text>
                                    </View>
                                )}
                                {!videoPlaying && !videoLoading && (
                                    <View style={s.videoLoadingOverlay}>
                                        <View style={s.videoBigPlayBtn}>
                                            <Ionicons name="play" size={40} color="#fff" />
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </Modal>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 },
    header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    headerAv: { flexDirection: 'row', marginRight: 12, backgroundColor: COLORS.cardPinkSoft, padding: 6, borderRadius: 16 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textDark },
    onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.online, marginRight: 5 },
    onlineText: { fontSize: 11, color: COLORS.online },
    msgList: { paddingHorizontal: 16, paddingBottom: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dateLine: { flex: 1, height: 1, backgroundColor: COLORS.borderPink },
    dateText: { fontSize: 11, color: COLORS.textMuted, marginHorizontal: 12 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
    msgRight: { justifyContent: 'flex-end' }, msgLeft: { justifyContent: 'flex-start' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6, backgroundColor: COLORS.cardPinkSoft, alignItems: 'center', justifyContent: 'center' },
    bubble: { maxWidth: '75%', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 },
    bubbleMe: { backgroundColor: COLORS.primaryPink, borderBottomRightRadius: 6 },
    bubblePartner: { backgroundColor: COLORS.cardWhite, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.soft },
    msgText: { fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
    msgTextMe: { color: '#fff' },
    timeText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
    inputWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 68, backgroundColor: COLORS.cardWhite, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    input: { flex: 1, backgroundColor: COLORS.primaryPinkSoft, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, color: COLORS.textDark, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: COLORS.borderPink, marginRight: 8 },
    sendBtn: { borderRadius: 22, overflow: 'hidden' },
    sendGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
    photoBtn: { padding: 8, marginRight: 4 },
    chatImage: { width: 200, height: 200, borderRadius: 14, marginBottom: 4 },
    chatVideo: { width: 200, height: 150, borderRadius: 14, backgroundColor: '#1a1a2e' },
    videoWrap: { position: 'relative', marginBottom: 4, borderRadius: 14, overflow: 'hidden', width: 200, height: 150 },
    videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
    videoPlayBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(233,73,113,0.85)', alignItems: 'center', justifyContent: 'center' },
    videoBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    videoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    // Video Player Modal
    videoModalBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    videoCloseBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10 },
    videoCloseBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    videoPlayerWrap: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
    videoPlayer: { width: width, height: height * 0.85 },
    videoLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    videoBigPlayBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(233,73,113,0.75)', alignItems: 'center', justifyContent: 'center' },
    uploadBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(233,73,113,0.08)', gap: 8 },
    uploadText: { fontSize: 13, color: COLORS.primaryPink, fontWeight: '600' },
    zoomHint: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 4 },

    // Reactions
    reactionsRow: { flexDirection: 'row', marginTop: -4, marginBottom: 4 },
    reactionsLeft: { marginLeft: 36, justifyContent: 'flex-start' },
    reactionsRight: { justifyContent: 'flex-end' },
    reactionChip: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginRight: 2, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.soft },
    reactionEmoji: { fontSize: 14 },

    // Reaction Picker
    reactionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    reactionPicker: { backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', width: width * 0.85, ...SHADOWS.card },
    reactionPickerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 16 },
    reactionPickerRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    reactionPickerBtn: { padding: 10, borderRadius: 16, backgroundColor: COLORS.primaryPinkSoft },
    reactionPickerEmoji: { fontSize: 28 },
    reactionPreview: { marginTop: 14, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center' },

    // Image Zoom
    zoomOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    zoomClose: { position: 'absolute', top: 48, right: 20, zIndex: 10 },
    zoomCloseBg: { backgroundColor: 'rgba(233,30,99,0.8)', borderRadius: 20, padding: 8 },
    zoomImg: { width, height: '100%' },

    notPaired: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    npIcon: { width: 100, height: 100, borderRadius: 36, backgroundColor: COLORS.cardWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...SHADOWS.card },
    npTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
    npSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    npBtn: { borderRadius: 16, overflow: 'hidden' },
    npBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 28 },
    npBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
    empty: { alignItems: 'center', paddingVertical: 60, transform: [{ scaleY: -1 }] },
    emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
});
