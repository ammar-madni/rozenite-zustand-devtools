import { useRozeniteDevToolsClient } from '@rozenite/plugin-bridge';
import { useEffect } from 'react';

import type {
  AllStoresSnapshot,
  EventMap,
  StoreEntry,
  StoreSnapshot,
} from './types';

const PLUGIN_ID = 'rozenite-zustand-devtools';

function toSnapshot(state: object): StoreSnapshot {
  return Object.fromEntries(
    Object.entries(state).filter(([, value]) => typeof value !== 'function')
  );
}

function getAllSnapshots(stores: StoreEntry[]): AllStoresSnapshot {
  return Object.fromEntries(
    stores.map(({ name, store }) => [name, toSnapshot(store.getState())])
  );
}

function deepSet(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown
): Record<string, unknown> {
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }
  return {
    ...obj,
    [head]: deepSet(
      (obj[head] as Record<string, unknown>) ?? {},
      rest,
      value
    ),
  };
}

export function useZustandDevToolsNative(stores: StoreEntry[]) {
  const client = useRozeniteDevToolsClient<EventMap>({
    pluginId: PLUGIN_ID,
  });

  useEffect(() => {
    if (!client) return;

    client.send('zustand:snapshot', getAllSnapshots(stores));

    const unsubRequest = client.onMessage('zustand:request-snapshot', () => {
      client.send('zustand:snapshot', getAllSnapshots(stores));
    });

    const unsubEditField = client.onMessage(
      'zustand:edit-field',
      ({ storeName, keyPath, value }) => {
        const entry = stores.find((s) => s.name === storeName);
        if (!entry) return;
        const current = entry.store.getState() as Record<string, unknown>;
        const updated = deepSet(current, keyPath, value);
        entry.store.setState(updated);
      }
    );

    const unsubDeleteKeys = client.onMessage(
      'zustand:delete-keys',
      ({ storeName, keys }) => {
        const entry = stores.find((s) => s.name === storeName);
        if (!entry) return;
        const current = entry.store.getState() as Record<string, unknown>;
        const next = Object.fromEntries(
          Object.entries(current).filter(([k]) => !keys.includes(k))
        );
        entry.store.setState(next, true);
      }
    );

    const unsubscribes = stores.map(({ name, store }) => {
      let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
      return store.subscribe(() => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          client.send('zustand:store-update', {
            storeName: name,
            state: toSnapshot(store.getState()),
          });
        });
      });
    });

    return () => {
      unsubRequest.remove();
      unsubEditField.remove();
      unsubDeleteKeys.remove();
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [client, stores]);
}
