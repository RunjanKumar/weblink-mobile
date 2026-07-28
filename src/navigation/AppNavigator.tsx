import React from 'react';
import {Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {WebIcon, type WebIconName} from '../components';
import type {AppTabParamList} from './types';
import {useTheme} from '../theme';
import {HomeStackNavigator} from './HomeStackNavigator';
import {BookingScreen} from '../screens/Booking/BookingScreen';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

// NOTE: the web's bottom bar is Home / Reception / Facilities / Services — a
// different tab set, not just different icons. Only `Home` maps across, so it
// uses the web's exact glyph (filled when active, as on the web); the rest are
// drawn in the same Feather/Lucide family so the bar reads as one set.
const ICONS: Record<keyof AppTabParamList, WebIconName> = {
  Home: 'home',
  Booking: 'booking',
  Profile: 'profile',
  Settings: 'settings',
};

export function AppNavigator() {
  const {theme} = useTheme();
  // TV needs a taller bar so D-pad focus targets are comfortable.
  const barHeight = Platform.isTV ? 84 : 64;

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: barHeight,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '500'},
        tabBarIcon: ({color, size, focused}) => (
          <WebIcon
            name={ICONS[route.name]}
            color={color}
            size={size}
            filled={focused && ICONS[route.name] === 'home'}
          />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{title: 'Home'}} />
      <Tab.Screen name="Booking" component={BookingScreen} options={{title: 'Booking'}} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{title: 'Profile'}} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{title: 'Settings'}} />
    </Tab.Navigator>
  );
}
