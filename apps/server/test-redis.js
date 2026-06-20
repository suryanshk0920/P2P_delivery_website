import Redis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

console.log('Testing Redis connection...');
console.log('URL:', process.env.UPSTASH_REDIS_URL);

const redisUrl = new URL(process.env.UPSTASH_REDIS_URL);

console.log('\nParsed connection details:');
console.log('Host:', redisUrl.hostname);
console.log('Port:', redisUrl.port);
console.log('Username:', redisUrl.username);
console.log('Password:', redisUrl.password ? '***' + redisUrl.password.slice(-4) : 'none');

const redis = new Redis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  password: redisUrl.password,
  username: redisUrl.username || 'default',
  tls: {},
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 10000,
  family: 4 // Force IPv4
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('🔄 Redis connecting...');
});

redis.on('ready', async () => {
  console.log('✅ Redis connected and ready!');
  
  try {
    // Test basic operations
    await redis.set('test:key', 'Hello Redis!');
    const value = await redis.get('test:key');
    console.log('✅ SET/GET test passed:', value);
    
    await redis.del('test:key');
    console.log('✅ DEL test passed');
    
    console.log('\n✅ All tests passed! Redis is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
});

redis.on('close', () => {
  console.warn('⚠️  Redis connection closed');
});

console.log('\nAttempting to connect...');
redis.connect().catch((err) => {
  console.error('❌ Failed to connect:', err.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Connection timeout after 15 seconds');
  process.exit(1);
}, 15000);
