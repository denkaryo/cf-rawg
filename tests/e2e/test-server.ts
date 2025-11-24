import 'dotenv/config';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8787';

console.log('NOTE: Make sure to start the server with: pnpm dev');
console.log('      If wrangler uses a different port, set SERVER_URL environment variable\n');
const RAWG_API_KEY = process.env.RAWG_API_KEY;

async function makeMCPRequest(method: string, params: any, id: number = 1): Promise<any> {
  const response = await fetch(`${SERVER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText}`);
  }

  return response.json();
}

async function waitForServer(maxRetries: number = 30, delay: number = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(SERVER_URL);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
}

async function main() {
  if (!RAWG_API_KEY) {
    console.error('ERROR: RAWG_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('End-to-End Test: Testing MCP Server via HTTP\n');
  console.log(`Server URL: ${SERVER_URL}\n`);

  try {
    console.log('1. Waiting for server to be ready...');
    const serverReady = await waitForServer();
    if (!serverReady) {
      console.error('   ERROR: Server did not become ready in time');
      console.error('   Make sure to run: pnpm dev (in another terminal)');
      process.exit(1);
    }
    console.log('   Server is ready!\n');

    console.log('2. Testing tools/list endpoint...');
    const listResult = await makeMCPRequest('tools/list', {});
    
    if (listResult.error) {
      console.error(`   ERROR: ${listResult.error.message}`);
      process.exit(1);
    }

    console.log(`   Status: Success`);
    console.log(`   Tools found: ${listResult.result?.tools?.length || 0}`);
    if (listResult.result?.tools) {
      listResult.result.tools.forEach((tool: any) => {
        console.log(`     - ${tool.name}: ${tool.description.substring(0, 60)}...`);
      });
    }

    console.log('\n3. Testing tools/call - fetch_game_data...');
    const fetchResult = await makeMCPRequest('tools/call', {
      name: 'fetch_game_data',
      arguments: {
        platform: '4',
        dates: '2024-01-01,2024-03-31',
        page_size: 5,
      },
    }, 2);

    if (fetchResult.error) {
      console.error(`   ERROR: ${fetchResult.error.message}`);
      process.exit(1);
    }

    if (fetchResult.result?.content) {
      const data = JSON.parse(fetchResult.result.content[0].text);
      console.log(`   Status: Success`);
      console.log(`   Games fetched: ${data.games?.length || 0}`);
      console.log(`   Total available: ${data.count || 0}`);
      if (data.games && data.games.length > 0) {
        console.log(`   Sample game: ${data.games[0].name}`);
        console.log(`   Sample Metacritic: ${data.games[0].metacritic || 'N/A'}`);
      }
    } else {
      console.error('   ERROR: No content in response');
      process.exit(1);
    }

    console.log('\n4. Testing tools/call - execute_calculation...');
    const calcResult = await makeMCPRequest('tools/call', {
      name: 'execute_calculation',
      arguments: {
        code: 'return avg(data)',
        data: { data: [10, 20, 30, 40, 50] },
      },
    }, 3);

    if (calcResult.error) {
      console.error(`   ERROR: ${calcResult.error.message}`);
      process.exit(1);
    }

    if (calcResult.result?.content) {
      const data = JSON.parse(calcResult.result.content[0].text);
      console.log(`   Status: Success`);
      console.log(`   Calculation result: ${data.result}`);
      console.log(`   Success: ${data.success}`);
      console.log(`   Execution time: ${data.executionTime}ms`);
      
      if (data.result !== 30) {
        console.error(`   ERROR: Expected result 30, got ${data.result}`);
        process.exit(1);
      }
    } else {
      console.error('   ERROR: No content in response');
      process.exit(1);
    }

    console.log('\n5. Testing error handling - invalid method...');
    const errorResult = await makeMCPRequest('invalid/method', {}, 4);
    
    if (errorResult.error) {
      console.log(`   Status: Error handled correctly`);
      console.log(`   Error code: ${errorResult.error.code}`);
      console.log(`   Error message: ${errorResult.error.message}`);
    } else {
      console.error('   ERROR: Expected error but got success');
      process.exit(1);
    }

    console.log('\n6. Testing end-to-end flow: fetch data + calculate...');
    const flowFetchResult = await makeMCPRequest('tools/call', {
      name: 'fetch_game_data',
      arguments: {
        platform: '4',
        dates: '2024-01-01,2024-03-31',
        metacritic: '70,100',
        page_size: 10,
      },
    }, 5);

    if (flowFetchResult.error) {
      console.error(`   ERROR fetching data: ${flowFetchResult.error.message}`);
      process.exit(1);
    }

    const flowData = JSON.parse(flowFetchResult.result.content[0].text);
    const gamesWithScore = flowData.games?.filter((g: any) => g.metacritic !== null && g.metacritic !== undefined) || [];
    
    if (gamesWithScore.length > 0) {
      const calcFlowResult = await makeMCPRequest('tools/call', {
        name: 'execute_calculation',
        arguments: {
          code: `
            const scores = games.filter(g => g.metacritic !== null).map(g => g.metacritic);
            return {
              average: avg(scores),
              count: scores.length,
              min: min(scores),
              max: max(scores)
            };
          `,
          data: { games: gamesWithScore },
        },
      }, 6);

      if (calcFlowResult.error) {
        console.error(`   ERROR calculating: ${calcFlowResult.error.message}`);
        process.exit(1);
      }

      const calcData = JSON.parse(calcFlowResult.result.content[0].text);
      console.log(`   Status: Success`);
      console.log(`   Games processed: ${calcData.result.count}`);
      console.log(`   Average Metacritic: ${calcData.result.average.toFixed(2)}`);
      console.log(`   Min score: ${calcData.result.min}`);
      console.log(`   Max score: ${calcData.result.max}`);
    } else {
      console.log('   No games with Metacritic scores found (using fallback data)');
    }

    console.log('\n✅ All end-to-end tests passed!');
    console.log('\nThe server is working correctly via HTTP.');
  } catch (error) {
    console.error('\n❌ End-to-end test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

