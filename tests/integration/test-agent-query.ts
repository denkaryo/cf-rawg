/**
 * Test script to analyze agent behavior with exclusives query
 * This script directly tests the agent without importing executor (to avoid WASM issues)
 */

import 'dotenv/config';

// We'll use fetch to call the running server instead
async function testAgentQuery() {
  const query = 'How do PlayStation exclusive ratings compare to Xbox exclusives?';
  
  console.log('Testing agent query analysis...\n');
  console.log('Query:', query);
  console.log('='.repeat(80));
  
  // Try to connect to local server first
  try {
    const response = await fetch('http://localhost:8787/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('Server error:', error);
      console.log('\n⚠️  Server not running. Please start with: pnpm dev');
      console.log('Then run this script again, or analyze the prompt directly.\n');
      return;
    }

    const data = await response.json();
    
    console.log('\n📊 AGENT RESPONSE:');
    console.log('='.repeat(80));
    console.log(data.content || data.answer);
    console.log('\n');

    console.log('🔧 TOOL CALLS:');
    console.log('='.repeat(80));
    if (data.toolCalls && data.toolCalls.length > 0) {
      data.toolCalls.forEach((call: any, idx: number) => {
        console.log(`\nTool Call #${idx + 1}: ${call.tool}`);
        console.log('Arguments:', JSON.stringify(call.args, null, 2));
        
        if (call.result) {
          let resultData;
          try {
            resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
          } catch {
            resultData = call.result;
          }
          
          if (call.tool === 'fetch_game_data') {
            console.log(`Result: ${resultData.games?.length || 0} games fetched`);
            if (resultData.games && resultData.games.length > 0) {
              console.log('Sample game platforms:', 
                resultData.games[0].platforms?.map((p: any) => p.platform?.name).join(', ') || 'N/A');
              console.log('Sample game:', JSON.stringify({
                name: resultData.games[0].name,
                rating: resultData.games[0].rating,
                platforms: resultData.games[0].platforms?.map((p: any) => p.platform?.name)
              }, null, 2));
            }
          } else if (call.tool === 'execute_calculation') {
            console.log('Calculation result:', JSON.stringify(resultData, null, 2));
          }
        }
      });
    } else {
      console.log('No tool calls made');
    }

    console.log('\n📈 USAGE:');
    console.log('='.repeat(80));
    console.log(`Prompt tokens: ${data.usage?.promptTokens || 'N/A'}`);
    console.log(`Completion tokens: ${data.usage?.completionTokens || 'N/A'}`);
    console.log(`Model: ${data.model || 'N/A'}`);

  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      console.log('⚠️  Could not connect to server. Please start with: pnpm dev');
      console.log('\n📝 Analyzing prompt structure instead...\n');
      analyzePromptStructure();
    } else {
      console.error('Error:', error);
    }
  }
}

function analyzePromptStructure() {
  console.log('='.repeat(80));
  console.log('PROMPT ANALYSIS');
  console.log('='.repeat(80));
  console.log('\nThe agent needs to understand:');
  console.log('1. "PlayStation exclusives" = games available ONLY on PlayStation');
  console.log('2. "Xbox exclusives" = games available ONLY on Xbox');
  console.log('3. It needs to filter fetched games by platform availability');
  console.log('4. It needs to use execute_calculation to filter and compare');
  console.log('\nCurrent prompt likely lacks:');
  console.log('- Guidance on filtering data post-fetch');
  console.log('- Examples of filtering by platform availability');
  console.log('- Understanding of "exclusive" concept');
  console.log('- Instructions to use calculation tool for data filtering');
}

testAgentQuery();

