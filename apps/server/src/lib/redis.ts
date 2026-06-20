import '../env.js'
import { Redis } from '@upstash/redis'

// Use Upstash REST API (works better with firewalls/network restrictions)
let redis: Redis | null = null

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    
    console.log('✅ Redis REST client initialized')
    
    // Test connection
    redis.ping().then(() => {
      console.log('✅ Redis connected and ready')
    }).catch((err) => {
      console.error('❌ Redis ping failed:', err.message)
      redis = null
    })
  } else {
    console.warn('⚠️  UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Running without Redis.')
  }
} catch (error) {
  console.error('Failed to initialize Redis:', error)
  redis = null
}

// For compatibility with ioredis-based code, we'll export null for redisSub
// since REST API doesn't support pub/sub
const redisSub = null

export { redis, redisSub }

// Key factory — central place for all Redis keys
export const keys = {
  openRequests: (hostelId: string) => `hostel:${hostelId}:open_requests`,
  runnerCount: (hostelId: string) => `hostel:${hostelId}:runner_count`,
  requestLock: (requestId: string) => `request:${requestId}:lock`,
  rateLimitPost: (userId: string) => `ratelimit:post:${userId}`,
}
