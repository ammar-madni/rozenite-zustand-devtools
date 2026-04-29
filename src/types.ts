export type StoreSnapshot = Record<string, unknown>;

export type AllStoresSnapshot = Record<string, StoreSnapshot>;

export type StoreEntry = {
  name: string;
  store: {
    getState: () => object;
    subscribe: (listener: () => void) => () => void;
    setState: (partial: Partial<object>, replace?: boolean) => void;
  };
};

export type EventMap = {
  'zustand:snapshot': AllStoresSnapshot;
  'zustand:store-update': { storeName: string; state: StoreSnapshot };
  'zustand:request-snapshot': undefined;
  'zustand:edit-field': { storeName: string; keyPath: string[]; value: unknown };
  'zustand:delete-keys': { storeName: string; keys: string[] };
};
