// apps/mobile/app/(tabs)/profile.tsx
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { 
  Award, Wallet, Settings, ChevronRight, LogOut, 
  Flame, Share2, Bell, HelpCircle 
} from 'lucide-react-native';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';

import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const { data: stats } = useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => api.users.stats(),
  });

  const menuItems = [
    { icon: Award, label: 'Achievements', route: '/achievements', badge: stats?.progression?.achievementsUnlocked },
    { icon: Wallet, label: 'Earnings & Withdrawal', route: '/earnings' },
    { icon: Share2, label: 'Invite Friends', route: '/referrals', subtitle: 'Earn 100 credits per referral' },
    { icon: Bell, label: 'Notifications', route: '/notifications' },
    { icon: Settings, label: 'Settings', route: '/settings' },
    { icon: HelpCircle, label: 'Help & Support', route: '/support' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const level = user?.progression?.level || 1;
  const totalXp = user?.progression?.totalXp || 0;
  const xpForCurrentLevel = Math.floor(100 * Math.pow(1.5, level - 2)) || 0;
  const xpForNextLevel = Math.floor(100 * Math.pow(1.5, level - 1));
  const progress = ((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Profile header */}
      <View className="bg-primary-700 px-5 pt-16 pb-20">
        <View className="flex-row items-center">
          <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mr-4">
            {user?.profile?.avatarUrl ? (
              <Image
                source={{ uri: user.profile.avatarUrl }}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <Text className="text-4xl text-white">
                {user?.profile?.displayName?.[0]?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">
              {user?.profile?.displayName || 'Explorer'}
            </Text>
            <Text className="text-white/70">
              Level {level} • {user?.progression?.title || 'Newcomer'}
            </Text>
          </View>
          <View className="bg-white/20 px-3 py-2 rounded-lg flex-row items-center">
            <Flame size={18} color="#FF6B35" />
            <Text className="text-white font-bold text-lg ml-1">
              {user?.progression?.currentStreak || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats card */}
      <View className="px-5 -mt-12">
        <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <View className="flex-row">
            <View className="flex-1 items-center border-r border-gray-100">
              <Text className="text-2xl font-bold text-gray-900">
                {stats?.collection?.totalDistanceKm?.toFixed(1) || 0}
              </Text>
              <Text className="text-sm text-gray-500">km covered</Text>
            </View>
            <View className="flex-1 items-center border-r border-gray-100">
              <Text className="text-2xl font-bold text-gray-900">
                {stats?.collection?.totalSessions || 0}
              </Text>
              <Text className="text-sm text-gray-500">sessions</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-green-600">
                ₱{((stats?.earnings?.totalCashEarned || 0) / 100).toFixed(0)}
              </Text>
              <Text className="text-sm text-gray-500">earned</Text>
            </View>
          </View>

          {/* XP progress */}
          <View className="mt-4 pt-4 border-t border-gray-100">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-500">
                Level {level} Progress
              </Text>
              <Text className="text-sm text-gray-500">
                {totalXp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </Text>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary-500 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Menu items */}
      <View className="px-5">
        {menuItems.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as any)}
            className="bg-white rounded-xl p-4 mb-3 flex-row items-center shadow-sm"
          >
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
              <item.icon size={20} color="#333" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{item.label}</Text>
              {item.subtitle && (
                <Text className="text-sm text-gray-500">{item.subtitle}</Text>
              )}
            </View>
            {item.badge !== undefined && (
              <View className="bg-primary-100 px-2 py-1 rounded-full mr-2">
                <Text className="text-primary-700 font-bold text-sm">{item.badge}</Text>
              </View>
            )}
            <ChevronRight size={20} color="#999" />
          </Pressable>
        ))}

        {/* Logout button */}
        <Pressable
          onPress={handleLogout}
          className="bg-white rounded-xl p-4 mb-8 flex-row items-center shadow-sm"
        >
          <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-3">
            <LogOut size={20} color="#DC2626" />
          </View>
          <Text className="font-semibold text-red-600">Log Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
