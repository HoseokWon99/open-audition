import type { StoreApi, UseBoundStore } from "zustand";

export function resetStore<TState>(
  store: UseBoundStore<StoreApi<TState>>,
  initialState: Partial<TState>,
) {
  store.setState(initialState);
}
