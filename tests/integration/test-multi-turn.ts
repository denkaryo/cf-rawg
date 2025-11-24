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

  console.log(`Testing Multi-Turn Conversation with Chat History (${provider === 'openai' ? 'OpenAI' : 'Claude'})...\n`);
  console.log('This will test that the agent maintains context across multiple messages.\n');

  const orchestrator = new AgentOrchestrator(rawgApiKey, {
    provider,
    openaiApiKey,
    anthropicApiKey,
  });

  try {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    console.log('Turn 1: User asks about Q1 2024 PC games\n');
    const query1 = "What's the average Metacritic score for PC games released in Q1 2024?";
    messages.push({ role: 'user', content: query1 });
    
    const result1 = await orchestrator.processQueryWithHistory(messages);
    messages.push({ role: 'assistant', content: result1.answer });
    
    console.log('Answer:', result1.answer);
    console.log(`Tool calls: ${result1.toolCalls.length}`);
    if (result1.usage) {
      console.log(`Tokens: ${result1.usage.promptTokens || 'N/A'} prompt + ${result1.usage.completionTokens || 'N/A'} completion\n`);
    }

    console.log('='.repeat(80) + '\n');
    console.log('Waiting 2 seconds to avoid rate limits...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Turn 2: User asks follow-up about Q2 2024 (should reference previous context)\n');
    const query2 = 'What about Q2 2024?';
    messages.push({ role: 'user', content: query2 });
    
    const result2 = await orchestrator.processQueryWithHistory(messages);
    messages.push({ role: 'assistant', content: result2.answer });
    
    console.log('Answer:', result2.answer);
    console.log(`Tool calls: ${result2.toolCalls.length}`);
    if (result2.usage) {
      console.log(`Tokens: ${result2.usage.promptTokens || 'N/A'} prompt + ${result2.usage.completionTokens || 'N/A'} completion\n`);
    }

    console.log('='.repeat(80) + '\n');
    console.log('Waiting 2 seconds to avoid rate limits...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Turn 3: User asks comparison question (should understand both previous answers)\n');
    const query3 = 'Compare those two quarters';
    messages.push({ role: 'user', content: query3 });
    
    const result3 = await orchestrator.processQueryWithHistory(messages);
    
    console.log('Answer:', result3.answer);
    console.log(`Tool calls: ${result3.toolCalls.length}`);
    if (result3.usage) {
      console.log(`Tokens: ${result3.usage.promptTokens || 'N/A'} prompt + ${result3.usage.completionTokens || 'N/A'} completion\n`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('Full Conversation History:');
    messages.forEach((msg, idx) => {
      console.log(`\n${idx + 1}. ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });

    console.log('\n✅ Multi-turn conversation test completed!');
    console.log('\nVerification:');
    console.log('- Turn 2 should reference Q1 2024 from Turn 1');
    console.log('- Turn 3 should compare Q1 and Q2 2024 without needing to re-fetch data');
    console.log('- Agent should maintain context across all turns');
  } catch (error) {
    console.error('\n❌ Multi-turn conversation test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

