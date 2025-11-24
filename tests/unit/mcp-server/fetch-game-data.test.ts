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
});

