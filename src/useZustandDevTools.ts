import { useState, useEffect, useCallback } from 'react';
import { useRozeniteDevToolsClient } from '@rozenite/plugin-bridge';

import { AllStoresSnapshot, EventMap } from './types';

export function useZustandDevTools() {
  const client = useRozeniteDevToolsClient<EventMap>({
    pluginId: 'rozenite-zustand-devtools',
  });
  const [stores, setStores] = useState<AllStoresSnapshot>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!client) return;

    client.send('zustand:request-snapshot', undefined);

    const unsubSnapshot = client.onMessage('zustand:snapshot', (snapshot) => {
      setStores(snapshot);
      const now = Date.now();
      setLastUpdated(
        Object.fromEntries(Object.keys(snapshot).map((k) => [k, now]))
      );
    });

    const unsubUpdate = client.onMessage(
      'zustand:store-update',
      ({ storeName, state }) => {
        setStores((prev) => ({ ...prev, [storeName]: state }));
        setLastUpdated((prev) => ({ ...prev, [storeName]: Date.now() }));
      }
    );

    return () => {
      unsubSnapshot.remove();
      unsubUpdate.remove();
    };
  }, [client]);

  const editField = useCallback(
    (storeName: string, keyPath: string[], value: unknown) => {
      client?.send('zustand:edit-field', { storeName, keyPath, value });
    },
    [client]
  );

  const deleteKeys = useCallback(
    (storeName: string, keys: string[]) => {
      client?.send('zustand:delete-keys', { storeName, keys });
    },
    [client]
  );

  return { stores, lastUpdated, editField, deleteKeys };
}
