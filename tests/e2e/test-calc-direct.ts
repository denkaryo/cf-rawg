import { handleExecuteCalculation } from '../../src/mcp-server/tools/execute-calculation';

async function main() {
  const result = await handleExecuteCalculation({
    code: 'return avg(data)',
    data: { data: [10, 20, 30, 40, 50] },
  });
  
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);

