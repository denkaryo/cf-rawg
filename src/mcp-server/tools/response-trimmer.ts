import type { Game } from '../../rawg/types';

/**
 * Minimal game object with only essential fields for calculations
 */
export interface MinimalGame {
  id: number;
  name: string;
  metacritic?: number | null;
  rating: number;
  released?: string | null;
  // Include platforms/genres only if explicitly needed
  platforms?: Array<{ platform: { id: number; name: string } }>;
  genres?: Array<{ id: number; name: string }>;
}

/**
 * Options for trimming game responses
 */
export interface TrimOptions {
  maxGames?: number;
  includePlatforms?: boolean;
  includeGenres?: boolean;
}

/**
 * Summary statistics for truncated responses
 */
export interface ResponseSummary {
  totalCount: number;
  shown: number;
  avgMetacritic?: number | null;
  avgRating?: number;
  minMetacritic?: number | null;
  maxMetacritic?: number | null;
  minRating?: number;
  maxRating?: number;
}

/**
 * Result of trimming a game response
 */
export interface TrimmedResponse {
  games: MinimalGame[];
  summary?: ResponseSummary;
  truncated: boolean;
}

/**
 * Calculate average of numeric values, filtering out null/undefined
 */
function calculateAvg(values: (number | null | undefined)[], field: string): number | null {
  const validValues = values.filter((v): v is number => v !== null && v !== undefined);
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((a, b) => a + b, 0);
  return sum / validValues.length;
}

/**
 * Calculate min/max of numeric values, filtering out null/undefined
 */
function calculateMinMax(values: (number | null | undefined)[]): { min: number | null; max: number | null } {
  const validValues = values.filter((v): v is number => v !== null && v !== undefined);
  if (validValues.length === 0) return { min: null, max: null };
  return {
    min: Math.min(...validValues),
    max: Math.max(...validValues),
  };
}

/**
 * Trim a full Game object to minimal fields needed for calculations
 */
function trimGameObject(game: Game, options: TrimOptions): MinimalGame {
  const minimal: MinimalGame = {
    id: game.id,
    name: game.name,
    metacritic: game.metacritic,
    rating: game.rating,
    released: game.released,
  };

  // Only include platforms if explicitly requested
  if (options.includePlatforms && game.platforms) {
    minimal.platforms = game.platforms.map(p => ({
      platform: {
        id: p.platform.id,
        name: p.platform.name,
      },
    }));
  }

  // Only include genres if explicitly requested
  if (options.includeGenres && (game as any).genres) {
    minimal.genres = (game as any).genres.map((g: any) => ({
      id: g.id,
      name: g.name,
    }));
  }

  return minimal;
}

/**
 * Calculate summary statistics from a list of games
 */
function calculateSummaryStats(games: Game[]): ResponseSummary {
  const metacriticScores = games.map(g => g.metacritic);
  const ratings = games.map(g => g.rating);

  const metacriticStats = calculateMinMax(metacriticScores);
  const ratingStats = calculateMinMax(ratings);

  return {
    totalCount: games.length,
    shown: games.length,
    avgMetacritic: calculateAvg(metacriticScores, 'metacritic'),
    avgRating: calculateAvg(ratings, 'rating') ?? undefined,
    minMetacritic: metacriticStats.min,
    maxMetacritic: metacriticStats.max,
    minRating: ratingStats.min ?? undefined,
    maxRating: ratingStats.max ?? undefined,
  };
}

/**
 * Trim game response to reduce payload size
 * 
 * @param games - Full game objects from RAWG API
 * @param totalCount - Total count from API (may be larger than games.length)
 * @param options - Trimming options
 * @returns Trimmed response with minimal game objects and optional summary
 */
export function trimGameResponse(
  games: Game[],
  totalCount: number,
  options: TrimOptions = {}
): TrimmedResponse {
  const maxGames = options.maxGames || 30;
  const includePlatforms = options.includePlatforms || false;
  const includeGenres = options.includeGenres || false;

  let trimmedGames = games;
  let truncated = false;

  // Truncate if we have more games than max
  if (games.length > maxGames) {
    trimmedGames = games.slice(0, maxGames);
    truncated = true;
  }

  // Trim each game object to minimal fields
  const minimalGames = trimmedGames.map(game =>
    trimGameObject(game, { includePlatforms, includeGenres })
  );

  // Calculate summary stats if truncated
  let summary: ResponseSummary | undefined;
  if (truncated && games.length > 0) {
    // Calculate stats from ALL games (not just shown ones)
    summary = calculateSummaryStats(games);
    summary.shown = maxGames;
    summary.totalCount = totalCount;
  }

  return {
    games: minimalGames,
    summary,
    truncated,
  };
}

