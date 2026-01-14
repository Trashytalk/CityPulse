// apps/mobile/app/(auth)/welcome.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MapPin, Wifi, Wallet } from 'lucide-react-native';
import { View, Text, Pressable, Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const features = [
    { icon: MapPin, title: 'Collect Data', desc: 'Walk, drive, or explore - earn while you move' },
    { icon: Wifi, title: 'Share WiFi', desc: 'Share and find WiFi passwords' },
    { icon: Wallet, title: 'Earn Cash', desc: 'Withdraw to GCash or Maya' },
  ];

  return (
    <LinearGradient colors={['#1E3A5F', '#2E5077', '#3c80c2']} style={{ flex: 1 }}>
      <View className="flex-1 px-6 pt-20">
        <View className="items-center mb-12">
          <Text className="text-4xl font-bold text-white">CityPulse</Text>
          <Text className="text-white/80 text-center mt-2">
            Map the world. Earn rewards.
          </Text>
        </View>

        <View className="flex-1 justify-center">
          {features.map((feature, index) => (
            <View 
              key={index} 
              className="flex-row items-center bg-white/10 rounded-xl p-4 mb-4"
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                <feature.icon size={24} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">{feature.title}</Text>
                <Text className="text-white/70">{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="pb-12">
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            className="bg-white py-4 rounded-xl items-center mb-4"
          >
            <Text className="text-primary-700 font-bold text-lg">Get Started</Text>
          </Pressable>
          <Text className="text-white/60 text-center text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
