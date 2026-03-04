// Real device info: battery level, charging state, network type
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';

/**
 * Get real device info: battery %, charging, network type
 * @returns {{ batteryLevel: number, isCharging: boolean, networkType: string }}
 */
export async function getDeviceInfo() {
    let batteryLevel = -1;
    let isCharging = false;
    let networkType = 'unknown';

    try {
        batteryLevel = await Battery.getBatteryLevelAsync();
        batteryLevel = Math.round(batteryLevel * 100);
    } catch (e) {
        console.log('Battery error:', e.message);
        batteryLevel = -1;
    }

    try {
        const state = await Battery.getBatteryStateAsync();
        isCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
    } catch (e) {
        isCharging = false;
    }

    try {
        const netState = await NetInfo.fetch();
        networkType = netState.type; // 'wifi', 'cellular', 'none', etc.
    } catch (e) {
        networkType = 'unknown';
    }

    return { batteryLevel, isCharging, networkType };
}

/**
 * Format battery for display
 */
export function formatBattery(level, isCharging) {
    if (level < 0 || level === undefined || level === null) return '--';
    const icon = isCharging ? '⚡' : (level <= 20 ? '🪫' : '🔋');
    return `${icon} ${level}%`;
}

/**
 * Format network for display
 */
export function formatNetwork(type) {
    switch (type) {
        case 'wifi': return '📶 WiFi';
        case 'cellular': return '📱 4G';
        case 'none': return '❌ Offline';
        default: return '📡';
    }
}
