import '../env.js'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from './prisma.js'

let escrowQueue: Queue | null = null
let worker: Worker | null = null

// BullMQ with proper TLS configuration
if (process.env.UPSTASH_REDIS_URL) {
  try {
    const redisUrl = new URL(process.env.UPSTASH_REDIS_URL)
    
    const connection = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379'),
      password: redisUrl.password || process.env.UPSTASH_REDIS_TOKEN,
      username: redisUrl.username || 'default',
      tls: {
        servername: redisUrl.hostname  // This is the key fix!
      },
      keepAlive: 30000,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: true,
      connectTimeout: 10000
    }

    escrowQueue = new Queue('escrow', { connection })
    console.log('✅ BullMQ Queue initialized')

    // Worker processes jobs
    worker = new Worker('escrow', async (job) => {
      if (job.name === 'expire-request') {
        const { requestId } = job.data
        const request = await prisma.request.findUnique({ where: { id: requestId } })
        
        if (request?.status === 'OPEN') {
          await prisma.request.update({
            where: { id: requestId },
            data: { status: 'EXPIRED' }
          })
          console.log(`✅ Request ${requestId} expired`)
        }
      }

      if (job.name === 'auto-confirm') {
        const { requestId } = job.data
        const request = await prisma.request.findUnique({ where: { id: requestId } })
        
        if (request?.status === 'DELIVERED' && request.escrowStatus === 'HELD') {
          await prisma.request.update({
            where: { id: requestId },
            data: { escrowStatus: 'RELEASED' }
          })
          console.log(`✅ Payment released for request ${requestId}`)
        }
      }
    }, { connection })

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message)
    })
    
    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`)
    })
    
    worker.on('error', (err) => {
      console.error('Worker error:', err.message)
    })
    
    console.log('✅ BullMQ Worker initialized')
  } catch (error) {
    console.error('Failed to initialize BullMQ:', error)
    escrowQueue = null
    worker = null
  }
} else {
  console.warn('⚠️  Queue disabled (Redis URL not configured)')
}

export async function addExpiryJob(requestId: string, expiresAt: Date) {
  if (!escrowQueue) {
    console.warn('Queue not available, skipping expiry job')
    return
  }
  try {
    const delay = expiresAt.getTime() - Date.now()
    if (delay > 0) {
      await escrowQueue.add('expire-request', { requestId }, { 
        delay, 
        jobId: `expire_${requestId}` 
      })
      console.log(`📝 Expiry job scheduled for request ${requestId}`)
    }
  } catch (error) {
    console.error('Failed to add expiry job:', error)
  }
}

export async function addAutoConfirmJob(requestId: string) {
  if (!escrowQueue) {
    console.warn('Queue not available, skipping auto-confirm job')
    return
  }
  try {
    await escrowQueue.add('auto-confirm', { requestId }, {
      delay: 2 * 60 * 60 * 1000, // 2 hours
      jobId: `autoconfirm_${requestId}`
    })
    console.log(`📝 Auto-confirm job scheduled for request ${requestId}`)
  } catch (error) {
    console.error('Failed to add auto-confirm job:', error)
  }
}

export { escrowQueue, worker }
