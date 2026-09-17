import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((_callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((_callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage (some runtimes expose a Node-native localStorage that lacks
// getItem on `window`, which breaks library code reading it during render)
const localStorageStore = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void localStorageStore.set(key, value)),
    removeItem: vi.fn((key: string) => void localStorageStore.delete(key)),
    clear: vi.fn(() => void localStorageStore.clear()),
    key: vi.fn((index: number) => Array.from(localStorageStore.keys())[index] ?? null),
    get length() {
      return localStorageStore.size;
    },
  },
});
