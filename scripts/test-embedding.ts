/**
 * Test Embedding Service (Ollama BGE-M3)
 * ทดสอบว่า Local Ollama Embedding API ทำงานได้หรือไม่
 * 
 * Run: npx tsx scripts/test-embedding.ts
 */

import { config } from 'dotenv';

// Load environment variables
config();

const OLLAMA_URL = process.env.OLLAMA_API_URL || 'http://10.4.93.66:9020';
const MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3:latest';

async function testEmbedding() {
  console.log('🧪 Testing Ollama Embedding Service (BGE-M3)\n');
  console.log('=' .repeat(50));
  console.log(`📍 Server: ${OLLAMA_URL}`);
  console.log(`🤖 Model: ${MODEL}`);

  // Check 1: Server connectivity
  console.log('\n📋 Check 1: Server Connectivity');
  try {
    const response = await fetch(`${OLLAMA_URL}/api/ps`);
    if (!response.ok) {
      console.log(`❌ Server returned error: ${response.status}`);
      process.exit(1);
    }
    const data = await response.json();
    console.log(`✅ Server is online!`);
    console.log(`   - Running models: ${data.models?.length || 0}`);
    if (data.models?.length > 0) {
      data.models.forEach((m: { name: string }) => {
        console.log(`     • ${m.name}`);
      });
    }
  } catch (error: any) {
    console.log(`❌ Cannot connect to server: ${error.message}`);
    console.log(`   Make sure Ollama is running at ${OLLAMA_URL}`);
    process.exit(1);
  }

  // Check 2: Test single embedding
  console.log('\n📋 Check 2: Create Single Embedding');
  const testText = 'Software Engineer with 5 years experience in React and Node.js';
  
  try {
    const response = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: testText,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log('❌ API Error:', error?.error || response.statusText);
      process.exit(1);
    }

    const data = await response.json();
    // Ollama returns { embeddings: [[...]] } for single input
    const embedding = data.embeddings?.[0] || data.embedding || [];
    
    console.log(`✅ Embedding created successfully!`);
    console.log(`   - Model: ${data.model || MODEL}`);
    console.log(`   - Dimensions: ${embedding.length}`);
    console.log(`   - First 5 values: [${embedding.slice(0, 5).map((n: number) => n.toFixed(4)).join(', ')}...]`);

    if (embedding.length !== 1024) {
      console.log(`   ⚠️ Warning: Expected 1024 dimensions for BGE-M3, got ${embedding.length}`);
    }

  } catch (error: any) {
    console.log('❌ Request failed:', error.message);
    process.exit(1);
  }

  // Check 3: Test batch embedding (one by one for Ollama)
  console.log('\n📋 Check 3: Create Multiple Embeddings');
  const testTexts = [
    'Senior Frontend Developer with React expertise',
    'Backend Engineer skilled in Python and AWS',
    'Full Stack Developer with TypeScript experience',
  ];

  try {
    const embeddings: number[][] = [];
    for (const text of testTexts) {
      const response = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          input: text,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.log('❌ API Error:', error?.error || response.statusText);
        process.exit(1);
      }

      const data = await response.json();
      embeddings.push(data.embeddings?.[0] || data.embedding || []);
    }
    
    console.log(`✅ Multiple embeddings created!`);
    console.log(`   - Items processed: ${embeddings.length}`);

  } catch (error: any) {
    console.log('❌ Request failed:', error.message);
    process.exit(1);
  }

  // Check 4: Test cosine similarity
  console.log('\n📋 Check 4: Test Similarity Calculation');
  
  try {
    const texts = [
      'React developer with frontend experience',
      'Frontend engineer working with React.js',
      'Database administrator with PostgreSQL skills',
    ];

    const embeddings: number[][] = [];
    for (const text of texts) {
      const response = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          input: text,
        }),
      });

      const data = await response.json();
      embeddings.push(data.embeddings?.[0] || data.embedding || []);
    }

    // Calculate cosine similarity
    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    };

    const sim01 = cosineSimilarity(embeddings[0], embeddings[1]);
    const sim02 = cosineSimilarity(embeddings[0], embeddings[2]);

    console.log(`✅ Similarity calculation works!`);
    console.log(`   - "${texts[0].slice(0, 30)}..." vs`);
    console.log(`     "${texts[1].slice(0, 30)}..." = ${(sim01 * 100).toFixed(1)}%`);
    console.log(`   - "${texts[0].slice(0, 30)}..." vs`);
    console.log(`     "${texts[2].slice(0, 30)}..." = ${(sim02 * 100).toFixed(1)}%`);
    
    if (sim01 > sim02) {
      console.log(`   ✅ Similar texts have higher similarity score (expected behavior)`);
    } else {
      console.log(`   ⚠️ Unexpected: unrelated text has higher similarity`);
    }

  } catch (error: any) {
    console.log('❌ Request failed:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 All embedding tests passed!\n');
  console.log('Your Ollama embedding service (BGE-M3) is ready to use.');
  console.log('\nConfiguration:');
  console.log(`  EMBEDDING_PROVIDER=ollama`);
  console.log(`  OLLAMA_API_URL=${OLLAMA_URL}`);
  console.log(`  OLLAMA_EMBEDDING_MODEL=${MODEL}`);
  console.log('\nNext steps:');
  console.log('  1. Make sure Docker/PostgreSQL is running');
  console.log('  2. Run: npm run db:push (to sync schema with 1024 dimensions)');
  console.log('  3. Start the app: npm run dev');
}

testEmbedding();
