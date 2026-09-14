import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export function useSyncUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isSynced, setIsSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    const clerkId = user.id;
    const email = user.primaryEmailAddress?.emailAddress;

    if (!email || syncedUserIdRef.current === clerkId) {
      return;
    }

    const syncUserToDatabase = async () => {
      try {
        setIsSyncing(true);
        setError(null);

        const payload = {
          clerkId,
          email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          imageUrl: user.imageUrl || '',
        };

        if (BACKEND_URL) {
          await axios.post(`${BACKEND_URL}/api/users/sync`, payload);
        } else {
          await axios.post('/api/users/sync', payload);
        }

        syncedUserIdRef.current = clerkId;
        setIsSynced(true);
        console.log('[Auth] User successfully synced with database:', email);
      } catch (err: any) {
        console.error('[Auth Sync Error]:', err);
        setError(err?.message || 'Failed to sync user with database');
      } finally {
        setIsSyncing(false);
      }
    };

    syncUserToDatabase();
  }, [isLoaded, isSignedIn, user]);

  return { isLoaded, isSignedIn, user, isSynced, isSyncing, error };
}
