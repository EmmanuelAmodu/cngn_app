import { useEffect } from 'react';

export function usePolling(fn: () => void, interval: number, option?: { immediate: boolean }) {
  useEffect(() => {
    if (option?.immediate) fn();
    const id = setInterval(fn, interval);
    return () => clearInterval(id);
  }, [fn, interval, option]);
}
