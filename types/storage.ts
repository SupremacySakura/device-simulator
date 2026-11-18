export interface PersistedState<T> {
  version: number;
  data: T;
}
