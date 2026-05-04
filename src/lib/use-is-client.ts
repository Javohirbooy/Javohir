import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * SSR: false; klientda gidratsiyadan keyin: true.
 * `useEffect` + `setMounted` o‘rniga — `react-hooks/set-state-in-effect` lint bilan mos.
 */
export function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
