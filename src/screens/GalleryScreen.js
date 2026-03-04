import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Modal, Alert, Animated, Dimensions, TextInput, StatusBar, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../theme';
import { uploadPhoto, listenToGallery, isPaired } from '../firebase/firebaseService';

const { width, height } = Dimensions.get('window');
const SPACING = 3;

// Collage layout patterns — varies grid sizes for visual interest
const LAYOUT_PATTERNS = [
    // Pattern 0: 1 large + 2 small (row)
    [{ w: 2, h: 2 }, { w: 1, h: 1 }, { w: 1, h: 1 }],
    // Pattern 1: 3 equal columns
    [{ w: 1, h: 1 }, { w: 1, h: 1 }, { w: 1, h: 1 }],
    // Pattern 2: 2 tall + 1
    [{ w: 1, h: 2 }, { w: 1, h: 1 }, { w: 1, h: 1 }],
    // Pattern 3: 1 wide + 2 small
    [{ w: 2, h: 1 }, { w: 1, h: 1 }, { w: 1, h: 2 }],
];

export default function GalleryScreen() {
    const [photos, setPhotos] = useState([]);
    const [selected, setSelected] = useState(null);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [showCaption, setShowCaption] = useState(false);
    const [caption, setCaption] = useState('');
    const [tempUri, setTempUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState('collage'); // collage | grid
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        const unsub = listenToGallery((pics) => setPhotos(pics));
        return () => { if (unsub) unsub(); };
    }, []);

    const pickImage = async (source) => {
        const paired = await isPaired();
        if (!paired) { Alert.alert('⚠️', 'Ghép đôi trước để đồng bộ ảnh!'); return; }
        const opts = { mediaTypes: ['images'], quality: 0.85 };
        const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
        if (!res.canceled) { setTempUri(res.assets[0].uri); setShowCaption(true); }
    };

    const handleSave = async () => {
        if (!tempUri) return;
        setUploading(true);
        try {
            const base64 = await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
            await uploadPhoto({ base64, caption: caption || '' });
            setTempUri(null); setCaption(''); setShowCaption(false);
            Alert.alert('📸', 'Đã tải ảnh lên! Cả 2 máy đều thấy 💕');
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể tải ảnh: ' + (e.message || 'Thử lại'));
        }
        setUploading(false);
    };

    const openPhoto = (item, idx) => { setSelected(item); setSelectedIdx(idx); };
    const navPhoto = (dir) => {
        const newIdx = selectedIdx + dir;
        if (newIdx >= 0 && newIdx < photos.length) {
            setSelected(photos[newIdx]);
            setSelectedIdx(newIdx);
        }
    };

    // Auto-generate creative title based on date
    const getTitle = () => {
        const now = new Date();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        if (m === 3 && d === 8) return '🌸 HAPPY WOMEN\'S DAY 🌸';
        if (m === 2 && d === 14) return '💕 VALENTINE\'S DAY 💕';
        if (m === 10 && d === 20) return '💕 NGÀY PHỤ NỮ VN 💕';
        return '📸 Khoảnh khắc của chúng mình';
    };

    // Render collage layout (mixed sizes like Instagram stories)
    const renderCollage = () => {
        if (photos.length === 0) return renderEmpty();
        const cellW = (width - 40 - SPACING * 2) / 3;
        const rows = [];
        let idx = 0;
        let patIdx = 0;

        while (idx < photos.length) {
            const pattern = LAYOUT_PATTERNS[patIdx % LAYOUT_PATTERNS.length];
            const rowPhotos = [];
            for (let p = 0; p < pattern.length && idx < photos.length; p++, idx++) {
                rowPhotos.push({ photo: photos[idx], layout: pattern[p], idx: idx - 1 + (p > 0 ? 1 : 0) });
            }
            // Correct idx tracking
            const startIdx = idx - rowPhotos.length;
            rows.push(
                <View key={patIdx} style={s.collageRow}>
                    {rowPhotos.map((item, i) => {
                        const photoIdx = startIdx + i;
                        const w = item.layout.w * cellW + (item.layout.w > 1 ? SPACING * (item.layout.w - 1) : 0);
                        const h = item.layout.h * cellW + (item.layout.h > 1 ? SPACING * (item.layout.h - 1) : 0);
                        return (
                            <TouchableOpacity key={item.photo.id} onPress={() => openPhoto(item.photo, photoIdx)}
                                style={[s.collageImg, { width: w, height: h, marginRight: i < rowPhotos.length - 1 ? SPACING : 0, marginBottom: SPACING }]}
                                activeOpacity={0.85}>
                                <Image source={{ uri: item.photo.thumb || item.photo.uri }} style={s.collageImgFull} />
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={s.collageOverlay}>
                                    {item.photo.caption ? <Text style={s.collageCaption} numberOfLines={1}>{item.photo.caption}</Text> : null}
                                </LinearGradient>
                                {/* Heart decoration on some photos */}
                                {i === 0 && patIdx % 3 === 0 && <View style={s.heartBadge}><Text style={{ fontSize: 14 }}>💕</Text></View>}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
            patIdx++;
        }
        return rows;
    };

    // Render grid layout (classic)
    const renderGrid = () => {
        if (photos.length === 0) return renderEmpty();
        const cellW = (width - 44) / 3;
        return (
            <View style={s.gridContainer}>
                {photos.map((photo, idx) => (
                    <TouchableOpacity key={photo.id} onPress={() => openPhoto(photo, idx)}
                        style={[s.gridImg, { width: cellW, height: cellW }]} activeOpacity={0.85}>
                        <Image source={{ uri: photo.thumb || photo.uri }} style={s.collageImgFull} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)']} style={s.collageOverlay}>
                            <Text style={s.gridSender}>{photo.senderName || ''}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={s.empty}>
            <View style={s.emptyFrame}>
                <LinearGradient colors={['#FFF0F5', '#F8F0FF']} style={s.emptyFrameInner}>
                    <Text style={{ fontSize: 60 }}>📸</Text>
                    <Text style={s.emptyTitle}>Album tình yêu</Text>
                    <Text style={s.emptyText}>Thêm khoảnh khắc đáng nhớ{'\n'}của Nhật & Nhi vào đây 💕</Text>
                    <TouchableOpacity onPress={() => pickImage('library')} style={s.emptyBtn}>
                        <LinearGradient colors={GRADIENTS.pink} style={s.emptyBtnGrad}>
                            <Ionicons name="add-circle-outline" size={20} color="#fff" />
                            <Text style={s.emptyBtnText}>Thêm ảnh đầu tiên</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </View>
    );

    return (
        <View style={s.container}>
            <LinearGradient colors={['#FFF0F5', '#FFE4EC', '#FFF0F5']} style={s.bg}>
                <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.headerTop}>
                            <View style={s.headerLeft}>
                                <Text style={{ fontSize: 22 }}>🐰</Text>
                                <Text style={s.headerTitle}>{getTitle()}</Text>
                            </View>
                            {/* View toggle */}
                            <View style={s.viewToggle}>
                                <TouchableOpacity onPress={() => setViewMode('collage')}
                                    style={[s.toggleBtn, viewMode === 'collage' && s.toggleActive]}>
                                    <Ionicons name="grid" size={16} color={viewMode === 'collage' ? '#fff' : COLORS.textMuted} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setViewMode('grid')}
                                    style={[s.toggleBtn, viewMode === 'grid' && s.toggleActive]}>
                                    <Ionicons name="apps" size={16} color={viewMode === 'grid' ? '#fff' : COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={s.photoCount}>{photos.length} khoảnh khắc yêu thương 💕</Text>
                    </View>

                    {/* Upload buttons */}
                    <View style={s.uploadRow}>
                        <TouchableOpacity style={s.uploadBtn} onPress={() => pickImage('library')} activeOpacity={0.7}>
                            <LinearGradient colors={['#E91E63', '#F06292']} style={s.uploadGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="images-outline" size={18} color="#fff" />
                                <Text style={s.uploadText}>Thư viện</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.uploadBtn} onPress={() => pickImage('camera')} activeOpacity={0.7}>
                            <LinearGradient colors={['#9C27B0', '#BA68C8']} style={s.uploadGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="camera-outline" size={18} color="#fff" />
                                <Text style={s.uploadText}>Chụp ảnh</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Photo display */}
                    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Decorative card wrapping photos */}
                        {photos.length > 0 && (
                            <View style={s.collageCard}>
                                <View style={s.collageCardHeader}>
                                    <Text style={{ fontSize: 18 }}>🐰</Text>
                                    <Text style={s.collageCardTitle}>{getTitle()}</Text>
                                    <TouchableOpacity style={s.closeCardBtn}>
                                        <Ionicons name="heart" size={20} color="#E91E63" />
                                    </TouchableOpacity>
                                </View>
                                {viewMode === 'collage' ? renderCollage() : renderGrid()}
                                <View style={s.collageCardFooter}>
                                    <Text style={s.footerText}>Nhật ❤️ Nhi</Text>
                                    <Text style={{ fontSize: 22 }}>🐰</Text>
                                </View>
                            </View>
                        )}
                        {photos.length === 0 && renderEmpty()}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </Animated.View>

                {/* Caption modal */}
                <Modal visible={showCaption} transparent animationType="fade">
                    <View style={s.modalBg}>
                        <View style={s.captionModal}>
                            <View style={s.captionHeader}>
                                <Text style={s.captionTitle}>📸 Thêm ảnh mới</Text>
                                <TouchableOpacity onPress={() => { setShowCaption(false); setTempUri(null); }}>
                                    <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                            {tempUri && <Image source={{ uri: tempUri }} style={s.previewImg} />}
                            <TextInput style={s.captionInput} placeholder="Ghi chú khoảnh khắc này... 💕"
                                placeholderTextColor="#bbb" value={caption} onChangeText={setCaption} />
                            <TouchableOpacity onPress={handleSave} disabled={uploading} style={s.saveBtn}>
                                <LinearGradient colors={GRADIENTS.pink} style={s.saveBtnGrad}>
                                    <Text style={s.saveBtnText}>{uploading ? '⏳ Đang tải lên...' : '💕 Lưu vào album'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Lightbox */}
                <Modal visible={!!selected} transparent animationType="fade" statusBarTranslucent>
                    <StatusBar hidden={!!selected} />
                    <View style={s.lightbox}>
                        <TouchableOpacity style={s.lbClose} onPress={() => setSelected(null)}>
                            <View style={s.lbCloseBg}><Ionicons name="close" size={24} color="#fff" /></View>
                        </TouchableOpacity>
                        {selected && <>
                            <Image source={{ uri: selected.uri }} style={s.lbImg} resizeMode="contain" />
                            {/* Nav arrows */}
                            <View style={s.lbNav}>
                                <TouchableOpacity onPress={() => navPhoto(-1)} style={s.lbArrow} disabled={selectedIdx === 0}>
                                    <Ionicons name="chevron-back" size={28} color={selectedIdx > 0 ? '#fff' : 'rgba(255,255,255,0.3)'} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navPhoto(1)} style={s.lbArrow} disabled={selectedIdx === photos.length - 1}>
                                    <Ionicons name="chevron-forward" size={28} color={selectedIdx < photos.length - 1 ? '#fff' : 'rgba(255,255,255,0.3)'} />
                                </TouchableOpacity>
                            </View>
                            <View style={s.lbInfo}>
                                {selected.caption ? <Text style={s.lbCaption}>{selected.caption}</Text> : null}
                                <Text style={s.lbSender}>📸 {selected.senderName || 'Người yêu'} • {selectedIdx + 1}/{photos.length}</Text>
                            </View>
                        </>}
                    </View>
                </Modal>
            </LinearGradient>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 }, bg: { flex: 1 },

    // Header
    header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#C2185B', marginLeft: 8, letterSpacing: 0.5 },
    photoCount: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

    // View toggle
    viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(233,30,99,0.08)', borderRadius: 12, padding: 2 },
    toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    toggleActive: { backgroundColor: '#E91E63' },

    // Upload
    uploadRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
    uploadBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', marginHorizontal: 4, ...SHADOWS.soft },
    uploadGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
    uploadText: { color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 13 },

    scrollContent: { paddingHorizontal: 16 },

    // Collage Card — the main decorative frame
    collageCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 12,
        borderWidth: 2,
        borderColor: '#F8BBD0',
        ...SHADOWS.card,
    },
    collageCardHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FCE4EC', marginBottom: 8,
    },
    collageCardTitle: { fontSize: 14, fontWeight: '800', color: '#C2185B', marginLeft: 8, flex: 1, textAlign: 'center', letterSpacing: 1 },
    closeCardBtn: { padding: 4 },
    collageCardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingTop: 10, borderTopWidth: 1, borderTopColor: '#FCE4EC', marginTop: 4,
    },
    footerText: { fontSize: 14, fontWeight: '800', color: '#E91E63', marginRight: 8, letterSpacing: 0.5 },

    // Collage images
    collageRow: { flexDirection: 'row', flexWrap: 'wrap' },
    collageImg: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#F5F5F5' },
    collageImgFull: { width: '100%', height: '100%' },
    collageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    collageCaption: { fontSize: 10, color: '#fff', fontWeight: '600' },
    heartBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 3 },

    // Grid mode
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    gridImg: { margin: 2, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F5F5F5' },
    gridSender: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

    // Empty state
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
    emptyFrame: { borderRadius: 24, borderWidth: 2, borderColor: '#F8BBD0', overflow: 'hidden', width: width - 48, ...SHADOWS.card },
    emptyFrameInner: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#C2185B', marginTop: 16 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 20 },
    emptyBtn: { borderRadius: 16, overflow: 'hidden' },
    emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 28 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 8 },

    // Caption modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    captionModal: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
    captionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#FCE4EC' },
    captionTitle: { fontSize: 18, fontWeight: '800', color: '#2d1b3d' },
    previewImg: { width: '100%', height: 280 },
    captionInput: { padding: 16, color: '#333', fontSize: 15, borderBottomWidth: 1, borderBottomColor: '#FCE4EC' },
    saveBtn: { margin: 16, borderRadius: 16, overflow: 'hidden' },
    saveBtnGrad: { padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Lightbox
    lightbox: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    lbClose: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
    lbCloseBg: { backgroundColor: 'rgba(233,30,99,0.8)', borderRadius: 20, padding: 8 },
    lbImg: { width, height: '100%' },
    lbNav: { position: 'absolute', left: 0, right: 0, top: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
    lbArrow: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22, padding: 8 },
    lbInfo: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
    lbCaption: { fontSize: 16, color: '#fff', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, fontWeight: '600' },
    lbSender: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
