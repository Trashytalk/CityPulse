// apps/mobile/app/collection/summary.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  CheckCircle, Clock, Navigation, MapPin, Camera,
  Coins, Star, Trophy, ChevronRight 
} from 'lucide-react-native';
import { useCollectionStore, CollectionSession } from '../../src/stores/collection';
import { api } from '../../src/services/api';
import { offlineService } from '../../src/services/offline';

interface SessionResult {
  pointsProcessed: number;
  duplicatesSkipped: number;
  creditsEarned: number;
  xpEarned: number;
  bonuses: Array<{
    type: string;
    amount: number;
    reason: string;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
  newLevel?: {
    level: number;
    title: string;
  };
}

export default function SummaryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearSession } = useCollectionStore();
  
  const [session, setSession] = useState<CollectionSession | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [isUploading, setIsUploading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get session from zustand before it's cleared
  useEffect(() => {
    const store = useCollectionStore.getState();
    // Session was ended, but we saved it temporarily
    // For demo, construct from last known state
  }, []);

  const submitMutation = useMutation({
    mutationFn: async (sessionData: {
      sessionId: string;
      points: any[];
      photos: string[];
      summary: any;
    }) => {
      // Upload points in batches
      const batchSize = 100;
      const points = sessionData.points;
      
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        try {
          await api.collection.submitPoints(sessionData.sessionId, batch);
        } catch {
          // Queue for later
          await offlineService.queueUpload({
            sessionId: sessionData.sessionId,
            type: 'points',
            data: batch,
          });
        }
        setUploadProgress(Math.min(80, ((i + batch.length) / points.length) * 80));
      }

      // Upload photos
      for (const photoUri of sessionData.photos) {
        try {
          await api.collection.uploadPhoto(sessionData.sessionId, photoUri, {
            timestamp: new Date().toISOString(),
          });
        } catch {
          await offlineService.queueUpload({
            sessionId: sessionData.sessionId,
            type: 'photo',
            data: { photoUri, metadata: { timestamp: new Date().toISOString() } },
          });
        }
        setUploadProgress((prev) => Math.min(95, prev + (15 / sessionData.photos.length)));
      }

      // End session on server
      const result = await api.collection.endSession(
        sessionData.sessionId,
        sessionData.summary
      );

      setUploadProgress(100);
      return result;
    },
    onSuccess: (data) => {
      setResult(data);
      setIsUploading(false);
      // Invalidate user stats
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
    },
    onError: () => {
      // Even on error, show what we have locally
      setIsUploading(false);
    },
  });

  useEffect(() => {
    // In a real app, we'd get the session data from the store before clearing
    // For now, simulate with placeholder data
    const mockSession: CollectionSession = {
      id: 'session-123',
      mode: 'passive',
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      endedAt: new Date(),
      points: Array(150).fill(null),
      photos: [],
      distanceMeters: 5230,
      duration: 1800,
      isPaused: false,
    };
    
    setSession(mockSession);

    // Simulate successful result
    setTimeout(() => {
      setResult({
        pointsProcessed: 150,
        duplicatesSkipped: 12,
        creditsEarned: 250,
        xpEarned: 180,
        bonuses: [
          { type: 'first_session', amount: 50, reason: 'First session of the day' },
          { type: 'distance', amount: 25, reason: '5km milestone' },
        ],
        achievements: [],
        newLevel: undefined,
      });
      setIsUploading(false);
    }, 2000);
  }, []);

  const handleDone = () => {
    clearSession();
    router.replace('/(tabs)');
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient
        colors={['#1E3A5F', '#2E5077']}
        className="pt-16 pb-12 px-6 items-center"
      >
        {isUploading ? (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text className="text-white text-xl font-bold mt-4">
              Processing Session...
            </Text>
            <View className="w-full h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
              <View
                className="h-full bg-white rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </View>
            <Text className="text-white/70 mt-2">
              Uploading data ({Math.round(uploadProgress)}%)
            </Text>
          </>
        ) : (
          <>
            <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center mb-4">
              <CheckCircle size={48} color="#fff" />
            </View>
            <Text className="text-white text-2xl font-bold">Session Complete!</Text>
            <Text className="text-white/70 mt-1">Great work out there 🎉</Text>
          </>
        )}
      </LinearGradient>

      {/* Session stats */}
      <View className="px-6 -mt-6">
        <View className="bg-white rounded-xl shadow-lg p-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Session Summary</Text>
          
          <View className="flex-row flex-wrap">
            <View className="w-1/2 mb-4">
              <View className="flex-row items-center">
                <Clock size={18} color="#666" />
                <Text className="text-gray-500 ml-2 text-sm">Duration</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mt-1">
                {formatDuration(session?.duration || 0)}
              </Text>
            </View>
            
            <View className="w-1/2 mb-4">
              <View className="flex-row items-center">
                <Navigation size={18} color="#666" />
                <Text className="text-gray-500 ml-2 text-sm">Distance</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mt-1">
                {((session?.distanceMeters || 0) / 1000).toFixed(2)} km
              </Text>
            </View>
            
            <View className="w-1/2">
              <View className="flex-row items-center">
                <MapPin size={18} color="#666" />
                <Text className="text-gray-500 ml-2 text-sm">Points Collected</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mt-1">
                {result?.pointsProcessed || session?.points.length || 0}
              </Text>
            </View>
            
            {session?.mode === 'dashcam' && (
              <View className="w-1/2">
                <View className="flex-row items-center">
                  <Camera size={18} color="#666" />
                  <Text className="text-gray-500 ml-2 text-sm">Photos</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900 mt-1">
                  {session?.photos.length || 0}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Earnings */}
      {result && (
        <View className="px-6 mt-4">
          <View className="bg-green-50 rounded-xl p-6">
            <Text className="text-lg font-bold text-green-900 mb-4">Earnings</Text>
            
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Coins size={20} color="#16A34A" />
                <Text className="text-green-800 ml-2">Credits Earned</Text>
              </View>
              <Text className="text-2xl font-bold text-green-600">
                +{result.creditsEarned}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Star size={20} color="#CA8A04" />
                <Text className="text-green-800 ml-2">XP Earned</Text>
              </View>
              <Text className="text-xl font-bold text-amber-600">
                +{result.xpEarned}
              </Text>
            </View>

            {/* Bonuses */}
            {result.bonuses.length > 0 && (
              <View className="mt-4 pt-4 border-t border-green-200">
                <Text className="text-sm font-semibold text-green-800 mb-2">Bonuses</Text>
                {result.bonuses.map((bonus, index) => (
                  <View key={index} className="flex-row justify-between items-center mb-1">
                    <Text className="text-green-700 text-sm">{bonus.reason}</Text>
                    <Text className="text-green-600 font-medium">+{bonus.amount}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Achievements unlocked */}
      {result?.achievements && result.achievements.length > 0 && (
        <View className="px-6 mt-4">
          <View className="bg-amber-50 rounded-xl p-6">
            <View className="flex-row items-center mb-4">
              <Trophy size={24} color="#D97706" />
              <Text className="text-lg font-bold text-amber-900 ml-2">
                Achievements Unlocked!
              </Text>
            </View>
            
            {result.achievements.map((achievement) => (
              <View
                key={achievement.id}
                className="flex-row items-center bg-white rounded-lg p-3 mb-2"
              >
                <Text className="text-2xl mr-3">{achievement.icon}</Text>
                <Text className="text-amber-900 font-medium">{achievement.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Level up */}
      {result?.newLevel && (
        <View className="px-6 mt-4">
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            className="rounded-xl p-6 items-center"
          >
            <Text className="text-white/70 text-sm">LEVEL UP!</Text>
            <Text className="text-white text-4xl font-bold mt-2">
              Level {result.newLevel.level}
            </Text>
            <Text className="text-white text-lg mt-1">
              {result.newLevel.title}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Actions */}
      <View className="px-6 mt-6 mb-8">
        <Pressable
          onPress={handleDone}
          disabled={isUploading}
          className={`py-4 rounded-xl items-center ${
            isUploading ? 'bg-gray-300' : 'bg-primary-600'
          }`}
        >
          <Text className="text-white font-bold text-lg">
            {isUploading ? 'Processing...' : 'Done'}
          </Text>
        </Pressable>

        {!isUploading && (
          <Pressable
            onPress={() => router.push('/(tabs)/map')}
            className="flex-row items-center justify-center mt-4 py-3"
          >
            <Text className="text-primary-600 font-medium">View on Map</Text>
            <ChevronRight size={18} color="#1E3A5F" />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
