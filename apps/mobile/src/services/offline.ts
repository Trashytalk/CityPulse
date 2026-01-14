// apps/mobile/src/services/offline.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { api } from './api';

const PENDING_UPLOADS_KEY = 'citypulse-pending-uploads';

interface PendingUpload {
  id: string;
  sessionId: string;
  type: 'points' | 'photo' | 'session-end';
  data: any;
  createdAt: string;
  retryCount: number;
}

export const offlineService = {
  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  },

  /**
   * Queue data for upload when offline
   */
  async queueUpload(upload: Omit<PendingUpload, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    const pending = await this.getPendingUploads();
    
    const newUpload: PendingUpload = {
      ...upload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    pending.push(newUpload);
    await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(pending));
  },

  /**
   * Get all pending uploads
   */
  async getPendingUploads(): Promise<PendingUpload[]> {
    const data = await AsyncStorage.getItem(PENDING_UPLOADS_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Remove a pending upload
   */
  async removeUpload(id: string): Promise<void> {
    const pending = await this.getPendingUploads();
    const filtered = pending.filter((u) => u.id !== id);
    await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(filtered));
  },

  /**
   * Update retry count for a pending upload
   */
  async updateRetryCount(id: string): Promise<void> {
    const pending = await this.getPendingUploads();
    const updated = pending.map((u) =>
      u.id === id ? { ...u, retryCount: u.retryCount + 1 } : u
    );
    await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(updated));
  },

  /**
   * Process all pending uploads
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      return { success: 0, failed: 0 };
    }

    const pending = await this.getPendingUploads();
    let success = 0;
    let failed = 0;

    for (const upload of pending) {
      // Skip uploads that have failed too many times
      if (upload.retryCount >= 5) {
        failed++;
        continue;
      }

      try {
        switch (upload.type) {
          case 'points':
            await api.collection.submitPoints(upload.sessionId, upload.data);
            break;
          case 'photo':
            await api.collection.uploadPhoto(
              upload.sessionId,
              upload.data.photoUri,
              upload.data.metadata
            );
            break;
          case 'session-end':
            await api.collection.endSession(upload.sessionId, upload.data);
            break;
        }

        await this.removeUpload(upload.id);
        success++;
      } catch (error) {
        await this.updateRetryCount(upload.id);
        failed++;
      }
    }

    return { success, failed };
  },

  /**
   * Get pending upload count
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingUploads();
    return pending.length;
  },

  /**
   * Clear all pending uploads (use with caution)
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_UPLOADS_KEY);
  },

  /**
   * Start background sync on network change
   */
  startNetworkListener(): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        // Process queue when coming back online
        this.processQueue().catch(console.error);
      }
    });

    return unsubscribe;
  },
};
