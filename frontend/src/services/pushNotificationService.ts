import axiosInstance from './axiosInstance';

// VITE_API_URL already includes /api (e.g. https://xxx.railway.app/api)
const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '') + '/push';

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 * Required by the browser's pushManager.subscribe() call.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Register the service worker and request push notification permission.
 * Saves the resulting subscription to the backend.
 *
 * Returns:
 *   - 'subscribed'  → user granted permission, subscription saved
 *   - 'denied'      → user blocked notifications
 *   - 'unsupported' → browser doesn't support push
 *   - 'error'       → unexpected error
 */
export async function requestNotificationPermission(): Promise<
  'subscribed' | 'denied' | 'unsupported' | 'error'
> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Browser does not support Web Push');
    return 'unsupported';
  }

  try {
    // Fetch the VAPID public key from our backend
    const keyRes = await axiosInstance.get(`${API}/vapid-public-key`);
    const vapidPublicKey: string = keyRes.data?.data?.publicKey;
    if (!vapidPublicKey) return 'unsupported';

    // Register our service worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // Ask for notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      // Remove any old subscription from DB
      await axiosInstance.delete(`${API}/unsubscribe`).catch(() => {});
      return 'denied';
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
    });

    // Save subscription to our backend
    await axiosInstance.post(`${API}/subscribe`, { subscription });

    console.log('[Push] Successfully subscribed to push notifications');
    return 'subscribed';
  } catch (err) {
    console.error('[Push] Error subscribing to push notifications:', err);
    return 'error';
  }
}

/**
 * Check if the user already has an active push subscription.
 */
export async function checkPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await axiosInstance.delete(`${API}/unsubscribe`);
      console.log('[Push] Unsubscribed from push notifications');
    }
  } catch (err) {
    console.error('[Push] Error unsubscribing:', err);
  }
}
