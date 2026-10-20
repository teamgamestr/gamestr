import { createContext } from "react";
import type { RelayEntry } from '@/lib/relays';

export type Theme = "dark" | "light" | "system";

export interface RelayMetadata {
  /** Relays from the visitor's NIP-65 list, or the app defaults when none is known */
  relays: RelayEntry[];
  /** `created_at` of the NIP-65 event these relays came from; 0 for the defaults */
  updatedAt: number;
  /** Pubkey the list belongs to; absent when the list is the app defaults */
  pubkey?: string;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Relays the client reads from and publishes to */
  relayMetadata: RelayMetadata;
  /** Number of recent scores to show on the homepage */
  latestScoresCount: number;
  /** Extra recent scores to prefetch before the user asks for more */
  latestScoresBufferCount: number;
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
