import { Stack } from 'expo-router';
import { AppProvider } from '../src/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scanner" />
      </Stack>
    </AppProvider>
  );
}
