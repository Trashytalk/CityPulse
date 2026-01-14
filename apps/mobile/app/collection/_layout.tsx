// apps/mobile/app/collection/_layout.tsx
import { Stack } from 'expo-router';

export default function CollectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[mode]" options={{ gestureEnabled: false }} />
      <Stack.Screen 
        name="summary" 
        options={{ 
          gestureEnabled: false,
          presentation: 'modal',
        }} 
      />
    </Stack>
  );
}
