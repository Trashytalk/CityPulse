// apps/mobile/app/(tabs)/map.tsx
import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import MapView, { UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Layers, Navigation, ZoomIn, ZoomOut } from 'lucide-react-native';

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapRef, setMapRef] = useState<MapView | null>(null);
  const [layerType, setLayerType] = useState<'coverage' | 'heatmap'>('coverage');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();
  }, []);

  const centerOnUser = () => {
    if (location && mapRef) {
      mapRef.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text className="text-gray-500 mt-4">Loading map...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={(ref) => setMapRef(ref)}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location?.coords.latitude || 14.5995,
          longitude: location?.coords.longitude || 120.9842,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Coverage tiles overlay */}
        <UrlTile
          urlTemplate="https://tiles.citypulse.app/coverage/{z}/{x}/{y}.png"
          zIndex={1}
          opacity={0.6}
        />
      </MapView>

      {/* Map controls */}
      <View className="absolute top-16 right-4 gap-2">
        <Pressable
          onPress={() => setLayerType(layerType === 'coverage' ? 'heatmap' : 'coverage')}
          className="w-12 h-12 rounded-full bg-white shadow-md items-center justify-center"
        >
          <Layers size={22} color="#333" />
        </Pressable>
        <Pressable
          onPress={centerOnUser}
          className="w-12 h-12 rounded-full bg-white shadow-md items-center justify-center"
        >
          <Navigation size={22} color="#1E3A5F" />
        </Pressable>
      </View>

      {/* Legend */}
      <View className="absolute bottom-8 left-4 right-4 bg-white rounded-xl p-4 shadow-lg">
        <Text className="font-bold text-gray-900 mb-2">Coverage Legend</Text>
        <View className="flex-row justify-between">
          <View className="flex-row items-center">
            <View className="w-4 h-4 rounded bg-green-500 mr-2" />
            <Text className="text-sm text-gray-600">High</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-4 h-4 rounded bg-yellow-500 mr-2" />
            <Text className="text-sm text-gray-600">Medium</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-4 h-4 rounded bg-red-500 mr-2" />
            <Text className="text-sm text-gray-600">Low</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-4 h-4 rounded bg-gray-300 mr-2" />
            <Text className="text-sm text-gray-600">None</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
