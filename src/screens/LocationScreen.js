import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, Platform, ActivityIndicator, Alert, Modal, TextInput, ScrollView, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import {
    updateMyLocation, listenToPartnerLocation,
    saveLocationHistory, listenToPartnerLocationHistory,
    isPaired, getUserRole,
    saveSavedPlace, listenToSavedPlaces, deleteSavedPlace,
    checkGeofenceAndNotify, getPlaceForLocation,
    listenToAvatars
} from '../firebase/firebaseService';
import { startBackgroundLocation, stopBackgroundLocation } from '../utils/backgroundTasks';
import { getDeviceInfo, formatBattery, formatNetwork } from '../utils/deviceInfo';
import { sendDistanceNotification, dismissDistanceNotification } from '../utils/notifications';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.52;

const PLACE_TYPES = [
    { key: 'home', label: 'Nhà', emoji: '🏠', color: '#FF6B6B' },
    { key: 'school', label: 'Trường học', emoji: '🏫', color: '#4ECDC4' },
    { key: 'company', label: 'Công ty', emoji: '💼', color: '#45B7D1' },
    { key: 'other', label: 'Khác', emoji: '📍', color: '#96CEB4' },
];

// HTML template — CSS + divs only, ZERO script tags
const mapPageCSS = `
  *{margin:0;padding:0}
  html,body,#map{width:100%;height:100%}
  .avatar-bubble{position:relative;display:flex;flex-direction:column;align-items:center}
  .avatar-circle{width:52px;height:52px;border-radius:50%;border:3px solid #e94971;background:linear-gradient(135deg,#fce4ec,#fff);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 3px 12px rgba(233,73,113,0.35);position:relative;overflow:hidden}
  .avatar-circle img{width:100%;height:100%;object-fit:cover;border-radius:50%}
  .avatar-circle.me{border-color:#7c4dff;box-shadow:0 3px 12px rgba(124,77,255,0.35)}
  .heart-badge{position:absolute;top:-4px;right:-4px;font-size:14px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2))}
  .info-card{background:rgba(255,255,255,0.95);border-radius:12px;padding:4px 10px;margin-top:4px;box-shadow:0 2px 8px rgba(0,0,0,0.12);text-align:center;min-width:80px}
  .info-name{font-size:12px;font-weight:800;color:#333;margin-bottom:1px}
  .info-status{font-size:9px;color:#888;margin-bottom:2px}
  .info-meta{font-size:9px;color:#999;display:flex;gap:6px;justify-content:center}
  .info-meta span{white-space:nowrap}
  .place-marker{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid #fff}
  .place-label{background:rgba(255,255,255,0.9);border-radius:8px;padding:2px 8px;font-size:10px;font-weight:700;color:#555;text-align:center;margin-top:2px;box-shadow:0 1px 4px rgba(0,0,0,0.1);white-space:nowrap}
`;

const buildMapHtml = (css) => '<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><style>' + css + '</style><style>' + mapPageCSS + '</style></head><body><div id="map"></div></body></html>';

// Map init JS — injected via WebView's injectedJavaScript (runs AFTER page load, so DOM is ready)
const mapInitScript = (lat, lng) => `
try {
  var map = L.map('map',{zoomControl:false}).setView([${lat},${lng}],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'',maxZoom:19}).addTo(map);
  window.map=map;window.partnerMarker=null;window.myMarker=null;window.routeLine=null;window.placeMarkers={};window.placeCircles={};
  window.updatePartner=function(d){if(!d||!d.lat||!d.lng)return;var p=[d.lat,d.lng];var spd=d.speed||0;var bat=d.battery!=null?d.battery:-1;var net=d.networkType||'';var pn=d.placeName||'';var st=pn||'\u1ede y\u00ean';if(!pn){st=spd>80?'\u0110ang l\u00e1i nhanh':spd>40?'Di chuy\u1ec3n':spd>5?'\u0110i b\u1ed9':'\u1ede y\u00ean'}var bs=bat>=0?'\ud83d\udd0b '+bat+'%':'';var h='<div class="avatar-bubble"><div class="avatar-circle">';if(d.avatarUrl)h+='<img src="'+d.avatarUrl+'">';else h+=(d.emoji||'\ud83d\udc67');h+='<span class="heart-badge">\ud83d\udc95</span></div><div class="info-card"><div class="info-name">'+(d.name||'Ng\u01b0\u1eddi y\u00eau')+'</div><div class="info-status">'+st+'</div><div class="info-meta">';if(bs)h+='<span>'+bs+'</span>';h+='</div></div></div>';var ic=L.divIcon({className:'',html:h,iconSize:[90,90],iconAnchor:[45,45]});if(window.partnerMarker){window.partnerMarker.setLatLng(p);window.partnerMarker.setIcon(ic)}else{window.partnerMarker=L.marker(p,{icon:ic}).addTo(map)}};
  window.updateMe=function(d){if(!d||!d.lat||!d.lng)return;var p=[d.lat,d.lng];var h='<div class="avatar-bubble"><div class="avatar-circle me">';if(d.avatarUrl)h+='<img src="'+d.avatarUrl+'">';else h+=(d.emoji||'\ud83d\udc66');h+='</div><div class="info-card"><div class="info-name">T\u00f4i</div></div></div>';var ic=L.divIcon({className:'',html:h,iconSize:[70,70],iconAnchor:[35,35]});if(window.myMarker){window.myMarker.setLatLng(p);window.myMarker.setIcon(ic)}else{window.myMarker=L.marker(p,{icon:ic}).addTo(map)}map.setView(p,map.getZoom(),{animate:true})};
  window.updateRoute=function(c){if(window.routeLine)map.removeLayer(window.routeLine);if(c.length>1)window.routeLine=L.polyline(c,{color:'#7c4dff',weight:5,opacity:0.8}).addTo(map)};
  window.updatePlaces=function(ps){Object.keys(window.placeMarkers).forEach(function(k){if(!ps.find(function(p){return p.id===k})){map.removeLayer(window.placeMarkers[k]);if(window.placeCircles[k])map.removeLayer(window.placeCircles[k]);delete window.placeMarkers[k];delete window.placeCircles[k]}});ps.forEach(function(p){var pos=[p.latitude,p.longitude];var co=p.type==='home'?'#FF6B6B':p.type==='school'?'#4ECDC4':p.type==='company'?'#45B7D1':'#96CEB4';var em=p.type==='home'?'\\ud83c\\udfe0':p.type==='school'?'\\ud83c\\udfeb':p.type==='company'?'\\ud83d\\udcbc':'\\ud83d\\udccd';var h='<div style="display:flex;flex-direction:column;align-items:center"><div class="place-marker" style="background:'+co+'">'+em+'</div><div class="place-label">'+p.name+'</div></div>';var ic=L.divIcon({className:'',html:h,iconSize:[60,50],iconAnchor:[30,25]});if(window.placeMarkers[p.id]){window.placeMarkers[p.id].setLatLng(pos);window.placeMarkers[p.id].setIcon(ic)}else{window.placeMarkers[p.id]=L.marker(pos,{icon:ic}).addTo(map)}if(!window.placeCircles[p.id])window.placeCircles[p.id]=L.circle(pos,{radius:p.radius||200,color:co,fillColor:co,fillOpacity:0.08,weight:2,opacity:0.4}).addTo(map)})};
  window.centerOn=function(la,ln){map.setView([la,ln],16,{animate:true})};
  window.ReactNativeWebView.postMessage('MAP_READY');
} catch(e) {
  window.ReactNativeWebView.postMessage('MAP_ERROR:'+e.message);
}
true;
`;

export default function LocationScreen() {
    const [myLoc, setMyLoc] = useState(null);
    const [mySpeed, setMySpeed] = useState(0);
    const [myAddress, setMyAddress] = useState('Đang xác định...');
    const [myBattery, setMyBattery] = useState(-1);
    const [myNetwork, setMyNetwork] = useState('unknown');
    const [partner, setPartner] = useState(null);
    const [partnerRoute, setPartnerRoute] = useState([]);
    const [paired, setPaired] = useState(false);
    const [tracking, setTracking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('nhat');
    const [speedAlert, setSpeedAlert] = useState(false);
    const [savedPlaces, setSavedPlaces] = useState([]);
    const [showPlaceModal, setShowPlaceModal] = useState(false);
    const [newPlace, setNewPlace] = useState({ name: '', type: 'home' });
    const [myAvatarUrl, setMyAvatarUrl] = useState(null);
    const [partnerAvatarUrl, setPartnerAvatarUrl] = useState(null);
    const myAvatarRef = useRef(null);
    const partnerAvatarRef = useRef(null);
    const partnerRef = useRef(null);
    const webRef = useRef(null);
    const locSub = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const alertAnim = useRef(new Animated.Value(0)).current;

    // Keep refs in sync with state
    useEffect(() => { myAvatarRef.current = myAvatarUrl; }, [myAvatarUrl]);
    useEffect(() => { partnerAvatarRef.current = partnerAvatarUrl; }, [partnerAvatarUrl]);
    useEffect(() => { partnerRef.current = partner; }, [partner]);

    // Haversine distance (km)
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    useEffect(() => {
        let unsubAvatars = null;
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        (async () => {
            const p = await isPaired();
            const r = await getUserRole();
            setPaired(p);
            setRole(r || 'nhat');
            setLoading(false);
            unsubAvatars = listenToAvatars((avatars) => {
                const myRole = r || 'nhat';
                if (myRole === 'nhat') {
                    if (avatars.nhat?.url) setMyAvatarUrl(avatars.nhat.url);
                    if (avatars.nhi?.url) setPartnerAvatarUrl(avatars.nhi.url);
                } else {
                    if (avatars.nhi?.url) setMyAvatarUrl(avatars.nhi.url);
                    if (avatars.nhat?.url) setPartnerAvatarUrl(avatars.nhat.url);
                }
            });
        })();

        const unsubLoc = listenToPartnerLocation((data) => {
            setPartner(data);
            if (data && data.latitude && webRef.current) {
                const emoji = data.role === 'nhi' ? '👧' : '👦';
                const placeName = data.placeName || '';
                const rawSpd = data.speed || 0;
                const filteredSpd = rawSpd < 3 ? 0 : rawSpd;
                const avatarJs = partnerAvatarRef.current ? `,avatarUrl:"${partnerAvatarRef.current}"` : '';
                webRef.current.injectJavaScript(`updatePartner({lat:${data.latitude},lng:${data.longitude},speed:${filteredSpd},name:"${data.name || 'Người yêu'}",emoji:"${emoji}",battery:${data.battery != null ? data.battery : -1},networkType:"${data.networkType || ''}",placeName:"${placeName.replace(/"/g, "'")}"${avatarJs}});true;`);
            }
            if (data && data.speed > 80) {
                setSpeedAlert(true);
                Animated.timing(alertAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            } else {
                setSpeedAlert(false);
                alertAnim.setValue(0);
            }
            if (data && data.latitude && savedPlaces.length > 0) {
                checkGeofenceAndNotify(data.latitude, data.longitude, data.name || 'Người yêu', savedPlaces);
            }
        });

        const unsubHist = listenToPartnerLocationHistory((history) => {
            const route = history.filter(h => h.latitude && h.longitude).map(h => [h.latitude, h.longitude]);
            setPartnerRoute(route);
            if (route.length > 1 && webRef.current) {
                webRef.current.injectJavaScript(`updateRoute(${JSON.stringify(route)});true;`);
            }
        });

        const unsubPlaces = listenToSavedPlaces((places) => {
            setSavedPlaces(places);
            if (webRef.current) {
                webRef.current.injectJavaScript(`updatePlaces(${JSON.stringify(places)});true;`);
            }
        });

        return () => {
            if (unsubLoc) unsubLoc();
            if (unsubHist) unsubHist();
            if (unsubPlaces) unsubPlaces();
            if (unsubAvatars) unsubAvatars();
            stopTracking();
        };
    }, []);

    useEffect(() => {
        if (webRef.current && savedPlaces.length > 0) {
            webRef.current.injectJavaScript(`updatePlaces(${JSON.stringify(savedPlaces)});true;`);
        }
    }, [savedPlaces]);

    const startTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            setTracking(true);
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            handleUpdate(loc);
            locSub.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
                handleUpdate
            );
            const bgStarted = await startBackgroundLocation();
            if (bgStarted) console.log('Background location active');
        } catch (e) { console.error('Loc err:', e); }
    };

    const stopTracking = async () => {
        if (locSub.current) { locSub.current.remove(); locSub.current = null; }
        await stopBackgroundLocation();
        setTracking(false);
        dismissDistanceNotification().catch(() => { });
    };

    const handleUpdate = async (loc) => {
        const { latitude, longitude, speed, accuracy } = loc.coords;
        let spd = speed ? Math.round(speed * 3.6) : 0;
        if (accuracy > 30 || spd < 3) spd = 0;
        setMyLoc({ latitude, longitude });
        setMySpeed(spd);

        const deviceInfo = await getDeviceInfo();
        setMyBattery(deviceInfo.batteryLevel);
        setMyNetwork(deviceInfo.networkType);

        const emoji = role === 'nhi' ? '👧' : '👦';
        const avatarJs = myAvatarRef.current ? `,avatarUrl:"${myAvatarRef.current}"` : '';
        if (webRef.current) {
            webRef.current.injectJavaScript(`updateMe({lat:${latitude},lng:${longitude},emoji:"${emoji}"${avatarJs}});true;`);
        }

        let addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
            const addrs = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (addrs.length > 0) {
                const a = addrs[0];
                addr = [a.street, a.district, a.city].filter(Boolean).join(', ') || addr;
            }
        } catch { }
        setMyAddress(addr);

        const myPlace = getPlaceForLocation(latitude, longitude, savedPlaces);
        const placeName = myPlace ? myPlace.name : '';

        try {
            await updateMyLocation({
                latitude, longitude, speed: spd, address: addr,
                battery: deviceInfo.batteryLevel,
                isCharging: deviceInfo.isCharging,
                networkType: deviceInfo.networkType,
                placeName,
            });
            await saveLocationHistory({ latitude, longitude, speed: spd, address: addr });
        } catch (e) { console.log('Sync err:', e); }

        // Distance notification - only update the existing foreground service notification
        // (removed sendDistanceNotification to prevent duplicate notification)
    };

    const centerOnPartner = () => {
        if (partner && webRef.current) {
            webRef.current.injectJavaScript(`centerOn(${partner.latitude},${partner.longitude});true;`);
        }
    };

    const centerOnMe = () => {
        if (myLoc && webRef.current) {
            webRef.current.injectJavaScript(`centerOn(${myLoc.latitude},${myLoc.longitude});true;`);
        }
    };

    const spdColor = (s) => s > 80 ? '#ef5350' : s > 40 ? '#ff9800' : '#66bb6a';
    const statusText = (s) => s > 80 ? 'Đang lái xe nhanh' : s > 40 ? 'Đang di chuyển' : s > 5 ? 'Đang đi bộ' : 'Đang ở yên';
    const statusIcon = (s) => s > 40 ? '🚗' : s > 5 ? '🚶' : '🏠';
    const fmtTime = (ts) => { if (!ts) return ''; try { const d = ts.toDate ? ts.toDate() : new Date(ts); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; } catch { return ''; } };

    const handleAddPlace = async () => {
        if (!newPlace.name.trim()) { Alert.alert('Lỗi', 'Nhập tên địa điểm'); return; }
        if (!myLoc) { Alert.alert('Lỗi', 'Bật chia sẻ vị trí trước'); return; }
        await saveSavedPlace({
            name: newPlace.name.trim(),
            type: newPlace.type,
            latitude: myLoc.latitude,
            longitude: myLoc.longitude,
            radius: 200,
        });
        setNewPlace({ name: '', type: 'home' });
        setShowPlaceModal(false);
        Alert.alert('✅ Đã lưu', `Địa điểm "${newPlace.name}" đã được lưu!`);
    };

    const handleDeletePlace = (place) => {
        Alert.alert('Xóa địa điểm', `Xóa "${place.name}"?`, [
            { text: 'Hủy' },
            { text: 'Xóa', style: 'destructive', onPress: () => deleteSavedPlace(place.id) },
        ]);
    };

    const defaultLat = partner?.latitude || myLoc?.latitude || 10.762622;
    const defaultLng = partner?.longitude || myLoc?.longitude || 106.660172;

    const [leafletJs, setLeafletJs] = useState('');
    const [leafletCss, setLeafletCss] = useState('');

    // Download Leaflet via fetch() — React Native side, NOT blocked by WebView
    useEffect(() => {
        Promise.all([
            fetch('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(r => r.text()),
            fetch('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css').then(r => r.text()),
        ]).then(([js, css]) => {
            setLeafletJs(js);
            setLeafletCss(css);
        }).catch(e => {
            Alert.alert('[DEBUG] Leaflet fetch failed', e.message);
        });
    }, []);

    if (loading) {
        return <View style={s.container}><LinearGradient colors={GRADIENTS.background} style={s.bg}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primaryPink} /></View></LinearGradient></View>;
    }

    const partnerPlace = partner ? getPlaceForLocation(partner.latitude, partner.longitude, savedPlaces) : null;

    return (
        <View style={s.container}>
            {/* MAP */}
            <View style={s.mapWrap}>
                {leafletJs && leafletCss ? (
                    <WebView
                        ref={webRef}
                        source={{ html: buildMapHtml(leafletCss) }}
                        injectedJavaScript={leafletJs + '\n' + mapInitScript(defaultLat, defaultLng)}
                        style={s.map}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        originWhitelist={['*']}
                        scrollEnabled={false}
                        mixedContentMode="always"
                        androidLayerType="hardware"
                        onError={(e) => Alert.alert('[DEBUG] WebView Error', JSON.stringify(e.nativeEvent))}
                        onMessage={(e) => {
                            const msg = e.nativeEvent.data;
                            if (msg.startsWith('MAP_ERROR:')) Alert.alert('[DEBUG] Map Error', msg);
                            else console.log('Map:', msg);
                        }}
                    />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                        <ActivityIndicator size="large" color={COLORS.primaryPink} />
                        <Text style={{ marginTop: 8, color: '#999', fontSize: 12 }}>Đang tải bản đồ...</Text>
                    </View>
                )}

                {/* Map controls */}
                <View style={s.mapControls}>
                    {partner && <TouchableOpacity style={s.mapBtn} onPress={centerOnPartner}><Ionicons name="person" size={18} color={COLORS.primaryPink} /></TouchableOpacity>}
                    <TouchableOpacity style={s.mapBtn} onPress={centerOnMe}><Ionicons name="locate" size={18} color={COLORS.primaryPink} /></TouchableOpacity>
                    <TouchableOpacity style={[s.mapBtn, { marginTop: 16 }]} onPress={() => setShowPlaceModal(true)}>
                        <Ionicons name="bookmark" size={18} color="#45B7D1" />
                    </TouchableOpacity>
                </View>

                {/* Speed alert overlay */}
                {speedAlert && partner && (
                    <Animated.View style={[s.speedAlertOverlay, { opacity: alertAnim }]}>
                        <View style={s.speedAlertBox}><Text style={s.speedAlertNum}>{partner.speed} KM/H</Text></View>
                        <View style={s.speedAlertMsg}><Text style={s.speedAlertLabel}>⚠️ Vượt quá tốc độ!</Text></View>
                    </Animated.View>
                )}
            </View>

            {/* Bottom sheet */}
            <Animated.ScrollView style={[s.bottomSheet, { opacity: fadeAnim }]} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Partner info */}
                {partner ? (
                    <View style={s.partnerBar}>
                        <View style={s.partnerBarAvatar}>
                            <Text style={{ fontSize: 22 }}>{partner.role === 'nhi' ? '👧' : '👦'}</Text>
                            <View style={s.onlineDot} />
                            <View style={s.heartBadge}><Text style={{ fontSize: 10 }}>💕</Text></View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.partnerBarName}>
                                {partner.name}{' '}
                                <Text style={s.partnerBarStatus}>
                                    ({partnerPlace ? partnerPlace.name : statusText(partner.speed || 0)})
                                </Text>
                            </Text>
                            <View style={s.partnerBarMeta}>
                                <Text style={s.metaItem}>🕐 {fmtTime(partner.updatedAt)}</Text>
                                <Text style={s.metaItem}>{formatNetwork(partner.networkType)}</Text>
                                <Text style={s.metaItem}>{formatBattery(partner.battery, partner.isCharging)}</Text>
                            </View>
                        </View>
                        {(partner.speed || 0) > 0 && (
                            <View style={[s.spdBadge, { backgroundColor: spdColor(partner.speed) }]}><Text style={s.spdBadgeText}>{partner.speed} km/h</Text></View>
                        )}
                    </View>
                ) : (
                    <View style={s.partnerBar}>
                        <Text style={{ fontSize: 22 }}>📡</Text>
                        <Text style={s.emptyText}>{paired ? 'Người yêu chưa bật chia sẻ vị trí' : 'Ghép đôi để xem vị trí người yêu'}</Text>
                    </View>
                )}

                {/* Address */}
                {partner && partner.address && (
                    <View style={s.addressBar}>
                        <Ionicons name="location" size={14} color={COLORS.primaryPink} />
                        <Text style={s.addressBarText} numberOfLines={2}>{partner.address}</Text>
                        <TouchableOpacity><Ionicons name="navigate" size={18} color={COLORS.primaryPink} /></TouchableOpacity>
                    </View>
                )}


                {/* Track button */}
                <View style={s.actionRow}>
                    <TouchableOpacity onPress={tracking ? stopTracking : startTracking} style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }} activeOpacity={0.7}>
                        <LinearGradient colors={tracking ? ['#ef5350', '#c62828'] : GRADIENTS.pink} style={s.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name={tracking ? 'stop-circle' : 'navigate'} size={18} color="#fff" />
                            <Text style={s.actionText}>{tracking ? 'Dừng chia sẻ' : 'Bật chia sẻ vị trí'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* My status */}
                {tracking && myLoc && (
                    <View style={s.myStatusBar}>
                        <View style={s.myStatusItem}><Text style={{ fontSize: 12 }}>{statusIcon(mySpeed)}</Text><Text style={s.myStatusVal}>{statusText(mySpeed)}</Text></View>
                        <View style={s.myStatusItem}><Text style={{ fontSize: 12 }}>🏎️</Text><Text style={[s.myStatusVal, { color: spdColor(mySpeed) }]}>{mySpeed} km/h</Text></View>
                        <View style={s.myStatusItem}><Text style={{ fontSize: 12 }}>{myBattery >= 0 ? (myBattery <= 20 ? '🪫' : '🔋') : '🔋'}</Text><Text style={s.myStatusVal}>{myBattery >= 0 ? `${myBattery}%` : '--'}</Text></View>
                        <View style={s.myStatusItem}><Text style={{ fontSize: 12 }}>{myNetwork === 'wifi' ? '📶' : '📱'}</Text><Text style={s.myStatusVal}>{myNetwork === 'wifi' ? 'WiFi' : myNetwork}</Text></View>
                    </View>
                )}

                {/* Saved places list */}
                {savedPlaces.length > 0 && (
                    <View style={s.savedSection}>
                        <Text style={s.savedTitle}>📍 Địa điểm đã lưu</Text>
                        {savedPlaces.map(p => {
                            const typeInfo = PLACE_TYPES.find(t => t.key === p.type) || PLACE_TYPES[3];
                            return (
                                <View key={p.id} style={s.savedItem}>
                                    <View style={[s.savedIcon, { backgroundColor: typeInfo.color + '20' }]}>
                                        <Text style={{ fontSize: 18 }}>{typeInfo.emoji}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={s.savedName}>{p.name}</Text>
                                        <Text style={s.savedType}>{typeInfo.label} • bán kính {p.radius || 200}m</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeletePlace(p)}>
                                        <Ionicons name="trash-outline" size={18} color="#ccc" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Route history */}
                {partnerRoute.length > 0 && (
                    <View style={s.histSection}>
                        <Text style={s.histTitle}>🗺️ Lịch sử di chuyển ({partnerRoute.length} điểm)</Text>
                    </View>
                )}
            </Animated.ScrollView>

            {/* Add Place Modal */}
            <Modal visible={showPlaceModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modalBox}>
                        <Text style={s.modalTitle}>📍 Thêm địa điểm quan trọng</Text>
                        <Text style={s.modalSubtitle}>Vị trí hiện tại sẽ được lưu làm địa điểm</Text>

                        <TextInput
                            style={s.modalInput}
                            placeholder="Tên địa điểm (VD: Nhà anh, Công ty)"
                            value={newPlace.name}
                            onChangeText={t => setNewPlace(p => ({ ...p, name: t }))}
                        />

                        <Text style={s.modalLabel}>Loại địa điểm:</Text>
                        <View style={s.typeRow}>
                            {PLACE_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[s.typeChip, newPlace.type === t.key && { backgroundColor: t.color + '30', borderColor: t.color }]}
                                    onPress={() => setNewPlace(p => ({ ...p, type: t.key }))}
                                >
                                    <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                                    <Text style={[s.typeChipText, newPlace.type === t.key && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={s.modalActions}>
                            <TouchableOpacity style={s.modalBtnCancel} onPress={() => setShowPlaceModal(false)}>
                                <Text style={s.modalBtnCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.modalBtnSave} onPress={handleAddPlace}>
                                <LinearGradient colors={GRADIENTS.pink} style={s.modalBtnSaveGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Text style={s.modalBtnSaveText}>💾 Lưu địa điểm</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f0f8' },
    bg: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mapWrap: { height: MAP_HEIGHT, position: 'relative' },
    map: { flex: 1 },
    mapControls: { position: 'absolute', right: 14, top: 50 },
    mapBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 4 },
    speedAlertOverlay: { position: 'absolute', top: 50, alignSelf: 'center', alignItems: 'center' },
    speedAlertBox: { backgroundColor: '#ef5350', borderRadius: 16, paddingHorizontal: 22, paddingVertical: 10, elevation: 6 },
    speedAlertNum: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
    speedAlertMsg: { marginTop: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, elevation: 4 },
    speedAlertLabel: { fontSize: 13, color: '#c62828', fontWeight: '700' },
    bottomSheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 8, paddingHorizontal: 20, elevation: 8 },
    partnerBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    partnerBarAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.cardPinkSoft, alignItems: 'center', justifyContent: 'center' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.online, borderWidth: 2, borderColor: '#fff' },
    heartBadge: { position: 'absolute', top: -2, left: -2 },
    partnerBarName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
    partnerBarStatus: { fontSize: 13, fontWeight: '400', color: COLORS.textMuted },
    partnerBarMeta: { flexDirection: 'row', marginTop: 4 },
    metaItem: { fontSize: 11, color: COLORS.textMuted, marginRight: 14 },
    spdBadge: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
    spdBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, marginLeft: 10, flex: 1 },
    addressBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    addressBarText: { flex: 1, fontSize: 13, color: COLORS.textMedium, marginLeft: 8, lineHeight: 18 },
    actionRow: { flexDirection: 'row', paddingVertical: 12 },
    actionGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    actionText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
    myStatusBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    myStatusItem: { flexDirection: 'row', alignItems: 'center' },
    myStatusVal: { fontSize: 12, color: COLORS.textMedium, fontWeight: '600', marginLeft: 4 },
    savedSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    savedTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
    savedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    savedIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    savedName: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
    savedType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    histSection: { paddingVertical: 12 },
    histTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
    // Distance widget
    distanceWidget: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 8, marginVertical: 8, backgroundColor: '#fef3f7', borderRadius: 16, borderWidth: 1, borderColor: '#fce4ec' },
    distAvatarWrap: { alignItems: 'center', width: 60 },
    distAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
    distName: { fontSize: 11, fontWeight: '700', color: COLORS.textDark, marginTop: 4 },
    distCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    distLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    distValue: { fontSize: 20, fontWeight: '900', color: COLORS.primaryPink, marginTop: 2 },
    distLine: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    distPin: { fontSize: 10 },
    distDash: { width: 12, height: 2, backgroundColor: '#ddd', borderRadius: 1 },
    distTogether: { fontSize: 10, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
    modalSubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    modalInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#fafafa', marginBottom: 16 },
    modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fafafa' },
    typeChipText: { fontSize: 12, color: COLORS.textMedium, marginLeft: 6 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
    modalBtnCancelText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
    modalBtnSave: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    modalBtnSaveGrad: { paddingVertical: 14, alignItems: 'center' },
    modalBtnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
