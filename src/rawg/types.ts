export interface PlatformInfo {
  id: number;
  slug: string;
  name: string;
}

export interface GamePlatform {
  platform: PlatformInfo;
  released_at?: string | null;
  requirements?: {
    minimum?: string;
    recommended?: string;
  } | null;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
  games_count: number;
  image_background: string;
}

export interface Platform {
  id: number;
  name: string;
  slug: string;
  games_count: number;
  image_background: string;
  image?: string | null;
  year_start?: number | null;
  year_end?: number | null;
}

export interface Game {
  id: number;
  slug: string;
  name: string;
  released?: string | null;
  tba: boolean;
  background_image?: string | null;
  rating: number;
  rating_top: number;
  ratings: Record<string, number>;
  ratings_count: number;
  reviews_text_count: string;
  added: number;
  added_by_status: Record<string, number>;
  metacritic?: number | null;
  playtime: number;
  suggestions_count: number;
  updated: string;
  esrb_rating?: {
    id: number;
    slug: string;
    name: string;
  } | null;
  platforms: GamePlatform[];
}

export interface GameListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Game[];
}

export interface FilterOptions {
  page?: number;
  page_size?: number;
  search?: string;
  platforms?: string;
  genres?: string;
  dates?: string;
  metacritic?: string;
  ordering?: string;
}

