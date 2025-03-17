import { useEffect } from 'react';

export function usePolling(fn: () => void, interval: number, option: { immediate: boolean, start: boolean }) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!option.start) return;

    if (option.immediate) fn();
    const id = setInterval(fn, interval);
    return () => clearInterval(id);
  }, [interval, option.immediate, option.start]);
}
