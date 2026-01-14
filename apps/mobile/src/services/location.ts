// apps/mobile/src/services/location.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { useCollectionStore } from '../stores/collection';

const LOCATION_TASK = 'citypulse-location-tracking';

interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Define the background task
TaskManager.defineTask<LocationTaskData>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data?.locations) {
    const { isCollecting, addPoint } = useCollectionStore.getState();
    
    if (isCollecting) {
      for (const location of data.locations) {
        addPoint(location);
      }
    }
  }
});

export const locationService = {
  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = 
      await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      return false;
    }

    const { status: backgroundStatus } = 
      await Location.requestBackgroundPermissionsAsync();
    
    return backgroundStatus === 'granted';
  },

  /**
   * Start background location tracking
   */
  async startTracking(options?: {
    accuracy?: Location.Accuracy;
    distanceInterval?: number;
    timeInterval?: number;
  }): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permissions not granted');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: options?.accuracy ?? Location.Accuracy.BestForNavigation,
      distanceInterval: options?.distanceInterval ?? 10, // 10 meters
      timeInterval: options?.timeInterval ?? 5000, // 5 seconds
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'CityPulse is collecting data',
        notificationBody: 'Tap to return to the app',
        notificationColor: '#1E3A5F',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
    });
  },

  /**
   * Stop background location tracking
   */
  async stopTracking(): Promise<void> {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  },

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location.LocationObject> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
  },

  /**
   * Check if location tracking is active
   */
  async isTracking(): Promise<boolean> {
    return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  },

  /**
   * Watch location in foreground
   */
  watchLocation(
    callback: (location: Location.LocationObject) => void,
    options?: {
      accuracy?: Location.Accuracy;
      distanceInterval?: number;
      timeInterval?: number;
    }
  ): Promise<Location.LocationSubscription> {
    return Location.watchPositionAsync(
      {
        accuracy: options?.accuracy ?? Location.Accuracy.BestForNavigation,
        distanceInterval: options?.distanceInterval ?? 10,
        timeInterval: options?.timeInterval ?? 5000,
      },
      callback
    );
  },
};
