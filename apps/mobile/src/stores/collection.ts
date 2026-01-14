// apps/mobile/src/stores/collection.ts
import type * as Location from 'expo-location';
import { create } from 'zustand';

export type CollectionMode = 'passive' | 'dashcam';

export interface CollectionPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  h3Index: string;
}

export interface CollectionSession {
  id: string;
  mode: CollectionMode;
  startedAt: Date;
  endedAt: Date | null;
  points: CollectionPoint[];
  photos: string[];
  distanceMeters: number;
  duration: number;
  isPaused: boolean;
}

interface CollectionState {
  activeSession: CollectionSession | null;
  isCollecting: boolean;
  lastLocation: Location.LocationObject | null;
  uploadQueue: string[];
  
  startSession: (mode: CollectionMode) => string;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => CollectionSession | null;
  addPoint: (location: Location.LocationObject) => void;
  addPhoto: (photoUri: string) => void;
  setLastLocation: (location: Location.LocationObject) => void;
  clearSession: () => void;
}

const generateId = () => Math.random().toString(36).slice(2);

const calculateDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useCollectionStore = create<CollectionState>((set, get) => ({
  activeSession: null,
  isCollecting: false,
  lastLocation: null,
  uploadQueue: [],

  startSession: (mode) => {
    const sessionId = generateId();
    const session: CollectionSession = {
      id: sessionId,
      mode,
      startedAt: new Date(),
      endedAt: null,
      points: [],
      photos: [],
      distanceMeters: 0,
      duration: 0,
      isPaused: false,
    };
    set({ activeSession: session, isCollecting: true });
    return sessionId;
  },

  pauseSession: () => {
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, isPaused: true }
        : null,
      isCollecting: false,
    }));
  },

  resumeSession: () => {
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, isPaused: false }
        : null,
      isCollecting: true,
    }));
  },

  endSession: () => {
    const { activeSession } = get();
    if (!activeSession) return null;

    const endedSession: CollectionSession = {
      ...activeSession,
      endedAt: new Date(),
      duration: Math.floor(
        (Date.now() - activeSession.startedAt.getTime()) / 1000
      ),
    };

    set({
      activeSession: null,
      isCollecting: false,
      uploadQueue: [...get().uploadQueue, endedSession.id],
    });

    return endedSession;
  },

  addPoint: (location) => {
    set((state) => {
      if (!state.activeSession || state.activeSession.isPaused) return state;

      const point: CollectionPoint = {
        id: generateId(),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp),
        accuracy: location.coords.accuracy ?? 0,
        speed: location.coords.speed,
        heading: location.coords.heading,
        altitude: location.coords.altitude,
        h3Index: '', // Would be calculated via h3-js
      };

      let additionalDistance = 0;
      const lastPoint = state.activeSession.points[state.activeSession.points.length - 1];
      if (lastPoint) {
        additionalDistance = calculateDistance(
          lastPoint.latitude,
          lastPoint.longitude,
          point.latitude,
          point.longitude
        );
      }

      return {
        activeSession: {
          ...state.activeSession,
          points: [...state.activeSession.points, point],
          distanceMeters: state.activeSession.distanceMeters + additionalDistance,
        },
        lastLocation: location,
      };
    });
  },

  addPhoto: (photoUri) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          photos: [...state.activeSession.photos, photoUri],
        },
      };
    });
  },

  setLastLocation: (location) => {
    set({ lastLocation: location });
  },

  clearSession: () => {
    set({ activeSession: null, isCollecting: false });
  },
}));
