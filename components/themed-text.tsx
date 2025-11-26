import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  variant?: 'default' | 'chinese';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  variant = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        variant === 'chinese' ? { fontFamily: Fonts?.chineseFont } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.select({
      web: Fonts?.sans,
      default: undefined,
    }),
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: Platform.select({
      web: Fonts?.sans,
      default: undefined,
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
    fontFamily: Platform.select({
      web: Fonts?.sans,
      default: undefined,
    }),
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      web: Fonts?.sans,
      default: undefined,
    }),
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#1976D2',
    fontFamily: Platform.select({
      web: Fonts?.sans,
      default: undefined,
    }),
  },
});
