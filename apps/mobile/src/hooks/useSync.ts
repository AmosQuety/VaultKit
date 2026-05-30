export function useSync() {
  return {
    syncing: false,
    syncNow: async () => undefined
  };
}