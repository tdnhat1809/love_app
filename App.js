import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Alert } from 'react-native';
import { COLORS } from './src/theme';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import MissYouScreen from './src/screens/MissYouScreen';
import LocationScreen from './src/screens/LocationScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import AnniversaryScreen from './src/screens/AnniversaryScreen';
import PairingScreen from './src/screens/PairingScreen';
import PeriodTrackerScreen from './src/screens/PeriodTrackerScreen';
import QuizScreen from './src/screens/QuizScreen';
import DailyScreen from './src/screens/DailyScreen';
import TimeCapsuleScreen from './src/screens/TimeCapsuleScreen';
import VirtualPetScreen from './src/screens/VirtualPetScreen';
import JournalScreen from './src/screens/JournalScreen';

// Hub screens
import LoveHubScreen from './src/screens/LoveHubScreen';
import MemoriesHubScreen from './src/screens/MemoriesHubScreen';
import MoreHubScreen from './src/screens/MoreHubScreen';

// Components & Utils
import CustomAlert from './src/components/CustomAlert';
import { listenToNotifications, forceRegisterPushToken } from './src/firebase/firebaseService';
import { startBackgroundMessageCheck, scheduleDailyLoveQuote, scheduleHolidayWishes } from './src/utils/backgroundTasks';

const Tab = createBottomTabNavigator();
const LoveStack = createNativeStackNavigator();
const MemoriesStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

// ===== Stack Navigators for grouped tabs =====
function LoveStackScreen() {
  return (
    <LoveStack.Navigator screenOptions={{ headerShown: false }}>
      <LoveStack.Screen name="LoveHub" component={LoveHubScreen} />
      <LoveStack.Screen name="MissYou" component={MissYouScreen} />
      <LoveStack.Screen name="Quiz" component={QuizScreen} />
      <LoveStack.Screen name="Daily" component={DailyScreen} />
      <LoveStack.Screen name="VirtualPet" component={VirtualPetScreen} />
      <LoveStack.Screen name="Messages" component={MessagesScreen} />
    </LoveStack.Navigator>
  );
}

function MemoriesStackScreen() {
  return (
    <MemoriesStack.Navigator screenOptions={{ headerShown: false }}>
      <MemoriesStack.Screen name="MemoriesHub" component={MemoriesHubScreen} />
      <MemoriesStack.Screen name="Gallery" component={GalleryScreen} />
      <MemoriesStack.Screen name="Journal" component={JournalScreen} />
      <MemoriesStack.Screen name="TimeCapsule" component={TimeCapsuleScreen} />
      <MemoriesStack.Screen name="Anniversary" component={AnniversaryScreen} />
    </MemoriesStack.Navigator>
  );
}

function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHub" component={MoreHubScreen} />
      <MoreStack.Screen name="Location" component={LocationScreen} />
      <MoreStack.Screen name="PeriodTracker" component={PeriodTrackerScreen} />
      <MoreStack.Screen name="Pairing" component={PairingScreen} />
    </MoreStack.Navigator>
  );
}

// ===== Tab config =====
const tabs = {
  Home: { icon: 'heart', iconOut: 'heart-outline', label: 'Trang chủ' },
  Chat: { icon: 'chatbubbles', iconOut: 'chatbubbles-outline', label: 'Nhắn tin' },
  Love: { icon: 'heart-circle', iconOut: 'heart-circle-outline', label: 'Yêu thương' },
  Memories: { icon: 'images', iconOut: 'images-outline', label: 'Kỷ niệm' },
  More: { icon: 'apps', iconOut: 'apps-outline', label: 'Thêm' },
};

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  useEffect(() => {
    forceRegisterPushToken(5).then(async token => {
      if (token) {
        console.log('✅ Push token registered:', token);
        // Debug: show token info
        try {
          const nativeToken = await AsyncStorage.getItem('@push_token_native');
          const tokenType = token.startsWith('ExponentPushToken') ? 'EXPO' : 'NATIVE';
          console.log(`[DEBUG] Token type: ${tokenType}`);
          console.log(`[DEBUG] Native FCM: ${nativeToken ? 'YES (' + nativeToken.substring(0, 30) + '...)' : 'NO'}`);
          Alert.alert(
            '🔔 Push Token Debug',
            `✅ Token đã đăng ký!\n\nLoại: ${tokenType}\nExpo: ${token.substring(0, 35)}...\nNative FCM: ${nativeToken ? '✅ CÓ' : '❌ KHÔNG CÓ'}\n\n${nativeToken ? '→ Background push sẽ dùng FCM trực tiếp' : '→ Chỉ có Expo token, background có thể không hoạt động'}`,
            [{ text: 'OK' }]
          );
        } catch (e) { console.log('Debug alert error:', e); }
      } else {
        // Show debug info to diagnose why token failed
        const { pushTokenDebugInfo } = require('./src/utils/notifications');
        Alert.alert(
          '🔔 Push Token Debug',
          `❌ Không lấy được push token!\n\n📋 Debug:\n${pushTokenDebugInfo || 'Không có thông tin debug'}\n\nKiểm tra quyền thông báo trong Cài đặt.`,
          [{ text: 'OK' }]
        );
      }
    });
    startBackgroundMessageCheck().then(ok => {
      if (ok) console.log('✅ Background message check started');
    });
    scheduleDailyLoveQuote().then(ok => {
      if (ok) console.log('✅ Daily love quote scheduled');
    });
    scheduleHolidayWishes().then(ok => {
      if (ok) console.log('✅ Holiday wishes scheduled');
    });
    const unsub = listenToNotifications((n) => console.log('💕 Notification:', n));
    return () => { if (unsub) unsub(); };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? st.activeIcon : null}>
              <Ionicons name={focused ? tabs[route.name].icon : tabs[route.name].iconOut} size={focused ? 22 : 20} color={color} />
            </View>
          ),
          tabBarLabel: tabs[route.name].label,
          tabBarActiveTintColor: COLORS.primaryPink,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: st.tabBar,
          tabBarLabelStyle: st.tabLabel,
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.cardWhite, borderTopWidth: 1, borderTopColor: COLORS.borderLight }]} />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Love" component={LoveStackScreen} />
        <Tab.Screen name="Memories" component={MemoriesStackScreen} />
        <Tab.Screen name="More" component={MoreStackScreen} />
      </Tab.Navigator>
      <CustomAlert />
    </NavigationContainer>
  );
}

const st = StyleSheet.create({
  tabBar: { position: 'absolute', borderTopWidth: 0, height: 68, paddingBottom: 8, paddingTop: 6, elevation: 8, shadowColor: 'rgba(233,73,113,0.1)', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 1, shadowRadius: 12 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  activeIcon: { backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, padding: 5 },
});
