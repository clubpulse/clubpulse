import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { afterFirstStepsSync } from '../lib/stepsSync';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push doesn't work on simulator
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/**
 * Registers push token and stores it in Supabase for server-side sends.
 * Returns the token and a boolean for whether push is enabled.
 * Nothing is asked until the person is signed in, and then only after the steps permission
 * sheet has been answered, so the two prompts appear one at a time.
 */
export function usePushNotifications(signedIn: boolean) {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    afterFirstStepsSync().then(() => (cancelled ? null : registerForPushNotifications())).then(async (token) => {
      if (!token || cancelled) return;
      setPushToken(token);
      setEnabled(true);

      // Store push token in the user's profile for server-side sends
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          push_token: token,
          push_platform: Platform.OS,
          push_updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }
    });

    // Listen for incoming notifications while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Could update badge count, refresh wallet, etc.
    });

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // Could deep-link to store, wallet, scratch card, etc.
      // const data = response.notification.request.content.data;
    });

    return () => {
      cancelled = true;
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [signedIn]);

  return { pushToken, enabled };
}
