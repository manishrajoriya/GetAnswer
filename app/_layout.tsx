import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider } from '../utils/themeContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="home" />
        </Stack>
      </SafeAreaView>
    </ThemeProvider>
  );
}

