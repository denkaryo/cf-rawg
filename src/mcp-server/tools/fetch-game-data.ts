import { RAWGClient } from '../../rawg/client';
import type { FilterOptions } from '../../rawg/types';

export interface FetchGameDataParams {
  platform?: string;
  genre?: string;
  dates?: string;
  metacritic?: string;
  page_size?: number;
}

export async function handleFetchGameData(
  params: FetchGameDataParams,
  rawgClient: RAWGClient
): Promise<{ games: any[]; count: number; filters: FilterOptions }> {
  const filters: FilterOptions = {};

  if (params.platform) {
    filters.platforms = params.platform;
  }

  if (params.genre) {
    filters.genres = params.genre;
  }

  if (params.dates) {
    filters.dates = params.dates;
  }

  if (params.metacritic) {
    filters.metacritic = params.metacritic;
  }

  if (params.page_size) {
    filters.page_size = Math.min(params.page_size, 40);
  }

  const response = await rawgClient.getGames(filters);

  return {
    games: response.results,
    count: response.count,
    filters,
  };
}

export const fetchGameDataTool = {
  name: 'fetch_game_data',
  description: 'Fetch game data from RAWG API with optional filters (platform, genre, date range, Metacritic score)',
  inputSchema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        description: "Platform ID or slug (e.g., 'pc', '4' for PC, 'playstation', '18' for PS4)",
      },
      genre: {
        type: 'string',
        description: "Genre ID or slug (e.g., 'action', '4')",
      },
      dates: {
        type: 'string',
        description: "Date range in format 'YYYY-MM-DD,YYYY-MM-DD' (e.g., '2024-01-01,2024-03-31')",
      },
      metacritic: {
        type: 'string',
        description: "Metacritic score range in format 'min,max' (e.g., '80,100')",
      },
      page_size: {
        type: 'number',
        description: 'Number of results per page (max 40)',
        minimum: 1,
        maximum: 40,
      },
    },
  },
};

