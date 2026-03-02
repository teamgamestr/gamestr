import { useEffect, useCallback } from 'react';
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

  const addGame = useCallback((pubkey: string, gameIdentifier: string, metadata: GameMetadata) => {
    const key = createGameKey(pubkey, gameIdentifier);
    setCustomConfig(prev => ({
      ...prev,
      [key]: metadata,
    }));
  }, [setCustomConfig]);

  const updateGame = useCallback((pubkey: string, gameIdentifier: string, metadata: Partial<GameMetadata>) => {
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
  }, [customConfig, setCustomConfig]);

  const removeGame = useCallback((pubkey: string, gameIdentifier: string) => {
    const key = createGameKey(pubkey, gameIdentifier);
    setCustomConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[key];
      return newConfig;
    });
  }, [setCustomConfig]);

  const getGame = useCallback((pubkey: string, gameIdentifier: string): GameMetadata => {
    return getGameMetadata(pubkey, gameIdentifier, customConfig);
  }, [customConfig]);

  const resetToDefaults = useCallback(() => {
    setCustomConfig(INITIAL_GAME_CONFIG);
  }, [setCustomConfig]);

  const getAllGamesMemo = useCallback(() => getAllGames(customConfig), [customConfig]);
  const filterByGenreMemo = useCallback((genre: string) => filterGamesByGenre(genre, customConfig), [customConfig]);
  const getFeaturedMemo = useCallback(() => getFeaturedGames(customConfig), [customConfig]);
  const getTrendingMemo = useCallback(() => getTrendingGames(customConfig), [customConfig]);
  const getNewReleasesMemo = useCallback(() => getNewReleaseGames(customConfig), [customConfig]);

  return {
    config: customConfig,
    configVersion: GAME_CONFIG_VERSION,
    addGame,
    updateGame,
    removeGame,
    getGame,
    getAllGames: getAllGamesMemo,
    filterByGenre: filterByGenreMemo,
    getFeatured: getFeaturedMemo,
    getTrending: getTrendingMemo,
    getNewReleases: getNewReleasesMemo,
    resetToDefaults,
  };
}
