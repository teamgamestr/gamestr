import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import {
  type GameMetadata,
  type GameConfigMap,
  INITIAL_GAME_CONFIG,
  GAME_CONFIG_VERSION,
  getGameMetadata,
  createGameKey,
  getAllGames,
  filterGamesByGenre,
  getFeaturedGames,
  getTrendingGames,
  getNewReleaseGames,
} from '@/lib/gameConfig';

const GAME_CONFIG_STORAGE_KEY = 'gamestr-game-config';
const GAME_CONFIG_VERSION_KEY = 'gamestr-game-config-version';

/**
 * Hook for managing game configuration with local storage persistence
 * Automatically invalidates cache when GAME_CONFIG_VERSION changes
 */
export function useGameConfig() {
  const [storedVersion, setStoredVersion] = useLocalStorage<string>(
    GAME_CONFIG_VERSION_KEY,
    ''
  );
  
  const [customConfig, setCustomConfig] = useLocalStorage<GameConfigMap>(
    GAME_CONFIG_STORAGE_KEY,
    INITIAL_GAME_CONFIG
  );

  // Auto-invalidate cache when version changes
  useEffect(() => {
    if (storedVersion !== GAME_CONFIG_VERSION) {
      console.log(`[GameConfig] Version changed from "${storedVersion}" to "${GAME_CONFIG_VERSION}", resetting to defaults`);
      setCustomConfig(INITIAL_GAME_CONFIG);
      setStoredVersion(GAME_CONFIG_VERSION);
    }
  }, [storedVersion, setCustomConfig, setStoredVersion]);

  const addGame = (pubkey: string, gameIdentifier: string, metadata: GameMetadata) => {
    const key = createGameKey(pubkey, gameIdentifier);
    setCustomConfig(prev => ({
      ...prev,
      [key]: metadata,
    }));
  };

  const updateGame = (pubkey: string, gameIdentifier: string, metadata: Partial<GameMetadata>) => {
    const key = createGameKey(pubkey, gameIdentifier);
    const existing = customConfig[key];
    
    if (!existing) {
      console.warn(`Game ${key} not found in config`);
      return;
    }

    setCustomConfig(prev => ({
      ...prev,
      [key]: {
        ...existing,
        ...metadata,
      },
    }));
  };

  const removeGame = (pubkey: string, gameIdentifier: string) => {
    const key = createGameKey(pubkey, gameIdentifier);
    setCustomConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[key];
      return newConfig;
    });
  };

  const getGame = (pubkey: string, gameIdentifier: string): GameMetadata => {
    return getGameMetadata(pubkey, gameIdentifier, customConfig);
  };

  const resetToDefaults = () => {
    setCustomConfig(INITIAL_GAME_CONFIG);
  };

  return {
    config: customConfig,
    configVersion: GAME_CONFIG_VERSION,
    addGame,
    updateGame,
    removeGame,
    getGame,
    getAllGames: () => getAllGames(customConfig),
    filterByGenre: (genre: string) => filterGamesByGenre(genre, customConfig),
    getFeatured: () => getFeaturedGames(customConfig),
    getTrending: () => getTrendingGames(customConfig),
    getNewReleases: () => getNewReleaseGames(customConfig),
    resetToDefaults,
  };
}
