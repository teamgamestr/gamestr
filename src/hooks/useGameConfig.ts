import { useLocalStorage } from './useLocalStorage';
import {
  type GameMetadata,
  type GameConfigMap,
  INITIAL_GAME_CONFIG,
  getGameMetadata,
  createGameKey,
  getAllGames,
  filterGamesByGenre,
  getFeaturedGames,
  getTrendingGames,
  getNewReleaseGames,
} from '@/lib/gameConfig';

const GAME_CONFIG_STORAGE_KEY = 'gamestr-game-config';

/**
 * Hook for managing game configuration with local storage persistence
 */
export function useGameConfig() {
  const [customConfig, setCustomConfig] = useLocalStorage<GameConfigMap>(
    GAME_CONFIG_STORAGE_KEY,
    INITIAL_GAME_CONFIG
  );

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
