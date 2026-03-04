import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { COLORS, GRADIENTS } from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import ChatScreen from './src/screens/ChatScreen';
import MissYouScreen from './src/screens/MissYouScreen';
import LocationScreen from './src/screens/LocationScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import AnniversaryScreen from './src/screens/AnniversaryScreen';
import PairingScreen from './src/screens/PairingScreen';
import PeriodTrackerScreen from './src/screens/PeriodTrackerScreen';
import { listenToNotifications, registerPushToken, forceRegisterPushToken } from './src/firebase/firebaseService';
import { startBackgroundMessageCheck, scheduleDailyLoveQuote, scheduleHolidayWishes } from './src/utils/backgroundTasks';
import { pushTokenDebugInfo } from './src/utils/notifications';
import { Alert } from 'react-native';

const Tab = createBottomTabNavigator();

const tabs = {
  Home: { icon: 'heart', iconOut: 'heart-outline', label: 'Trang chủ' },
  Chat: { icon: 'chatbubbles', iconOut: 'chatbubbles-outline', label: 'Nhắn tin' },
  MissYou: { icon: 'heart-circle', iconOut: 'heart-circle-outline', label: 'Nhớ nhau' },
  Location: { icon: 'location', iconOut: 'location-outline', label: 'Vị trí' },
  Gallery: { icon: 'images', iconOut: 'images-outline', label: 'Ảnh' },
  Messages: { icon: 'notifications', iconOut: 'notifications-outline', label: 'Yêu thương' },
  Anniversary: { icon: 'gift', iconOut: 'gift-outline', label: 'Đặc biệt' },
  PeriodTracker: { icon: 'calendar', iconOut: 'calendar-outline', label: 'Chu kỳ' },
  Pairing: { icon: 'link', iconOut: 'link-outline', label: 'Ghép đôi' },
};

export default function App() {
  useEffect(() => {
    // Register push token with retries — critical for push notifications!
    forceRegisterPushToken(5).then(token => {
      if (token) {
        console.log('✅ Push token registered:', token);
      } else {
        console.log('⚠️ Push token not saved yet (will retry after pairing)');
      }
    });

    // Start background message polling (checks every 60s even when app closed)
    startBackgroundMessageCheck().then(ok => {
      if (ok) console.log('✅ Background message check started');
    });

    // Schedule daily morning love quote at 7:00 AM
    scheduleDailyLoveQuote().then(ok => {
      if (ok) console.log('✅ Daily love quote scheduled');
    });

    // Schedule holiday auto-wishes for all upcoming holidays
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
        <Tab.Screen name="MissYou" component={MissYouScreen} />
        <Tab.Screen name="Location" component={LocationScreen} />
        <Tab.Screen name="Gallery" component={GalleryScreen} />
        <Tab.Screen name="Messages" component={MessagesScreen} />
        <Tab.Screen name="Anniversary" component={AnniversaryScreen} />
        <Tab.Screen name="PeriodTracker" component={PeriodTrackerScreen} />
        <Tab.Screen name="Pairing" component={PairingScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const st = StyleSheet.create({
  tabBar: { position: 'absolute', borderTopWidth: 0, height: 68, paddingBottom: 8, paddingTop: 6, elevation: 8, shadowColor: 'rgba(233,73,113,0.1)', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 1, shadowRadius: 12 },
  tabLabel: { fontSize: 9, fontWeight: '600' },
  activeIcon: { backgroundColor: COLORS.primaryPinkSoft, borderRadius: 14, padding: 5 },
});
