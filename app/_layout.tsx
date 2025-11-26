import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    // Handle deep links
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url.includes('add-word')) {
        // Redirect to folder selection screen for widget flow
        router.push('/widget-folder-select');
      }
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('add-word')) {
        router.push('/widget-folder-select');
      }
    });

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ animationEnabled: false }}>
        {/* Home Screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Onboarding */}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />

        {/* Word Management */}
        <Stack.Screen name="add-word" options={{ headerShown: false }} />
        <Stack.Screen name="edit-word" options={{ headerShown: false }} />
        <Stack.Screen name="widget-folder-select" options={{ headerShown: false }} />

        {/* Test Flow - Hierarchical Navigation */}
        <Stack.Screen name="test-mode-select" options={{ headerShown: false }} />
        <Stack.Screen name="test-word" options={{ headerShown: false }} />
        <Stack.Screen name="test-completed" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
