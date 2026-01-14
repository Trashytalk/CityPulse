// apps/mobile/app/(tabs)/wifi.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { Wifi, Lock, Unlock, Copy, RefreshCw, MapPin } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';

import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth';

interface WifiNetwork {
  id: string;
  ssid: string;
  hasPassword: boolean;
  password?: string;
  isUnlocked: boolean;
  unlockCost: number;
  signalStrength: number;
  distance: number;
  trustScore: number;
}

export default function WiFiScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wifi', 'nearby', location],
    queryFn: () => api.wifi.nearby(location!.lat, location!.lng, 500),
    enabled: !!location,
  });

  const unlockMutation = useMutation({
    mutationFn: (networkId: string) => api.wifi.unlock(networkId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wifi', 'nearby'] });
      setSelectedNetwork({ ...selectedNetwork!, password: data.password, isUnlocked: true });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to unlock network');
    },
  });

  const copyPassword = async (password: string) => {
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied!', 'Password copied to clipboard');
  };

  const handleUnlock = (network: WifiNetwork) => {
    const credits = user?.wallet?.creditBalance || 0;
    if (credits < network.unlockCost) {
      Alert.alert('Insufficient Credits', 'You need more credits to unlock this network.');
      return;
    }

    Alert.alert(
      'Unlock Network',
      `This will cost ${network.unlockCost} credits. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unlock', onPress: () => unlockMutation.mutate(network.id) },
      ]
    );
  };

  const getSignalIcon = (strength: number) => {
    if (strength >= 75) return '📶';
    if (strength >= 50) return '📶';
    if (strength >= 25) return '📶';
    return '📶';
  };

  const renderNetwork = ({ item }: { item: WifiNetwork }) => (
    <Pressable
      onPress={() => setSelectedNetwork(item)}
      className="bg-white rounded-xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
          <Wifi size={24} color="#1E3A5F" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-bold text-gray-900 mr-2">{item.ssid}</Text>
            {item.hasPassword && <Lock size={14} color="#666" />}
          </View>
          <View className="flex-row items-center mt-1">
            <MapPin size={12} color="#999" />
            <Text className="text-sm text-gray-500 ml-1">{Math.round(item.distance)}m away</Text>
            <Text className="text-sm text-gray-400 mx-2">•</Text>
            <Text className="text-sm text-gray-500">{getSignalIcon(item.signalStrength)}</Text>
          </View>
        </View>
        <View className={`px-3 py-1.5 rounded-full ${item.isUnlocked ? 'bg-green-100' : 'bg-amber-100'}`}>
          <Text className={`font-medium ${item.isUnlocked ? 'text-green-700' : 'text-amber-700'}`}>
            {item.isUnlocked ? 'Unlocked' : `${item.unlockCost} PC`}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (!location) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text className="text-gray-500 mt-4">Getting your location...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-200 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">WiFi Finder</Text>
          <Text className="text-sm text-gray-500">
            {user?.wallet?.creditBalance?.toLocaleString() || 0} credits available
          </Text>
        </View>
        <Pressable
          onPress={() => refetch()}
          disabled={isRefetching}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <RefreshCw size={20} color="#333" />
        </Pressable>
      </View>

      {/* Network list */}
      <FlatList
        data={data?.networks || []}
        keyExtractor={(item) => item.id}
        renderItem={renderNetwork}
        contentContainerStyle={{ padding: 16 }}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Wifi size={48} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-center">
              No networks found nearby.{'\n'}Try moving to a different location.
            </Text>
          </View>
        }
      />

      {/* Network detail modal */}
      {selectedNetwork && (
        <Pressable
          onPress={() => setSelectedNetwork(null)}
          className="absolute inset-0 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6"
          >
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />
            
            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mr-4">
                <Wifi size={28} color="#1E3A5F" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">{selectedNetwork.ssid}</Text>
                <Text className="text-gray-500">{Math.round(selectedNetwork.distance)}m away</Text>
              </View>
            </View>

            {selectedNetwork.isUnlocked && selectedNetwork.password ? (
              <View className="bg-gray-100 rounded-xl p-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Password</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-mono font-bold text-gray-900">
                    {selectedNetwork.password}
                  </Text>
                  <Pressable
                    onPress={() => copyPassword(selectedNetwork.password!)}
                    className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
                  >
                    <Copy size={20} color="#1E3A5F" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => handleUnlock(selectedNetwork)}
                disabled={unlockMutation.isPending}
                className="bg-primary-600 py-4 rounded-xl items-center mb-4"
              >
                <View className="flex-row items-center">
                  <Unlock size={20} color="#fff" />
                  <Text className="text-white font-bold text-lg ml-2">
                    {unlockMutation.isPending
                      ? 'Unlocking...'
                      : `Unlock for ${selectedNetwork.unlockCost} Credits`}
                  </Text>
                </View>
              </Pressable>
            )}

            <Pressable
              onPress={() => setSelectedNetwork(null)}
              className="py-3 items-center"
            >
              <Text className="text-gray-500 font-medium">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}
