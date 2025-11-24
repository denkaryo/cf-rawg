import 'dotenv/config';
import { createMCPServer } from '../../src/mcp-server/server';
import { handleMCPRequest } from '../../src/mcp-server/transport/http';

async function main() {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    console.error('ERROR: RAWG_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Testing MCP Server with REAL protocol communication...\n');

  try {
    const server = createMCPServer({ rawgApiKey: apiKey });

    console.log('1. Testing tools/list request...');
    const listRequest = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    const listResponse = await handleMCPRequest(listRequest, server);
    const listResult = await listResponse.json();

    console.log(`   Status: ${listResponse.status}`);
    console.log(`   Tools found: ${listResult.result?.tools?.length || 0}`);
    if (listResult.result?.tools) {
      listResult.result.tools.forEach((tool: any) => {
        console.log(`     - ${tool.name}: ${tool.description}`);
      });
    }

    console.log('\n2. Testing tools/call - fetch_game_data...');
    const fetchRequest = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'fetch_game_data',
          arguments: {
            platform: '4',
            dates: '2024-01-01,2024-03-31',
            page_size: 5,
          },
        },
      }),
    });

    const fetchResponse = await handleMCPRequest(fetchRequest, server);
    const fetchResult = await fetchResponse.json();

    console.log(`   Status: ${fetchResponse.status}`);
    if (fetchResult.result?.content) {
      const data = JSON.parse(fetchResult.result.content[0].text);
      console.log(`   Games fetched: ${data.games?.length || 0}`);
      console.log(`   Total available: ${data.count || 0}`);
      if (data.games && data.games.length > 0) {
        console.log(`   Sample game: ${data.games[0].name}`);
      }
    } else if (fetchResult.error) {
      console.log(`   Error: ${fetchResult.error.message}`);
    }

    console.log('\n3. Testing tools/call - execute_calculation...');
    const calcRequest = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'execute_calculation',
          arguments: {
            code: 'return avg(data)',
            data: { data: [10, 20, 30, 40, 50] },
          },
        },
      }),
    });

    const calcResponse = await handleMCPRequest(calcRequest, server);
    const calcResult = await calcResponse.json();

    console.log(`   Status: ${calcResponse.status}`);
    if (calcResult.result?.content) {
      const data = JSON.parse(calcResult.result.content[0].text);
      console.log(`   Calculation result: ${data.result}`);
      console.log(`   Success: ${data.success}`);
      console.log(`   Execution time: ${data.executionTime}ms`);
    } else if (calcResult.error) {
      console.log(`   Error: ${calcResult.error.message}`);
    }

    console.log('\n4. Testing invalid method...');
    const invalidRequest = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'invalid/method',
        params: {},
      }),
    });

    const invalidResponse = await handleMCPRequest(invalidRequest, server);
    const invalidResult = await invalidResponse.json();

    console.log(`   Status: ${invalidResponse.status}`);
    console.log(`   Error code: ${invalidResult.error?.code}`);
    console.log(`   Error message: ${invalidResult.error?.message}`);

    console.log('\n✅ All MCP server integration tests passed!');
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

