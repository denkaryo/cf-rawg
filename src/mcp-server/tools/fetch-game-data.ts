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
): Promise<{ games: any[]; count: number; filters: FilterOptions; warning?: string; suggestion?: string }> {
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

  let warning: string | undefined;
  let suggestion: string | undefined;

  if (params.metacritic) {
    const gamesWithMetacritic = response.results.filter(g => g.metacritic !== null && g.metacritic !== undefined);
    const totalGames = response.count;
    const gamesWithMetacriticCount = gamesWithMetacritic.length;

    if (totalGames > 0 && gamesWithMetacriticCount === 0) {
      warning = 'No games found with Metacritic scores for the specified filters. Metacritic data coverage is limited in RAWG database, especially for recent years (2022+).';
      suggestion = 'Consider using the rating field instead, which has much better coverage (85-100% for most years). Fetch games without metacritic filter and filter by rating field in the results.';
    } else if (totalGames > 0 && gamesWithMetacriticCount < totalGames * 0.1) {
      warning = `Only ${gamesWithMetacriticCount} out of ${totalGames} games have Metacritic scores (${Math.round((gamesWithMetacriticCount / totalGames) * 100)}% coverage). Metacritic data is sparse for this time period.`;
      suggestion = 'Consider using the rating field for better data coverage, or expand the date range to years with better Metacritic coverage (2001-2010 have 5-15% coverage).';
    } else if (params.dates) {
      const yearMatch = params.dates.match(/^(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 2022) {
          warning = 'Metacritic scores are very sparse for recent years (2022+). Coverage drops significantly after 2021.';
          suggestion = 'For better data availability, consider using the rating field instead, or query years 2001-2021 which have better Metacritic coverage.';
        }
      }
    }
  }

  return {
    games: response.results,
    count: response.count,
    filters,
    ...(warning && { warning }),
    ...(suggestion && { suggestion }),
  };
}

export const fetchGameDataTool = {
  name: 'fetch_game_data',
  description: 'Fetch game data from RAWG API with optional filters (platform, genre, date range, Metacritic score). Note: Metacritic scores have limited coverage in RAWG database - best coverage is 2001-2010 (5-15%), declining to near-zero for 2022+. For recent years, consider using the rating field instead which has 85-100% coverage.',
  inputSchema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        description: "Platform ID (use these IDs): PC=4, PlayStation 5=187, PlayStation 4=18, Xbox Series X/S=186, Xbox One=1, Nintendo Switch=7, macOS=5, Linux=6, iOS=3, Android=21",
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
        description: "Metacritic score range in format 'min,max' (e.g., '80,100'). WARNING: Metacritic data coverage is very limited, especially for recent years (2022+). For 2024, only 2 games total have Metacritic scores. Consider using rating field for better coverage.",
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

