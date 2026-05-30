import { useEffect, useState } from 'react';

export function useNetInfo() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    setIsConnected(true);
  }, []);

  return { isConnected };
}