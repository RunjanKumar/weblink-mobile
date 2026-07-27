import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, Header, Stepper, Toggle} from '../../components';
import {useAcViewModel, type AcMode} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {AC_TEMP} from '../../constants/roomControl';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Ac'>;

const MODES: {id: AcMode; label: string; icon: string}[] = [
  {id: 'auto', label: 'Auto', icon: 'flash-outline'},
  {id: 'cooling', label: 'Cooling', icon: 'snow-outline'},
  {id: 'heating', label: 'Heating', icon: 'flame-outline'},
];

function ModeButton({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="mb-3 flex-1 flex-row items-center justify-center rounded-2xl py-3"
      style={{
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Icon
        name={icon}
        size={18}
        color={active ? theme.colors.primaryForeground : theme.colors.textTertiary}
      />
      <Text
        className="ml-2 text-sm font-semibold"
        style={{color: active ? theme.colors.primaryForeground : theme.colors.textTertiary}}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AcScreen({navigation}: Props) {
  const {theme} = useTheme();
  const ac = useAcViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Climate" subtitle="Air conditioner" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}>
        {/* Status */}
        <Card>
          <View className="flex-row items-end">
            <Text className="text-5xl font-bold text-content">{ac.currentTemp}°</Text>
            <Text className="mb-2 ml-1 text-lg text-content-tertiary">C</Text>
          </View>
          <View className="mt-1 flex-row items-center">
            <Icon name="water-outline" size={14} color={theme.colors.textTertiary} />
            <Text className="ml-1 text-xs text-content-tertiary">{ac.humidity}% humidity</Text>
          </View>

          <View className="my-4 h-px bg-border" />

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-content-secondary">
              Air conditioner is {ac.isOn ? 'ON' : 'OFF'}
            </Text>
            <Toggle value={ac.isOn} onValueChange={ac.toggleAc} accessibilityLabel="Toggle AC" />
          </View>
        </Card>

        {/* Target temperature */}
        <View className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-content">Target temperature</Text>
          <Card>
            <Stepper
              value={ac.temperature}
              min={AC_TEMP.MIN}
              max={AC_TEMP.MAX}
              step={AC_TEMP.STEP}
              format={v => `${v}°C`}
              disabled={!ac.isOn}
              onChange={ac.setTemp}
              accessibilityLabel="Target temperature"
            />
          </Card>
        </View>

        {/* Modes */}
        <View className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-content">Mode</Text>
          <View className="flex-row" style={{gap: 12}}>
            {MODES.map(m => (
              <ModeButton
                key={m.id}
                active={ac.mode === m.id}
                label={m.label}
                icon={m.icon}
                onPress={() => ac.setMode(m.id)}
              />
            ))}
          </View>
        </View>

        <Text className="mt-6 text-center text-xs text-content-tertiary">
          Climate control is a preview — live control arrives when the room-climate API is enabled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
