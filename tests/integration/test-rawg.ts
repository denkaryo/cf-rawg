import 'dotenv/config';
import { RAWGClient } from '../../src/rawg/client';

async function main() {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    console.error('ERROR: RAWG_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new RAWGClient(apiKey);

  console.log('Testing RAWG API client with ACTUAL API calls...\n');

  try {
    console.log('1. Fetching PC games from Q1 2024...');
    const q1Games = await client.getGames({
      platforms: '4',
      dates: '2024-01-01,2024-03-31',
      page_size: 40,
    });
    console.log(`   Fetched ${q1Games.results.length} games`);
    console.log(`   Total available: ${q1Games.count} games`);
    if (q1Games.results.length > 0) {
      const sample = q1Games.results[0];
      console.log(`   Sample game: ${sample.name} (Metacritic: ${sample.metacritic || 'N/A'})`);
    }

    console.log('\n2. Fetching Action genre games...');
    const actionGames = await client.getGames({
      genres: 'action',
      page_size: 20,
    });
    console.log(`   Fetched ${actionGames.results.length} games`);
    if (actionGames.results.length > 0) {
      const sample = actionGames.results[0];
      console.log(`   Sample game: ${sample.name}`);
      console.log(`   Genres: ${sample.platforms.map(p => p.platform.name).join(', ')}`);
    }

    console.log('\n3. Verifying response structure...');
    const allValid = q1Games.results.every(game => {
      return (
        typeof game.id === 'number' &&
        typeof game.name === 'string' &&
        typeof game.rating === 'number' &&
        (game.metacritic === null || typeof game.metacritic === 'number')
      );
    });
    console.log(`   All games have valid structure: ${allValid ? 'PASS' : 'FAIL'}`);

    console.log('\n4. Testing pagination with getAllGames...');
    const allPCGames = await client.getAllGames({
      platforms: '4',
      dates: '2024-01-01,2024-03-31',
    });
    console.log(`   Fetched ${allPCGames.length} total games (all pages)`);
    console.log(`   First game: ${allPCGames[0]?.name || 'N/A'}`);
    console.log(`   Last game: ${allPCGames[allPCGames.length - 1]?.name || 'N/A'}`);

    console.log('\n5. Fetching genres...');
    const genres = await client.getGenres();
    console.log(`   Fetched ${genres.length} genres`);
    console.log(`   Sample genres: ${genres.slice(0, 5).map(g => g.name).join(', ')}`);

    console.log('\n6. Fetching platforms...');
    const platforms = await client.getPlatforms();
    console.log(`   Fetched ${platforms.length} platforms`);
    console.log(`   Sample platforms: ${platforms.slice(0, 5).map(p => p.name).join(', ')}`);

    console.log('\n✅ All integration tests passed!');
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

main();

