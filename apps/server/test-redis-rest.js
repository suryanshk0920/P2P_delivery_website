import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

console.log('Testing Upstash Redis REST API...\n');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function test() {
  try {
    console.log('1. Testing PING...');
    const pong = await redis.ping();
    console.log('✅ PING response:', pong);
    
    console.log('\n2. Testing SET...');
    await redis.set('test:key', 'Hello from REST API!');
    console.log('✅ SET successful');
    
    console.log('\n3. Testing GET...');
    const value = await redis.get('test:key');
    console.log('✅ GET response:', value);
    
    console.log('\n4. Testing DEL...');
    await redis.del('test:key');
    console.log('✅ DEL successful');
    
    console.log('\n5. Testing INCR...');
    await redis.set('test:counter', 0);
    const count = await redis.incr('test:counter');
    console.log('✅ INCR response:', count);
    await redis.del('test:counter');
    
    console.log('\n✅ All tests passed! Redis REST API is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

test();
