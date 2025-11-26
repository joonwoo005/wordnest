/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS - Inter for English, Noto Sans SC for Chinese */
    sans: '-apple-system',  // Falls back to system font similar to Inter on iOS
    /** Chinese font optimized for iOS */
    chineseFont: 'PingFang SC',
    serif: 'Georgia',
    rounded: '-apple-system',
    mono: 'Menlo',
  },
  android: {
    /** Android - system fonts (best available alternatives) */
    sans: 'sans-serif',
    chineseFont: 'Noto Sans CJK SC',  // Or system-ui
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    /** Web - Inter for English, Noto Sans SC for Chinese with fallbacks */
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    chineseFont: "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
