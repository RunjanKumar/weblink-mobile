import React from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {Button, Card, Header} from '../../components';
import {useAuth} from '../../store/AuthContext';
import {useTheme} from '../../theme';
import {getDisplayName} from '../../models/user.model';

function InfoRow({icon, label, value}: {icon: string; label: string; value?: string}) {
  const {theme} = useTheme();
  return (
    <View className="flex-row items-center py-3">
      <Icon name={icon} size={20} color={theme.colors.muted} />
      <Text className="ml-3 flex-1 text-sm text-content-tertiary">{label}</Text>
      <Text className="max-w-[60%] text-right text-sm font-medium text-content" numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

export function ProfileScreen() {
  const {user, hotel, signOut} = useAuth();
  const {theme} = useTheme();

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Log out', style: 'destructive', onPress: () => void signOut()},
    ]);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}>
        {/* Avatar + name */}
        <View className="mb-6 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-surface-elevated">
            <Icon name="person" size={36} color={theme.colors.primary} />
          </View>
          <Text className="mt-3 text-xl font-bold text-content">{getDisplayName(user)}</Text>
          {hotel?.name ? (
            <Text className="mt-1 text-sm text-content-tertiary">{hotel.name}</Text>
          ) : null}
        </View>

        <Card>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <View className="h-px bg-border" />
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={
              user?.phoneNumber
                ? `${user.phoneCountryCode ?? ''} ${user.phoneNumber}`.trim()
                : undefined
            }
          />
        </Card>

        <View className="mt-8">
          <Button
            label="Log out"
            variant="danger"
            onPress={confirmLogout}
            fullWidth
            leftIcon={<Icon name="log-out-outline" size={18} color="#ffffff" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
