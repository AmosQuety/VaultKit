declare module 'react' {
  export type ReactNode = unknown;
  export type CSSProperties = Record<string, string | number>;
  export type MouseEvent<T = unknown> = { currentTarget: T };
  export function useState<T>(initial: T): [T, (value: T) => void];
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useRef<T>(initial: T): { current: T };
  export function createElement(type: unknown, props: unknown, ...children: unknown[]): unknown;
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: string): unknown;
  export function jsxs(type: unknown, props: unknown, key?: string): unknown;
}

declare module 'react-dom/client' {
  export function createRoot(element: HTMLElement): { render(node: unknown): void };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: unknown;
  }
}