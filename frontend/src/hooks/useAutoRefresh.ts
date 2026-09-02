import { useEffect, useRef } from 'react';

/**
 * A hook that automatically triggers a data refresh function when:
 * 1. The browser window regains focus (user switches back to the tab)
 * 2. A push notification is received (Service Worker sends a message)
 */
export function useAutoRefresh(fetchData: () => void) {
  // Use a ref so we always call the latest version of fetchData 
  // without needing it in the dependency array (which could cause infinite loops)
  const fetchRef = useRef(fetchData);

  useEffect(() => {
    fetchRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    // 1. Refetch on window focus
    const onFocus = () => {
      console.log('[AutoRefresh] Window focused, fetching fresh data...');
      fetchRef.current();
    };

    // 2. Refetch on Service Worker message (e.g. push notification arrived)
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REFRESH_DATA') {
        console.log('[AutoRefresh] Notification received, fetching fresh data...');
        fetchRef.current();
      }
    };

    window.addEventListener('focus', onFocus);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onMessage);
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      }
    };
  }, []);
}
