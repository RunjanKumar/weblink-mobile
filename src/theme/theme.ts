import {darkColors, lightColors, type ThemeColors} from './colors';
import {spacing, radius, type Spacing, type Radius} from './spacing';
import {fontSize, fontWeight, type FontSize, type FontWeight} from './typography';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: Spacing;
  radius: Radius;
  fontSize: FontSize;
  fontWeight: FontWeight;
}

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
};

export const themes: Record<ColorScheme, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};
