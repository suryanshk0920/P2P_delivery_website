import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

console.log('Testing ioredis with different TLS configs...\n');

const redisUrl = new URL(process.env.UPSTASH_REDIS_URL);

// Test 1: Minimal TLS config
console.log('Test 1: Minimal TLS config');
const redis1 = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  password: redisUrl.password,
  username: redisUrl.username || 'default',
  tls: {},
  lazyConnect: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: null, // Required by BullMQ
});

redis1.on('error', (err) => console.error('Test 1 error:', err.message));
redis1.on('ready', () => console.log('✅ Test 1 SUCCESS'));

try {
  await redis1.connect();
  await redis1.ping();
  console.log('✅ Test 1: PING successful\n');
  await redis1.quit();
} catch (err) {
  console.error('❌ Test 1 failed:', err.message, '\n');
}

// Test 2: With servername
console.log('Test 2: With servername');
const redis2 = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  password: redisUrl.password,
  username: redisUrl.username || 'default',
  tls: {
    servername: redisUrl.hostname
  },
  lazyConnect: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: null,
});

redis2.on('error', (err) => console.error('Test 2 error:', err.message));
redis2.on('ready', () => console.log('✅ Test 2 SUCCESS'));

try {
  await redis2.connect();
  await redis2.ping();
  console.log('✅ Test 2: PING successful\n');
  await redis2.quit();
} catch (err) {
  console.error('❌ Test 2 failed:', err.message, '\n');
}

// Test 3: With checkServerIdentity
console.log('Test 3: With checkServerIdentity disabled');
const redis3 = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  password: redisUrl.password,
  username: redisUrl.username || 'default',
  tls: {
    checkServerIdentity: () => undefined
  },
  lazyConnect: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: null,
});

redis3.on('error', (err) => console.error('Test 3 error:', err.message));
redis3.on('ready', () => console.log('✅ Test 3 SUCCESS'));

try {
  await redis3.connect();
  await redis3.ping();
  console.log('✅ Test 3: PING successful\n');
  await redis3.quit();
} catch (err) {
  console.error('❌ Test 3 failed:', err.message, '\n');
}

// Test 4: keepAlive enabled
console.log('Test 4: With keepAlive');
const redis4 = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  password: redisUrl.password,
  username: redisUrl.username || 'default',
  tls: {
    servername: redisUrl.hostname
  },
  keepAlive: 30000,
  lazyConnect: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: null,
});

redis4.on('error', (err) => console.error('Test 4 error:', err.message));
redis4.on('ready', () => console.log('✅ Test 4 SUCCESS'));

try {
  await redis4.connect();
  await redis4.ping();
  console.log('✅ Test 4: PING successful');
  
  // Keep connection alive for 5 seconds
  console.log('Keeping connection alive for 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await redis4.ping();
  console.log('✅ Test 4: Still connected after 5 seconds\n');
  await redis4.quit();
} catch (err) {
  console.error('❌ Test 4 failed:', err.message, '\n');
}

console.log('Tests complete!');
process.exit(0);
