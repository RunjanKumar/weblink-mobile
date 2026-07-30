import {useCallback, useState} from 'react';
import {AC_TEMP} from '../constants/roomControl';

export type AcMode = 'auto' | 'cooling' | 'heating' | 'dry' | 'fan';
export type AcFanSpeed = 'low' | 'medium' | 'high' | 'auto';
export type AcFeature = 'swing' | 'turbo' | 'sleep' | 'timer';

/**
 * AC ViewModel. Mirrors the web app, where AC is a LOCAL UI mock (no backend
 * endpoint yet) — current temperature/humidity are static and set-points live in
 * component state. When a room-climate API lands, only this hook changes.
 *
 * Fan speed and the swing/turbo/sleep/timer features exist for the TV's A/C
 * Control screen (the client's Figma); the phone screen and the dashboard card
 * simply don't render them. Same for the 'dry'/'fan' modes.
 */
export const FAN_LEVEL_MAX = 9;

export function useAcViewModel() {
  const [isOn, setIsOn] = useState(true);
  const [mode, setMode] = useState<AcMode>('cooling');
  const [temperature, setTemperature] = useState(21);
  // Fan runs on a 1..9 level (the TV's segment bar); LOW/MEDIUM/HIGH are
  // presets over that level, AUTO is its own flag on top of the last level.
  const [fanLevel, setFanLevelState] = useState(5);
  const [fanAuto, setFanAuto] = useState(false);
  const [features, setFeatures] = useState<Record<AcFeature, boolean>>({
    swing: true,
    turbo: false,
    sleep: false,
    timer: false,
  });

  const currentTemp = 19;
  const humidity = 54;

  const toggleAc = useCallback(() => setIsOn(prev => !prev), []);
  const setTemp = useCallback(
    (temp: number) => setTemperature(Math.max(AC_TEMP.MIN, Math.min(AC_TEMP.MAX, temp))),
    [],
  );
  const toggleFeature = useCallback(
    (feature: AcFeature) => setFeatures(prev => ({...prev, [feature]: !prev[feature]})),
    [],
  );

  /** Tapping a segment bar picks that exact level (and leaves AUTO). */
  const setFanLevel = useCallback((level: number) => {
    setFanAuto(false);
    setFanLevelState(Math.max(1, Math.min(FAN_LEVEL_MAX, level)));
  }, []);

  /** The LOW / MEDIUM / HIGH / AUTO stops are presets over the level. */
  const setFanSpeed = useCallback((speed: AcFanSpeed) => {
    if (speed === 'auto') {
      setFanAuto(true);
      return;
    }
    setFanAuto(false);
    setFanLevelState(speed === 'low' ? 2 : speed === 'medium' ? 5 : FAN_LEVEL_MAX);
  }, []);

  const fanSpeed: AcFanSpeed = fanAuto
    ? 'auto'
    : fanLevel <= 3
      ? 'low'
      : fanLevel <= 6
        ? 'medium'
        : 'high';

  return {
    isOn,
    mode,
    setMode,
    temperature,
    setTemp,
    currentTemp,
    humidity,
    toggleAc,
    fanSpeed,
    setFanSpeed,
    fanLevel,
    setFanLevel,
    features,
    toggleFeature,
  };
}
