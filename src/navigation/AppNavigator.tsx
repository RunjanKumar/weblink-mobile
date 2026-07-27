import React from 'react';
import {Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import type {AppTabParamList} from './types';
import {useTheme} from '../theme';
import {HomeStackNavigator} from './HomeStackNavigator';
import {BookingScreen} from '../screens/Booking/BookingScreen';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

const ICONS: Record<keyof AppTabParamList, string> = {
  Home: 'home-outline',
  Booking: 'calendar-outline',
  Profile: 'person-outline',
  Settings: 'settings-outline',
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
        tabBarIcon: ({color, size}) => (
          <Icon name={ICONS[route.name]} color={color} size={size} />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{title: 'Home'}} />
      <Tab.Screen name="Booking" component={BookingScreen} options={{title: 'Booking'}} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{title: 'Profile'}} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{title: 'Settings'}} />
    </Tab.Navigator>
  );
}
