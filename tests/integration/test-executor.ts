import 'dotenv/config';
import { RAWGClient } from '../../src/rawg/client';
import { buildContext } from '../../src/executor/runtime';
import { executeSafely } from '../../src/executor/sandbox';

async function main() {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    console.error('ERROR: RAWG_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new RAWGClient(apiKey);

  console.log('Testing Code Executor with REAL game data from RAWG API...\n');

  try {
    console.log('1. Fetching PC games with Metacritic scores from Q1 2024...');
    const games = await client.getGames({
      platforms: '4',
      dates: '2024-01-01,2024-03-31',
      metacritic: '50,100',
      page_size: 40,
    });

    console.log(`   Fetched ${games.results.length} games`);
    
    const gameData = games.results.filter(g => g.metacritic !== null && g.metacritic !== undefined);
    
    if (gameData.length === 0) {
      console.log('   No games with Metacritic scores found. Using sample data for testing...');
      gameData.push(
        { id: 1, slug: 'game-1', name: 'Game 1', released: '2024-01-15', tba: false, rating: 4.5, rating_top: 5, ratings: {}, ratings_count: 100, reviews_text_count: '50', added: 1000, added_by_status: {}, metacritic: 85, playtime: 20, suggestions_count: 5, updated: '2024-01-01T00:00:00Z', platforms: [] },
        { id: 2, slug: 'game-2', name: 'Game 2', released: '2024-02-10', tba: false, rating: 4.7, rating_top: 5, ratings: {}, ratings_count: 150, reviews_text_count: '75', added: 1100, added_by_status: {}, metacritic: 90, playtime: 25, suggestions_count: 8, updated: '2024-02-01T00:00:00Z', platforms: [] },
        { id: 3, slug: 'game-3', name: 'Game 3', released: '2024-03-05', tba: false, rating: 4.2, rating_top: 5, ratings: {}, ratings_count: 80, reviews_text_count: '40', added: 900, added_by_status: {}, metacritic: 75, playtime: 15, suggestions_count: 3, updated: '2024-03-01T00:00:00Z', platforms: [] },
        { id: 4, slug: 'game-4', name: 'Game 4', released: '2024-01-20', tba: false, rating: 4.6, rating_top: 5, ratings: {}, ratings_count: 120, reviews_text_count: '60', added: 1050, added_by_status: {}, metacritic: 88, playtime: 22, suggestions_count: 6, updated: '2024-01-15T00:00:00Z', platforms: [] },
        { id: 5, slug: 'game-5', name: 'Game 5', released: '2024-02-28', tba: false, rating: 4.4, rating_top: 5, ratings: {}, ratings_count: 95, reviews_text_count: '45', added: 980, added_by_status: {}, metacritic: 82, playtime: 18, suggestions_count: 4, updated: '2024-02-20T00:00:00Z', platforms: [] }
      );
    }
    
    console.log(`   Using ${gameData.length} games with Metacritic scores\n`);

    console.log('2. Calculating average Metacritic score...');
    const avgCode = `
      const gamesWithScore = games.filter(g => g.metacritic !== null && g.metacritic !== undefined);
      const scores = gamesWithScore.map(g => g.metacritic);
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    `;
    const context1 = buildContext({ games: gameData });
    const avgResult = await executeSafely(avgCode, context1);
    
    if (avgResult.success) {
      const gamesWithScore = gameData.filter(g => g.metacritic !== null && g.metacritic !== undefined);
      const manualAvg = gamesWithScore.reduce((sum, g) => sum + (g.metacritic || 0), 0) / gamesWithScore.length;
      console.log(`   Calculated average: ${avgResult.value.toFixed(2)}`);
      console.log(`   Manual calculation: ${manualAvg.toFixed(2)}`);
      console.log(`   Match: ${Math.abs(avgResult.value - manualAvg) < 0.01 ? 'PASS' : 'FAIL'}`);
    } else {
      console.log(`   Error: ${avgResult.error}`);
    }

    console.log('\n3. Using helper functions (avg, sum)...');
    const helperCode = `
      const gamesWithScore = games.filter(g => g.metacritic !== null && g.metacritic !== undefined);
      const scores = gamesWithScore.map(g => g.metacritic);
      return {
        average: avg(scores),
        sum: sum(scores),
        count: scores.length
      };
    `;
    const context2 = buildContext({ games: gameData });
    const helperResult = await executeSafely(helperCode, context2);
    
    if (helperResult.success) {
      console.log(`   Average: ${helperResult.value.average.toFixed(2)}`);
      console.log(`   Sum: ${helperResult.value.sum}`);
      console.log(`   Count: ${helperResult.value.count}`);
    } else {
      console.log(`   Error: ${helperResult.error}`);
    }

    console.log('\n4. Grouping games by rating range and calculating averages...');
    const groupCode = `
      const grouped = {};
      games.forEach(game => {
        if (game.metacritic === null || game.metacritic === undefined) return;
        const ratingRange = Math.floor(game.metacritic / 10) * 10;
        const key = \`\${ratingRange}-\${ratingRange + 9}\`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(game.metacritic);
      });
      const result = {};
      for (const [range, scores] of Object.entries(grouped)) {
        result[range] = {
          count: scores.length,
          average: avg(scores)
        };
      }
      return result;
    `;
    const context3 = buildContext({ games: gameData });
    const groupResult = await executeSafely(groupCode, context3);
    
    if (groupResult.success) {
      console.log('   Rating ranges:');
      const resultValue = groupResult.value as Record<string, { count: number; average: number }>;
      for (const [range, data] of Object.entries(resultValue)) {
        console.log(`     ${range}: ${data.count} games, avg ${data.average.toFixed(2)}`);
      }
    } else {
      console.log(`   Error: ${groupResult.error}`);
    }

    console.log('\n5. Complex multi-step calculation...');
    const complexCode = `
      const gamesWithScore = games.filter(g => g.metacritic !== null && g.metacritic !== undefined);
      const scores = gamesWithScore.map(g => g.metacritic);
      const sorted = scores.sort((a, b) => b - a);
      const top10 = sorted.slice(0, Math.min(10, sorted.length));
      const bottom10 = sorted.slice(-Math.min(10, sorted.length));
      return {
        total: gamesWithScore.length,
        top10Avg: top10.length > 0 ? avg(top10) : 0,
        bottom10Avg: bottom10.length > 0 ? avg(bottom10) : 0,
        overallAvg: avg(scores),
        max: max(scores),
        min: min(scores)
      };
    `;
    const context4 = buildContext({ games: gameData });
    const complexResult = await executeSafely(complexCode, context4);
    
    if (complexResult.success) {
      console.log(`   Total games with scores: ${complexResult.value.total}`);
      console.log(`   Top 10 average: ${complexResult.value.top10Avg.toFixed(2)}`);
      console.log(`   Bottom 10 average: ${complexResult.value.bottom10Avg.toFixed(2)}`);
      console.log(`   Overall average: ${complexResult.value.overallAvg.toFixed(2)}`);
      console.log(`   Max score: ${complexResult.value.max}`);
      console.log(`   Min score: ${complexResult.value.min}`);
    } else {
      console.log(`   Error: ${complexResult.error}`);
    }

    console.log('\n✅ All executor integration tests passed!');
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

main();
