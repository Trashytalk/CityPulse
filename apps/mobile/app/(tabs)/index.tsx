// apps/mobile/app/(tabs)/index.tsx
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Radio, Camera, Wifi, ChevronRight, Flame } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const { data: stats, refetch, isRefetching } = useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => api.users.stats(),
  });

  const quickActions = [
    { 
      title: 'Passive', 
      desc: 'GPS only',
      icon: Radio, 
      color: '#2E7D32', 
      bgColor: '#E8F5E9',
      route: '/collection/passive' 
    },
    { 
      title: 'Dashcam', 
      desc: 'Camera + GPS',
      icon: Camera, 
      color: '#1E3A5F', 
      bgColor: '#E3F2FD',
      route: '/collection/dashcam' 
    },
    { 
      title: 'WiFi', 
      desc: 'Find networks',
      icon: Wifi, 
      color: '#F57C00', 
      bgColor: '#FFF3E0',
      route: '/(tabs)/wifi' 
    },
  ];

  return (
    <ScrollView 
      className="flex-1 bg-gray-50" 
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Header with gradient */}
      <LinearGradient 
        colors={['#1E3A5F', '#2E5077']} 
        className="px-5 pt-16 pb-8"
      >
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-white/70 text-sm">Welcome back,</Text>
            <Text className="text-white text-2xl font-bold">
              {user?.profile?.displayName || 'Explorer'}
            </Text>
          </View>
          <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center">
            <Flame size={16} color="#FF6B35" />
            <Text className="text-white font-bold ml-1">
              {user?.progression?.currentStreak || 0}
            </Text>
          </View>
        </View>

        {/* Balance card */}
        <View className="bg-white/10 rounded-xl p-4">
          <Text className="text-white/70 text-sm">Available Balance</Text>
          <Text className="text-white text-3xl font-bold">
            ₱{((user?.wallet?.cashBalance || 0) / 100).toFixed(2)}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-white/70 text-sm">
              + {(user?.wallet?.creditBalance || 0).toLocaleString()} Credits
            </Text>
            <Pressable 
              onPress={() => router.push('/earnings')}
              className="ml-auto flex-row items-center"
            >
              <Text className="text-white text-sm">View Details</Text>
              <ChevronRight size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* XP Progress */}
      <View className="px-5 -mt-4">
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center">
                <Text className="font-bold text-primary-700">
                  {user?.progression?.level || 1}
                </Text>
              </View>
              <View className="ml-3">
                <Text className="font-semibold text-gray-900">
                  {user?.progression?.title || 'Newcomer'}
                </Text>
                <Text className="text-xs text-gray-500">
                  {user?.progression?.totalXp?.toLocaleString() || 0} XP
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-500">
              {/* XP to next level */}
              500 XP to Level {(user?.progression?.level || 1) + 1}
            </Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <View 
              className="h-full bg-primary-500 rounded-full" 
              style={{ width: '65%' }} 
            />
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-5 mt-6">
        <Text className="text-lg font-bold text-gray-900 mb-3">Start Collecting</Text>
        <View className="flex-row gap-3">
          {quickActions.map((action) => (
            <Pressable 
              key={action.title} 
              className="flex-1"
              onPress={() => router.push(action.route as any)}
            >
              <View className="bg-white rounded-xl p-4 items-center shadow-sm">
                <View 
                  className="w-12 h-12 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: action.bgColor }}
                >
                  <action.icon size={24} color={action.color} />
                </View>
                <Text className="font-semibold text-gray-900">{action.title}</Text>
                <Text className="text-xs text-gray-500">{action.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stats Summary */}
      <View className="px-5 mt-6 mb-8">
        <Text className="text-lg font-bold text-gray-900 mb-3">Your Stats</Text>
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <View className="flex-row">
            <View className="flex-1 items-center border-r border-gray-100">
              <Text className="text-2xl font-bold text-gray-900">
                {stats?.collection?.totalDistanceKm?.toFixed(1) || 0}
              </Text>
              <Text className="text-sm text-gray-500">km</Text>
            </View>
            <View className="flex-1 items-center border-r border-gray-100">
              <Text className="text-2xl font-bold text-gray-900">
                {stats?.collection?.totalSessions || 0}
              </Text>
              <Text className="text-sm text-gray-500">sessions</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-gray-900">
                {stats?.progression?.achievementsUnlocked || 0}
              </Text>
              <Text className="text-sm text-gray-500">achievements</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
