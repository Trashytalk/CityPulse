// apps/mobile/app/collection/[mode].tsx
import { useMutation } from '@tanstack/react-query';
import { Camera, CameraType } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import type * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  Play, Pause, Square, Camera as CameraIcon, 
  MapPin, Navigation, Clock 
} from 'lucide-react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Alert, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { api } from '../../src/services/api';
import { locationService } from '../../src/services/location';
import { offlineService } from '../../src/services/offline';
import { useCollectionStore } from '../../src/stores/collection';
import type { CollectionMode } from '../../src/stores/collection';

export default function CollectionScreen() {
  const { mode } = useLocalSearchParams<{ mode: CollectionMode }>();
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const appState = useRef(AppState.currentState);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const {
    activeSession,
    isCollecting,
    lastLocation,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    addPoint,
    addPhoto,
  } = useCollectionStore();

  const [hasPermission, setHasPermission] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCamera, setShowCamera] = useState(mode === 'dashcam');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const startMutation = useMutation({
    mutationFn: (data: { mode: CollectionMode; lat: number; lng: number }) =>
      api.collection.startSession(data),
    onSuccess: (data) => {
      // Session started on server, local session already active
    },
    onError: async (error, variables) => {
      // Queue for later if offline
      await offlineService.queueUpload({
        sessionId: activeSession?.id || 'pending',
        type: 'session-end',
        data: { mode: variables.mode, startLat: variables.lat, startLng: variables.lng },
      });
    },
  });

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const locationGranted = await locationService.requestPermissions();
      
      let cameraGranted = true;
      if (mode === 'dashcam') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        cameraGranted = status === 'granted';
      }

      setHasPermission(locationGranted && cameraGranted);

      if (locationGranted) {
        // Start session
        const sessionId = startSession(mode!);
        
        // Get initial location
        const location = await locationService.getCurrentLocation();
        addPoint(location);

        // Start tracking
        locationSubscription.current = await locationService.watchLocation(
          (loc) => addPoint(loc),
          { distanceInterval: 10, timeInterval: 5000 }
        );

        // Notify server
        startMutation.mutate({
          mode: mode!,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    })();

    return () => {
      locationSubscription.current?.remove();
    };
  }, [mode]);

  // Timer
  useEffect(() => {
    if (!activeSession || activeSession.isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - activeSession.startedAt.getTime()) / 1000
      );
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, activeSession?.isPaused]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current === 'active' &&
          nextAppState.match(/inactive|background/)
        ) {
          // App going to background - start background tracking
          locationService.startTracking().catch(console.error);
        } else if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // App coming to foreground - stop background, use foreground
          locationService.stopTracking().catch(console.error);
        }
        appState.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, []);

  const handlePauseResume = () => {
    if (activeSession?.isPaused) {
      resumeSession();
      locationService.startTracking().catch(console.error);
    } else {
      pauseSession();
      locationService.stopTracking().catch(console.error);
    }
  };

  const handleStop = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this collection session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            await locationService.stopTracking();
            locationSubscription.current?.remove();
            endSession();
            router.replace('/collection/summary');
          },
        },
      ]
    );
  };

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isTakingPhoto) return;

    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (photo?.uri) {
        addPhoto(photo.uri);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
    } finally {
      setIsTakingPhoto(false);
    }
  }, [isTakingPhoto, addPhoto]);

  // Auto-capture photos every 5 seconds in dashcam mode
  useEffect(() => {
    if (mode !== 'dashcam' || !isCollecting) return;

    const interval = setInterval(() => {
      takePhoto();
    }, 5000);

    return () => clearInterval(interval);
  }, [mode, isCollecting, takePhoto]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const distanceKm = ((activeSession?.distanceMeters || 0) / 1000).toFixed(2);

  if (!hasPermission) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900 px-6">
        <Text className="text-white text-xl text-center mb-4">
          Permissions Required
        </Text>
        <Text className="text-gray-400 text-center">
          CityPulse needs location{mode === 'dashcam' ? ' and camera' : ''}{' '}
          permissions to collect data.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-white/20 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {/* Camera view for dashcam mode */}
      {mode === 'dashcam' && showCamera && (
        <Camera
          ref={cameraRef}
          style={{ flex: 1 }}
          type={CameraType.back}
        >
          {/* Camera overlay */}
          <View className="flex-1">
            {/* Photo count indicator */}
            <View className="absolute top-16 right-4 bg-black/50 px-3 py-2 rounded-full flex-row items-center">
              <CameraIcon size={16} color="#fff" />
              <Text className="text-white ml-2 font-medium">
                {activeSession?.photos.length || 0}
              </Text>
            </View>
          </View>
        </Camera>
      )}

      {/* Stats overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        className="absolute bottom-0 left-0 right-0 pt-24 pb-12 px-6"
      >
        {/* Mode indicator */}
        <View className="flex-row items-center justify-center mb-4">
          <View className={`w-3 h-3 rounded-full ${isCollecting ? 'bg-green-500' : 'bg-yellow-500'} mr-2`} />
          <Text className="text-white/70 uppercase tracking-wider text-sm">
            {mode === 'dashcam' ? 'Dashcam Mode' : 'Passive Mode'}
            {activeSession?.isPaused ? ' (Paused)' : ''}
          </Text>
        </View>

        {/* Main stats */}
        <View className="flex-row justify-around mb-8">
          <View className="items-center">
            <View className="flex-row items-center">
              <Clock size={18} color="#fff" />
              <Text className="text-white text-3xl font-bold ml-2">
                {formatTime(elapsedTime)}
              </Text>
            </View>
            <Text className="text-white/60 text-sm mt-1">Duration</Text>
          </View>
          
          <View className="items-center">
            <View className="flex-row items-center">
              <Navigation size={18} color="#fff" />
              <Text className="text-white text-3xl font-bold ml-2">
                {distanceKm}
              </Text>
            </View>
            <Text className="text-white/60 text-sm mt-1">km traveled</Text>
          </View>
          
          <View className="items-center">
            <View className="flex-row items-center">
              <MapPin size={18} color="#fff" />
              <Text className="text-white text-3xl font-bold ml-2">
                {activeSession?.points.length || 0}
              </Text>
            </View>
            <Text className="text-white/60 text-sm mt-1">Points</Text>
          </View>
        </View>

        {/* Speed indicator */}
        {lastLocation?.coords.speed != null && lastLocation.coords.speed > 0 && (
          <View className="items-center mb-6">
            <Text className="text-white text-5xl font-bold">
              {Math.round((lastLocation.coords.speed || 0) * 3.6)}
            </Text>
            <Text className="text-white/60">km/h</Text>
          </View>
        )}

        {/* Controls */}
        <View className="flex-row justify-center items-center gap-6">
          {/* Pause/Resume */}
          <Pressable
            onPress={handlePauseResume}
            className="w-16 h-16 rounded-full bg-white/20 items-center justify-center"
          >
            {activeSession?.isPaused ? (
              <Play size={28} color="#fff" fill="#fff" />
            ) : (
              <Pause size={28} color="#fff" />
            )}
          </Pressable>

          {/* Stop */}
          <Pressable
            onPress={handleStop}
            className="w-20 h-20 rounded-full bg-red-500 items-center justify-center"
          >
            <Square size={32} color="#fff" fill="#fff" />
          </Pressable>

          {/* Manual photo (dashcam mode) */}
          {mode === 'dashcam' && (
            <Pressable
              onPress={takePhoto}
              disabled={isTakingPhoto}
              className="w-16 h-16 rounded-full bg-white/20 items-center justify-center"
            >
              <CameraIcon size={28} color="#fff" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Passive mode map placeholder */}
      {mode === 'passive' && (
        <View className="flex-1 items-center justify-center">
          <MapPin size={64} color="#4B5563" />
          <Text className="text-gray-500 mt-4">GPS Tracking Active</Text>
          <Text className="text-gray-600 text-sm mt-2">
            {lastLocation
              ? `${lastLocation.coords.latitude.toFixed(5)}, ${lastLocation.coords.longitude.toFixed(5)}`
              : 'Acquiring GPS...'}
          </Text>
        </View>
      )}
    </View>
  );
}
