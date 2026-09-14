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

    const syncUserToDatabase = async (attempt = 1) => {
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

        const targetUrl = BACKEND_URL
          ? `${BACKEND_URL.replace(/\/+$/, '')}/api/users/sync`
          : '/api/users/sync';

        const response = await axios.post(targetUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });

        if (response.data?.success) {
          syncedUserIdRef.current = clerkId;
          setIsSynced(true);
          console.log('[Auth] User successfully synced with Neon PostgreSQL:', email);
        }
      } catch (err: any) {
        const errorDetail =
          err.response?.data?.details ||
          err.response?.data?.error ||
          err.message ||
          'Failed to sync user with database';

        console.error(`[Auth Sync Error] Attempt ${attempt} failed:`, errorDetail);
        setError(errorDetail);

        // Auto-retry up to 3 attempts with exponential backoff for cold starts
        if (attempt < 3 && syncedUserIdRef.current !== clerkId) {
          const delay = attempt * 1500;
          setTimeout(() => {
            syncUserToDatabase(attempt + 1);
          }, delay);
        }
      } finally {
        setIsSyncing(false);
      }
    };

    syncUserToDatabase(1);
  }, [isLoaded, isSignedIn, user]);

  return { isLoaded, isSignedIn, user, isSynced, isSyncing, error };
}
