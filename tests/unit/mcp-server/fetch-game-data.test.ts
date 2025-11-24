import { describe, test, expect, vi, beforeEach } from 'vitest';
import { handleFetchGameData } from '../../../src/mcp-server/tools/fetch-game-data';
import { RAWGClient } from '../../../src/rawg/client';

describe('fetch_game_data tool', () => {
  let mockRawgClient: RAWGClient;

  beforeEach(() => {
    mockRawgClient = {
      getGames: vi.fn(),
    } as any;
  });

  test('transforms filters correctly', async () => {
    const mockResponse = {
      count: 1,
      results: [{ id: 1, name: 'Test Game', metacritic: 85 }],
    };

    vi.mocked(mockRawgClient.getGames).mockResolvedValue(mockResponse as any);

    const result = await handleFetchGameData(
      {
        platform: '4',
        genre: 'action',
        dates: '2024-01-01,2024-03-31',
        metacritic: '80,100',
        page_size: 20,
      },
      mockRawgClient
    );

    expect(mockRawgClient.getGames).toHaveBeenCalledWith({
      platforms: '4',
      genres: 'action',
      dates: '2024-01-01,2024-03-31',
      metacritic: '80,100',
      page_size: 20,
    });

    expect(result.games).toEqual(mockResponse.results);
    expect(result.count).toBe(1);
  });

  test('formats response properly', async () => {
    const mockResponse = {
      count: 5,
      results: [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' },
      ],
    };

    vi.mocked(mockRawgClient.getGames).mockResolvedValue(mockResponse as any);

    const result = await handleFetchGameData({}, mockRawgClient);

    expect(result).toHaveProperty('games');
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('filters');
    expect(result.games).toHaveLength(2);
    expect(result.count).toBe(5);
  });

  test('limits page_size to 40', async () => {
    const mockResponse = { count: 0, results: [] };
    vi.mocked(mockRawgClient.getGames).mockResolvedValue(mockResponse as any);

    await handleFetchGameData({ page_size: 100 }, mockRawgClient);

    expect(mockRawgClient.getGames).toHaveBeenCalledWith({
      page_size: 40,
    });
  });

  test('handles partial filters', async () => {
    const mockResponse = { count: 0, results: [] };
    vi.mocked(mockRawgClient.getGames).mockResolvedValue(mockResponse as any);

    await handleFetchGameData({ platform: '4' }, mockRawgClient);

    expect(mockRawgClient.getGames).toHaveBeenCalledWith({
      platforms: '4',
    });
  });

  test('warns when no games have Metacritic scores', async () => {
    const gamesWithoutMetacritic = [
      { name: 'Game 1', metacritic: null },
      { name: 'Game 2', metacritic: null },
    ];
    mockRawgClient.getGames = vi.fn().mockResolvedValue({
      results: gamesWithoutMetacritic,
      count: 2,
    });

    const result = await handleFetchGameData(
      { platform: '4', dates: '2024-01-01,2024-03-31', metacritic: '80,100' },
      mockRawgClient
    );

    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('No games found with Metacritic scores');
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion).toContain('rating field');
  });

  test('warns when Metacritic coverage is sparse', async () => {
    const gamesWithSparseMetacritic = [
      { name: 'Game 1', metacritic: 85 },
      { name: 'Game 2', metacritic: null },
      { name: 'Game 3', metacritic: null },
      { name: 'Game 4', metacritic: null },
      { name: 'Game 5', metacritic: null },
      { name: 'Game 6', metacritic: null },
      { name: 'Game 7', metacritic: null },
      { name: 'Game 8', metacritic: null },
      { name: 'Game 9', metacritic: null },
      { name: 'Game 10', metacritic: null },
      { name: 'Game 11', metacritic: null },
    ];
    mockRawgClient.getGames = vi.fn().mockResolvedValue({
      results: gamesWithSparseMetacritic,
      count: 11,
    });

    const result = await handleFetchGameData(
      { platform: '4', dates: '2020-01-01,2020-03-31', metacritic: '80,100' },
      mockRawgClient
    );

    expect(result.warning).toBeDefined();
    expect(result.warning).toMatch(/Only \d+ out of \d+ games have Metacritic scores/);
    expect(result.suggestion).toBeDefined();
  });

  test('warns for recent years (2022+)', async () => {
    mockRawgClient.getGames = vi.fn().mockResolvedValue({
      results: [{ name: 'Game 1', metacritic: 85 }],
      count: 1,
    });

    const result = await handleFetchGameData(
      { platform: '4', dates: '2024-01-01,2024-03-31', metacritic: '80,100' },
      mockRawgClient
    );

    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('very sparse for recent years');
    expect(result.suggestion).toBeDefined();
  });
});

