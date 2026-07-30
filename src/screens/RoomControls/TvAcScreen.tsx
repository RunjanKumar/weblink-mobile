import React from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  DS,
  FONT,
  GlassPanel,
  RoomIcon,
  RoundButton,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useAcViewModel, type AcFanSpeed, type AcFeature, type AcMode} from '../../viewmodels';
import {AC_TEMP} from '../../constants/roomControl';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Ac'>;

/**
 * A/C Control — the client's Figma frame for the TV.
 *
 * Wears the SAME chrome as every ten-foot screen (TvTopBar welcome, TvFooter
 * hotel wordmark) — do not touch those here. Inside the frame, the Figma's
 * layout verbatim: header row (back, snowflake badge, A/C CONTROL + subtitle,
 * POWER on the right), then one soft pane split into three columns — the set
 * temperature dial with − / +, fan speed + mode in the middle, and the
 * swing/turbo/sleep/timer feature tiles stacked on the right.
 *
 * Data is `useAcViewModel`, still a LOCAL mock (no climate backend yet).
 */

/* ── Figma glyphs Ionicons doesn't have ── */

/** AC unit with the three up-arrows of the Figma's SWING tile. */
function SwingIcon({size = 30, color}: {size?: number; color: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M8 14 H56 V26 a4 4 0 0 1 -4 4 H12 a4 4 0 0 1 -4 -4 Z" />
        <Path d="M14 22 H50" />
        <Path d="M18 54 V40 M13.5 44.5 L18 40 L22.5 44.5" />
        <Path d="M32 54 V40 M27.5 44.5 L32 40 L36.5 44.5" />
        <Path d="M46 54 V40 M41.5 44.5 L46 40 L50.5 44.5" />
      </G>
    </Svg>
  );
}

/** The Ⓐ auto-mode glyph. */
function AutoGlyph({color}: {color: string}) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{color, fontSize: 15, fontWeight: '600', fontFamily: FONT}}>A</Text>
    </View>
  );
}

/* ── Set-temperature dial ── */

const DIAL_SIZE = 260;
const DIAL_R = 104;
const DIAL_STROKE = 9;
/**
 * The dial is an open ring with its gap at the bottom, where the − / + buttons
 * sit. The knob starts ON the − button at 16°C (bottom-left, 225° from
 * 12 o'clock) and travels clockwise — up over the top — to land on the + button
 * at 30°C (bottom-right, 135°). 270° of travel in total.
 */
const DIAL_START = 225;
const DIAL_TRAVEL = 270;

function polar(deg: number, r: number) {
  // 0° at 12 o'clock, clockwise.
  const rad = ((deg - 90) * Math.PI) / 180;
  return {x: DIAL_SIZE / 2 + r * Math.cos(rad), y: DIAL_SIZE / 2 + r * Math.sin(rad)};
}

function arcPath(fromDeg: number, sweep: number) {
  const start = polar(fromDeg, DIAL_R);
  const end = polar(fromDeg + sweep, DIAL_R);
  return `M ${start.x} ${start.y} A ${DIAL_R} ${DIAL_R} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

function TempDial({temperature}: {temperature: number}) {
  const fraction = (temperature - AC_TEMP.MIN) / (AC_TEMP.MAX - AC_TEMP.MIN);
  const sweep = fraction * DIAL_TRAVEL;
  const knob = polar(DIAL_START + sweep, DIAL_R);

  return (
    <View style={{width: DIAL_SIZE, height: DIAL_SIZE}}>
      <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
        <Defs>
          <SvgLinearGradient id="dialGold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={DS.champagne} />
            <Stop offset="1" stopColor={DS.gold} />
          </SvgLinearGradient>
        </Defs>
        {/* track: the full 270° travel, gap at the bottom */}
        <Path
          d={arcPath(DIAL_START, DIAL_TRAVEL)}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={DIAL_STROKE}
          strokeLinecap="round"
          fill="none"
        />
        {/* progress arc: − towards + */}
        {sweep > 0.5 ? (
          <Path
            d={arcPath(DIAL_START, sweep)}
            stroke="url(#dialGold)"
            strokeWidth={DIAL_STROKE}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {/* knob */}
        <Circle cx={knob.x} cy={knob.y} r={16} fill="rgba(255,255,255,0.22)" />
        <Circle cx={knob.x} cy={knob.y} r={11.5} fill="#FFFFFF" />
      </Svg>

      {/* centre read-out */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
          <Text style={{color: DS.text, fontSize: 64, fontWeight: '500', fontFamily: FONT}}>
            {temperature}
          </Text>
          <Text
            style={{color: DS.text, fontSize: 20, marginTop: 14, marginLeft: 2, fontFamily: FONT}}>
            °C
          </Text>
        </View>
        <Text
          style={{
            color: DS.muted,
            fontSize: 12,
            letterSpacing: 2,
            marginTop: 2,
            fontFamily: FONT,
          }}>
          SET
        </Text>
      </View>
    </View>
  );
}

/* ── Fan speed ── */

const FAN_STOPS: {id: AcFanSpeed; label: string}[] = [
  {id: 'low', label: 'LOW'},
  {id: 'medium', label: 'MEDIUM'},
  {id: 'high', label: 'HIGH'},
  {id: 'auto', label: 'AUTO'},
];

/* ── Modes (Figma: COOL / DRY / FAN / AUTO) ── */

const MODES: {id: AcMode; label: string; glyph: (color: string) => React.ReactNode}[] = [
  {id: 'cooling', label: 'COOL', glyph: c => <Icon name="snow-outline" size={28} color={c} />},
  {id: 'dry', label: 'DRY', glyph: c => <Icon name="water-outline" size={28} color={c} />},
  {id: 'fan', label: 'FAN', glyph: c => <RoomIcon name="fan" size={30} color={c} />},
  {id: 'auto', label: 'AUTO', glyph: c => <AutoGlyph color={c} />},
];

/* ── Feature tiles (Figma right rail) ── */

const FEATURES: {id: AcFeature; label: string; glyph: (color: string) => React.ReactNode}[] = [
  {id: 'swing', label: 'SWING', glyph: c => <SwingIcon color={c} />},
  {id: 'turbo', label: 'TURBO', glyph: c => <Icon name="speedometer-outline" size={28} color={c} />},
  {id: 'sleep', label: 'SLEEP', glyph: c => <Icon name="moon-outline" size={28} color={c} />},
  {id: 'timer', label: 'TIMER', glyph: c => <Icon name="time-outline" size={28} color={c} />},
];

const COLUMN_DIVIDER = (
  <View style={{width: 1, backgroundColor: DS.divider, marginHorizontal: 22, marginVertical: 6}} />
);

export function TvAcScreen({navigation}: Props) {
  const ac = useAcViewModel();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      {/* Same page scaffold as the dashboard, Light Control and food frames:
          welcome bar on top, hotel footer underneath, content between. */}
      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <GlassPanel
          style={{
            flex: 1,
            marginTop: 16,
            padding: 18,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}>
          {/* ── Header: back, snowflake badge, title + subtitle, POWER right ── */}
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TvBackButton onPress={() => navigation.goBack()} />

            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: 'rgba(212,180,131,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 18,
              }}>
              <Icon name="snow-outline" size={22} color={DS.gold} />
            </View>

            <View style={{marginLeft: 14, flex: 1}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 24,
                  fontWeight: '500',
                  letterSpacing: 1.5,
                  fontFamily: FONT,
                }}>
                A/C CONTROL
              </Text>
              <Text style={{color: DS.text2, fontSize: 12, marginTop: 3, fontFamily: FONT}}>
                Control your room temperature and comfort
              </Text>
            </View>

            <TvPressable
              onPress={ac.toggleAc}
              label={ac.isOn ? 'Turn air conditioner off' : 'Turn air conditioner on'}
              restBorderColor="rgba(212,180,131,0.7)"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}>
              <Icon name="power" size={22} color={DS.gold} />
            </TvPressable>
            <View style={{marginLeft: 12}}>
              <Text
                style={{color: DS.text, fontSize: 13, letterSpacing: 1.2, fontFamily: FONT}}>
                POWER
              </Text>
              <Text
                style={{
                  color: ac.isOn ? DS.gold : DS.muted,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  marginTop: 3,
                  fontFamily: FONT,
                }}>
                {ac.isOn ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>

          {/* ── The Figma's inner pane: dial | fan+mode | features ── */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              marginTop: 16,
              borderRadius: DS.radius,
              borderWidth: 1,
              borderColor: DS.borderSoft,
              backgroundColor: 'rgba(255,255,255,0.04)',
              paddingVertical: 16,
              paddingHorizontal: 22,
            }}>
            {/* ── Column 1: set temperature ── */}
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 14,
                  letterSpacing: 1.5,
                  marginBottom: 10,
                  fontFamily: FONT,
                }}>
                SET TEMPERATURE
              </Text>
              <TempDial temperature={ac.temperature} />
              {/* − / + sit below the arc's two endpoints, in the dial's bottom
                  opening. `gap` puts their centres on the same two verticals as
                  the 225° / 135° points of the ring, so they still read as
                  capping the arc; `marginTop` then drops them clear of it.
                  The travel ends ON those endpoints, so the knob reaches x =
                  56.5 / 203.5 at 16°C and 30°C — the buttons must clear a
                  16px knob at 26px radius, i.e. 42px between centres. -34 gives
                  48px, so neither button is ever hidden under the knob.
                  Keep both numbers in sync with DIAL_R / DIAL_SIZE. */}
              <View style={{flexDirection: 'row', gap: 95, marginTop: -34}}>
                <RoundButton
                  icon="remove"
                  label="Cooler"
                  size={52}
                  marginLeft={0}
                  onPress={() => ac.setTemp(ac.temperature - AC_TEMP.STEP)}
                />
                <RoundButton
                  icon="add"
                  label="Warmer"
                  size={52}
                  marginLeft={0}
                  onPress={() => ac.setTemp(ac.temperature + AC_TEMP.STEP)}
                />
              </View>
            </View>

            {COLUMN_DIVIDER}

            {/* ── Column 2: fan speed + mode ── */}
            <View style={{flex: 1.25, justifyContent: 'center'}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 14,
                  letterSpacing: 1.5,
                  fontFamily: FONT,
                }}>
                FAN SPEED
              </Text>

              {/* segment meter */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: DS.borderSoft,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                }}>
                <RoomIcon name="fan" size={28} color={DS.gold} />
                {/* Each bar is a button: pressing bar N sets the fan to level N
                    directly — the stops below are just presets over this. */}
                <View style={{flex: 1, flexDirection: 'row', marginLeft: 12, gap: 5}}>
                  {Array.from({length: 9}, (_, i) => (
                    <TvPressable
                      key={i}
                      onPress={() => ac.setFanLevel(i + 1)}
                      label={`Fan level ${i + 1} of 9`}
                      style={{
                        flex: 1,
                        height: 20,
                        borderRadius: 5,
                        backgroundColor:
                          i < ac.fanLevel ? DS.gold : 'rgba(255,255,255,0.12)',
                      }}>
                      <View />
                    </TvPressable>
                  ))}
                </View>
              </View>

              {/* speed stops */}
              <View style={{marginTop: 12}}>
                <View
                  style={{
                    position: 'absolute',
                    left: 14,
                    right: 14,
                    top: 7,
                    height: 1,
                    backgroundColor: DS.divider,
                  }}
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  {FAN_STOPS.map(stop => {
                    const active = ac.fanSpeed === stop.id;
                    return (
                      <TvPressable
                        key={stop.id}
                        onPress={() => ac.setFanSpeed(stop.id)}
                        label={`Fan speed ${stop.label.toLowerCase()}`}
                        style={{alignItems: 'center', paddingHorizontal: 8, borderRadius: 8}}>
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            marginTop: 1,
                            backgroundColor: active ? DS.gold : 'rgba(255,255,255,0.28)',
                          }}
                        />
                        <Text
                          style={{
                            color: active ? DS.gold : DS.text2,
                            fontSize: 12,
                            fontWeight: active ? '700' : '400',
                            letterSpacing: 1,
                            marginTop: 6,
                            fontFamily: FONT,
                          }}>
                          {stop.label}
                        </Text>
                      </TvPressable>
                    );
                  })}
                </View>
              </View>

              <Text
                style={{
                  color: DS.text,
                  fontSize: 14,
                  letterSpacing: 1.5,
                  marginTop: 20,
                  fontFamily: FONT,
                }}>
                MODE
              </Text>
              <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
                {MODES.map(m => {
                  const active = ac.mode === m.id;
                  const color = active ? DS.gold : DS.text2;
                  return (
                    <TvPressable
                      key={m.id}
                      onPress={() => ac.setMode(m.id)}
                      label={`${m.label} mode`}
                      restBorderColor={active ? DS.gold : DS.borderSoft}
                      style={{
                        flex: 1,
                        height: 96,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active
                          ? 'rgba(212,180,131,0.30)'
                          : 'rgba(255,255,255,0.08)',
                      }}>
                      {m.glyph(color)}
                      <Text
                        style={{
                          color,
                          fontSize: 12,
                          fontWeight: active ? '700' : '500',
                          letterSpacing: 1,
                          marginTop: 8,
                          fontFamily: FONT,
                        }}>
                        {m.label}
                      </Text>
                    </TvPressable>
                  );
                })}
              </View>
            </View>

            {COLUMN_DIVIDER}

            {/* ── Column 3: swing / turbo / sleep / timer ── */}
            <View style={{width: 232, justifyContent: 'space-between', paddingVertical: 2}}>
              {FEATURES.map(f => {
                const on = ac.features[f.id];
                return (
                  <TvPressable
                    key={f.id}
                    onPress={() => ac.toggleFeature(f.id)}
                    label={`${f.label.toLowerCase()}, currently ${on ? 'on' : 'off'}`}
                    restBorderColor={DS.borderSoft}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      height: 72,
                      borderRadius: 14,
                      paddingHorizontal: 18,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}>
                    {f.glyph(on ? DS.gold : DS.text2)}
                    <View style={{marginLeft: 14}}>
                      <Text
                        style={{
                          color: DS.text,
                          fontSize: 14,
                          letterSpacing: 1.2,
                          fontFamily: FONT,
                        }}>
                        {f.label}
                      </Text>
                      <Text
                        style={{
                          color: on ? DS.gold : DS.muted,
                          fontSize: 12,
                          fontWeight: '700',
                          letterSpacing: 1.2,
                          marginTop: 3,
                          fontFamily: FONT,
                        }}>
                        {on ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  </TvPressable>
                );
              })}
            </View>
          </View>
        </GlassPanel>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
