import {useCallback, useState} from 'react';
import {AC_TEMP} from '../constants/roomControl';

export type AcMode = 'auto' | 'cooling' | 'heating';

/**
 * AC ViewModel. Mirrors the web app, where AC is a LOCAL UI mock (no backend
 * endpoint yet) — current temperature/humidity are static and set-points live in
 * component state. When a room-climate API lands, only this hook changes.
 */
export function useAcViewModel() {
  const [isOn, setIsOn] = useState(true);
  const [mode, setMode] = useState<AcMode>('cooling');
  const [temperature, setTemperature] = useState(21);

  const currentTemp = 19;
  const humidity = 54;

  const toggleAc = useCallback(() => setIsOn(prev => !prev), []);
  const setTemp = useCallback(
    (temp: number) => setTemperature(Math.max(AC_TEMP.MIN, Math.min(AC_TEMP.MAX, temp))),
    [],
  );

  return {isOn, mode, setMode, temperature, setTemp, currentTemp, humidity, toggleAc};
}
