import React, {useEffect, useRef} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {IS_TV} from '../../../utils/responsive';
import {STICKY_OFFSET} from '../../../hooks/useScrollSpy';

function Tab({
  label,
  active,
  onPress,
  onLayout,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  onLayout: (x: number, width: number) => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      onLayout={e => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      focusable
      accessibilityRole="tab"
      accessibilityState={{selected: active}}
      style={{
        paddingHorizontal: IS_TV ? 24 : 20,
        paddingVertical: IS_TV ? 10 : 8,
        borderRadius: 999,
        marginRight: IS_TV ? 16 : 12,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
        transform: [{scale: focused ? 1.05 : 1}],
      }}>
      <Text
        style={{
          color: active ? theme.colors.primaryForeground : theme.colors.text,
          fontSize: IS_TV ? 17 : 15,
          fontWeight: active ? '600' : '400',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Sticky category pills (reference `categorytabs.jsx`): tap → parent scrolls
 * the list; the ACTIVE tab auto-centers in the rail
 * (`scrollLeft = tabLeft − containerWidth/2 + tabWidth/2`).
 */
export function CategoryTabs({
  categories,
  activeIndex,
  onSelect,
}: {
  categories: {id: string; name: string}[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const {theme} = useTheme();
  const railRef = useRef<ScrollView>(null);
  const layoutsRef = useRef<Record<number, {x: number; width: number}>>({});
  const containerWidthRef = useRef(0);

  useEffect(() => {
    const tab = layoutsRef.current[activeIndex];
    const containerWidth = containerWidthRef.current;
    if (!tab || containerWidth === 0) {
      return;
    }
    railRef.current?.scrollTo({
      x: Math.max(0, tab.x - containerWidth / 2 + tab.width / 2),
      animated: true,
    });
  }, [activeIndex]);

  return (
    <View
      onLayout={e => {
        containerWidthRef.current = e.nativeEvent.layout.width;
      }}
      style={{
        height: STICKY_OFFSET,
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}>
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 20, alignItems: 'center'}}>
        {categories.map((category, index) => (
          <Tab
            key={category.id}
            label={category.name}
            active={index === activeIndex}
            onPress={() => onSelect(index)}
            onLayout={(x, width) => {
              layoutsRef.current[index] = {x, width};
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}
