import 'dotenv/config';
import { AgentOrchestrator } from '../../src/agent/orchestrator';

async function main() {
  const rawgApiKey = process.env.RAWG_API_KEY;
  if (!rawgApiKey) {
    console.error('ERROR: RAWG_API_KEY environment variable is required');
    process.exit(1);
  }

  const provider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (provider === 'openai' && !openaiApiKey) {
    console.error('ERROR: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  if (provider === 'anthropic' && !anthropicApiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Testing agent with exclusives query...\n');
  console.log('Query: "How do PlayStation exclusive ratings compare to Xbox exclusives?"\n');
  console.log('='.repeat(80));

  const orchestrator = new AgentOrchestrator(rawgApiKey, {
    provider,
    openaiApiKey,
    anthropicApiKey,
    modelName: provider === 'openai' ? process.env.OPENAI_MODEL : process.env.CLAUDE_MODEL,
  });

  try {
    const query = 'How do PlayStation exclusive ratings compare to Xbox exclusives?';
    const result = await orchestrator.processQuery(query);

    console.log('\n📊 AGENT RESPONSE:');
    console.log('='.repeat(80));
    console.log(result.answer);
    console.log('\n');

    console.log('🔧 TOOL CALLS:');
    console.log('='.repeat(80));
    result.toolCalls.forEach((call, idx) => {
      console.log(`\nTool Call #${idx + 1}: ${call.tool}`);
      console.log('Arguments:', JSON.stringify(call.args, null, 2));
      
      if (call.result) {
        if (call.tool === 'fetch_game_data') {
          const resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
          console.log(`Result: ${resultData.games?.length || 0} games fetched`);
          if (resultData.games && resultData.games.length > 0) {
            console.log('Sample game:', JSON.stringify(resultData.games[0], null, 2));
          }
          if (resultData.summary) {
            console.log('Summary:', JSON.stringify(resultData.summary, null, 2));
          }
        } else if (call.tool === 'execute_calculation') {
          const resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
          console.log('Calculation result:', JSON.stringify(resultData, null, 2));
        } else {
          console.log('Result:', JSON.stringify(call.result, null, 2).substring(0, 500));
        }
      }
    });

    console.log('\n📈 USAGE:');
    console.log('='.repeat(80));
    console.log(`Prompt tokens: ${result.usage?.promptTokens || 'N/A'}`);
    console.log(`Completion tokens: ${result.usage?.completionTokens || 'N/A'}`);
    console.log(`Model: ${result.model || 'N/A'}`);

    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

