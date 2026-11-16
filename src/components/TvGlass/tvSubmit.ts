import {Platform} from 'react-native';
import type {TextInputProps} from 'react-native';

/**
 * Props that make the TV keyboard's action key (Send, Go, Done) submit a
 * TextInput: spread them in place of `onSubmitEditing`.
 *
 * Gboard for TV keeps the word being typed open as an IME composition, and its
 * action key arrives as an Enter while that composition is still open
 * (`isComposing`; Gboard 17.3 on a Xiaomi MiTV and an Android 10 TV emulator).
 * react-native-web drops such an Enter — on a desktop Chinese or Japanese
 * keyboard it only confirms the word — so `onSubmitEditing` never ran and the
 * guest had to close the keyboard and press the on-screen button. On a TV the
 * Enter is always the action key, composing or not.
 *
 * Submitting closes the keyboard: it covers the bottom of the screen, where the
 * result appears. An empty field is left alone.
 */
export function tvSubmitProps(onSubmit: () => void): Pick<TextInputProps, 'onKeyPress' | 'onSubmitEditing'> {
  if (Platform.OS !== 'web') {
    return {onSubmitEditing: onSubmit};
  }
  return {
    onKeyPress: event => {
      const input = event.target as unknown as HTMLInputElement;
      if (event.nativeEvent.key !== 'Enter' || !input.value?.trim()) {
        return;
      }
      // Also stops react-native-web submitting a second time when not composing.
      event.preventDefault();
      // Blur first: it ends the composition, and that last input event would
      // otherwise land after onSubmit cleared the field and bring the text back.
      input.blur();
      onSubmit();
    },
  };
}
