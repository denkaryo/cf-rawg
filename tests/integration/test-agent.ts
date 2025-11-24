import 'dotenv/config';
import { AgentOrchestrator } from '../../src/agent/orchestrator';

async function main() {
  const rawgApiKey = process.env.RAWG_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const provider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';

  if (!rawgApiKey) {
    console.error('ERROR: RAWG_API_KEY environment variable is required');
    process.exit(1);
  }

  if (provider === 'openai' && !openaiApiKey) {
    console.error('ERROR: OPENAI_API_KEY environment variable is required');
    console.error('Get your key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }

  if (provider === 'anthropic' && !anthropicApiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
    console.error('Get your key from: https://console.anthropic.com/');
    process.exit(1);
  }

  console.log(`Testing Agent Orchestrator with REAL LLM (${provider === 'openai' ? 'OpenAI' : 'Claude Haiku'})...\n`);
  console.log('This will make actual API calls to the LLM provider and RAWG.\n');

  const orchestrator = new AgentOrchestrator(rawgApiKey, {
    provider,
    openaiApiKey,
    anthropicApiKey,
  });

  try {
    console.log('Query 1: "What\'s the average Metacritic score for PC games released in Q1 2024?"\n');
    const result1 = await orchestrator.processQuery(
      "What's the average Metacritic score for PC games released in Q1 2024?"
    );

    console.log('Answer:', result1.answer);
    console.log('\nTool calls made:');
    result1.toolCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}`);
      console.log(`     Args: ${JSON.stringify(call.args).substring(0, 100)}...`);
      if (call.result) {
        const resultStr = JSON.stringify(call.result).substring(0, 150);
        console.log(`     Result: ${resultStr}...`);
      }
    });
    if (result1.usage) {
      console.log(`\nToken usage: ${result1.usage.promptTokens || 'N/A'} prompt + ${result1.usage.completionTokens || 'N/A'} completion`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('Waiting 2 seconds to avoid rate limits...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Query 2: "Which genre had the most highly-rated games in 2023?"\n');
    const result2 = await orchestrator.processQuery(
      'Which genre had the most highly-rated games in 2023?'
    );

    console.log('Answer:', result2.answer);
    console.log('\nTool calls made:', result2.toolCalls.length);
    result2.toolCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}`);
    });
    if (result2.usage) {
      console.log(`\nToken usage: ${result2.usage.promptTokens || 'N/A'} prompt + ${result2.usage.completionTokens || 'N/A'} completion`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('Waiting 2 seconds to avoid rate limits...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Query 3: "How do PlayStation exclusive ratings compare to Xbox exclusives?"\n');
    const result3 = await orchestrator.processQuery(
      'How do PlayStation exclusive ratings compare to Xbox exclusives?'
    );

    console.log('Answer:', result3.answer);
    console.log('\nTool calls made:', result3.toolCalls.length);
    result3.toolCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}`);
    });
    if (result3.usage) {
      console.log(`\nToken usage: ${result3.usage.promptTokens || 'N/A'} prompt + ${result3.usage.completionTokens || 'N/A'} completion`);
    }

    console.log('\n✅ All agent integration tests completed!');
    console.log('\nNote: Verify the answers are accurate by checking the tool calls and results.');
  } catch (error) {
    console.error('\n❌ Agent integration test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

