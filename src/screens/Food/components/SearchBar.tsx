import React, {useRef} from 'react';
import {Pressable, TextInput, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {useTheme} from '../../../theme';
import {IS_TV} from '../../../utils/responsive';

/**
 * Reference `searchbar.jsx`: rounded-full outlined input; focusing enters
 * "search mode" (parent hides slider/tabs); a clear ✕ appears while focused.
 * Submit blurs the field so the TV D-pad regains spatial navigation.
 */
export function SearchBar({
  value,
  onChangeText,
  focused,
  onFocusChange,
}: {
  value: string;
  onChangeText: (text: string) => void;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
}) {
  const {theme} = useTheme();
  // `focused` below is the TEXT FIELD's state; this is the clear button's.
  const {focused: clearFocused, onFocus: onClearFocus, onBlur: onClearBlur} = useTVFocus();
  const inputRef = useRef<TextInput>(null);

  const clear = () => {
    onChangeText('');
    onFocusChange(false);
    inputRef.current?.blur();
  };

  return (
    <View
      className="flex-row items-center"
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surface,
        minHeight: IS_TV ? 60 : 52,
      }}>
      <Icon name="search" size={IS_TV ? 24 : 20} color={theme.colors.muted} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        onSubmitEditing={() => inputRef.current?.blur()}
        placeholder="Search favourite food"
        placeholderTextColor={theme.colors.muted}
        returnKeyType="search"
        style={{
          flex: 1,
          marginLeft: 12,
          color: theme.colors.text,
          fontSize: IS_TV ? 18 : 16,
          paddingVertical: 10,
        }}
      />
      {focused ? (
        <Pressable
          onPress={clear}
          onFocus={onClearFocus}
          onBlur={onClearBlur}
          focusable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={{
            padding: 4,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: clearFocused ? theme.colors.focusRing : 'transparent',
          }}>
          <Icon name="close" size={IS_TV ? 22 : 18} color={theme.colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
