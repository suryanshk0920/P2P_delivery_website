import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { redis, keys } from '../../lib/redis.js'
import { addExpiryJob } from '../../lib/queue.js'
import { AuthRequest } from '../../middleware/auth.js'
import { io } from '../../index.js'

const FEED_TTL = 15 // seconds

// GET /api/requests — cached open requests for hostel
export async function getOpenRequests(req: AuthRequest, res: Response) {
  const { hostelId } = req.user!
  const cacheKey = keys.openRequests(hostelId)

  try {
    const cached = await redis?.get(cacheKey)
    if (cached && typeof cached === 'string') {
      return res.json({ requests: JSON.parse(cached), cached: true })
    }
  } catch (error) {
    console.error('Redis cache error:', error)
  }

  const requests = await prisma.request.findMany({
    where: { hostelId, status: 'OPEN' },
    include: {
      requester: { 
        select: { 
          id: true, 
          name: true, 
          avatarUrl: true, 
          roomNumber: true, 
          hostelBlock: true 
        } 
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  await redis?.setex(cacheKey, FEED_TTL, JSON.stringify(requests))
  return res.json({ requests, cached: false })
}

// GET /api/requests/my-deliveries — runner's active deliveries
export async function getMyDeliveries(req: AuthRequest, res: Response) {
  const { id: runnerId } = req.user!

  const deliveries = await prisma.request.findMany({
    where: {
      runnerId,
      status: { in: ['ACCEPTED', 'PICKED_UP', 'DELIVERED'] }
    },
    include: {
      requester: {
        select: {
          name: true,
          phone: true
        }
      }
    },
    orderBy: { acceptedAt: 'desc' }
  })

  return res.json({ deliveries })
}

// GET /api/requests/my-requests — requester's requests
export async function getMyRequests(req: AuthRequest, res: Response) {
  const { id: requesterId } = req.user!

  const requests = await prisma.request.findMany({
    where: { requesterId },
    include: {
      runner: {
        select: {
          name: true,
          roomNumber: true,
          phone: true
        }
      },
      rating: {
        select: {
          score: true,
          comment: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return res.json({ requests })
}

// POST /api/requests — create new request
const createRequestSchema = z.object({
  type: z.enum(['PARCEL', 'FOOD', 'SHOP_ITEM', 'OTHER']),
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  pickupLocation: z.string(),
  deliveryFee: z.number().min(500).max(10000), // ₹5 to ₹100 in paise
  itemValue: z.number().optional(),
  shopId: z.string().optional(),
})

export async function createRequest(req: AuthRequest, res: Response) {
  const parsed = createRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors })
  }

  const { id: requesterId, hostelId, roomNumber, hostelBlock } = req.user!
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours

  const request = await prisma.request.create({
    data: {
      ...parsed.data,
      requesterId,
      hostelId,
      deliveryRoom: roomNumber!,
      deliveryBlock: hostelBlock!,
      expiresAt,
      status: 'OPEN',
      escrowStatus: 'PENDING',
    },
    include: {
      requester: { 
        select: { 
          id: true, 
          name: true, 
          avatarUrl: true, 
          roomNumber: true, 
          hostelBlock: true 
        } 
      }
    }
  })

  // Bust feed cache
  await redis?.del(keys.openRequests(hostelId))

  // Schedule expiry job
  await addExpiryJob(request.id, expiresAt)

  // Emit to all runners watching this hostel's feed
  io.to(`hostel:${hostelId}`).emit('new_request', request)

  return res.status(201).json({ data: request })
}

// POST /api/requests/:id/accept — runner claims a request
export async function acceptRequest(req: AuthRequest, res: Response) {
  const requestId = req.params.id as string
  const { id: runnerId } = req.user!

  // Check if request exists and get requester info
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { requesterId: true, status: true }
  })

  if (!request) {
    return res.status(404).json({ error: 'Request not found' })
  }

  // Prevent users from accepting their own requests
  if (request.requesterId === runnerId) {
    return res.status(400).json({ error: 'You cannot accept your own request' })
  }

  if (request.status !== 'OPEN') {
    return res.status(400).json({ error: 'Request is no longer available' })
  }

  // Redis lock — only one runner can win
  const lockKey = keys.requestLock(requestId)
  const locked = await redis?.set(lockKey, runnerId, { nx: true, ex: 30 })

  if (!locked) {
    return res.status(409).json({ error: 'Request already accepted by another runner' })
  }

  try {
    const updatedRequest = await prisma.request.update({
      where: { id: requestId, status: 'OPEN' },
      data: {
        runnerId,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: { 
        runner: { 
          select: { 
            id: true, 
            name: true, 
            avatarUrl: true, 
            roomNumber: true 
          } 
        } 
      }
    })

    // Bust cache
    await redis?.del(keys.openRequests(updatedRequest.hostelId))

    // Notify requester privately
    io.to(`user:${updatedRequest.requesterId}`).emit('request_accepted', {
      requestId: updatedRequest.id,
      runner: updatedRequest.runner
    })

    // Update feed for all other runners (request gone from OPEN)
    io.to(`hostel:${updatedRequest.hostelId}`).emit('request_removed', { requestId })

    return res.json({ data: updatedRequest })
  } catch (error) {
    // If DB update fails, release the lock
    await redis?.del(lockKey)
    return res.status(400).json({ error: 'Request no longer available' })
  }
}

// PATCH /api/requests/:id/status — move through lifecycle
export async function updateStatus(req: AuthRequest, res: Response) {
  const requestId = req.params.id as string
  const { status, photoUrl } = req.body
  const { id: userId } = req.user!

  const validTransitions: Record<string, string> = {
    'ACCEPTED': 'PICKED_UP',
    'PICKED_UP': 'DELIVERED',
  }

  const request = await prisma.request.findUnique({ where: { id: requestId } })
  
  if (!request) {
    return res.status(404).json({ error: 'Request not found' })
  }
  
  if (request.runnerId !== userId) {
    return res.status(403).json({ error: 'Not your delivery' })
  }
  
  if (validTransitions[request.status] !== status) {
    return res.status(400).json({ 
      error: `Cannot transition from ${request.status} to ${status}` 
    })
  }

  // Photo is required for PICKED_UP and DELIVERED
  if ((status === 'PICKED_UP' || status === 'DELIVERED') && !photoUrl) {
    return res.status(400).json({ error: 'Photo proof required for this step' })
  }

  const updateData: any = { status }
  if (status === 'PICKED_UP') {
    updateData.pickupPhotoUrl = photoUrl
    updateData.pickedUpAt = new Date()
  }
  if (status === 'DELIVERED') {
    updateData.deliveryPhotoUrl = photoUrl
    updateData.deliveredAt = new Date()
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: updateData
  })

  // Notify requester of each step
  io.to(`user:${request.requesterId}`).emit('request_status_update', {
    requestId,
    status,
    photoUrl
  })

  return res.json({ data: updated })
}

// DELETE /api/requests/:id — delete a request (only if DELIVERED or EXPIRED)
export async function deleteRequest(req: AuthRequest, res: Response) {
  const requestId = req.params.id as string
  const { id: userId } = req.user!

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { requesterId: true, runnerId: true, status: true }
  })

  if (!request) {
    return res.status(404).json({ error: 'Request not found' })
  }

  // Only requester or runner can delete
  if (request.requesterId !== userId && request.runnerId !== userId) {
    return res.status(403).json({ error: 'Not authorized to delete this request' })
  }

  // Only allow deletion of completed or expired requests
  if (!['DELIVERED', 'EXPIRED'].includes(request.status)) {
    return res.status(400).json({ error: 'Can only delete completed or expired requests' })
  }

  await prisma.rating.deleteMany({ where: { requestId } })
  await prisma.request.delete({ where: { id: requestId } })

  return res.json({ success: true })
}

// POST /api/requests/:id/rate — rate a runner after delivery
export async function rateRunner(req: AuthRequest, res: Response) {
  const requestId = req.params.id as string
  const { rating, comment } = req.body
  const { id: userId } = req.user!

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' })
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { requesterId: true, runnerId: true, status: true }
  })

  if (!request) {
    return res.status(404).json({ error: 'Request not found' })
  }

  // Only requester can rate
  if (request.requesterId !== userId) {
    return res.status(403).json({ error: 'Only the requester can rate' })
  }

  // Can only rate delivered requests
  if (request.status !== 'DELIVERED') {
    return res.status(400).json({ error: 'Can only rate delivered requests' })
  }

  if (!request.runnerId) {
    return res.status(400).json({ error: 'No runner to rate' })
  }

  // Check if already rated
  const existingRating = await prisma.rating.findUnique({
    where: { requestId }
  })

  if (existingRating) {
    return res.status(400).json({ error: 'You have already rated this delivery' })
  }

  // Create rating
  const newRating = await prisma.rating.create({
    data: {
      requestId,
      giverId: userId,
      receiverId: request.runnerId,
      score: rating,
      comment: comment || null
    }
  })

  // Update runner's average rating
  const allRatings = await prisma.rating.findMany({
    where: { receiverId: request.runnerId },
    select: { score: true }
  })

  const avgRating = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length

  await prisma.runnerProfile.update({
    where: { userId: request.runnerId },
    data: { rating: avgRating }
  })

  return res.json({ success: true, rating: newRating })
}

// GET /api/runner/stats — get runner statistics
export async function getRunnerStats(req: AuthRequest, res: Response) {
  const { id: userId } = req.user!

  // Get or create runner profile
  let runnerProfile = await prisma.runnerProfile.findUnique({
    where: { userId }
  })

  if (!runnerProfile) {
    runnerProfile = await prisma.runnerProfile.create({
      data: { userId }
    })
  }

  // Get active deliveries count
  const activeDeliveries = await prisma.request.count({
    where: {
      runnerId: userId,
      status: { in: ['ACCEPTED', 'PICKED_UP'] }
    }
  })

  // Get completed deliveries count
  const completedDeliveries = await prisma.request.count({
    where: {
      runnerId: userId,
      status: 'DELIVERED'
    }
  })

  // Calculate total earnings (sum of delivery fees for completed deliveries)
  const earnings = await prisma.request.aggregate({
    where: {
      runnerId: userId,
      status: 'DELIVERED'
    },
    _sum: {
      deliveryFee: true
    }
  })

  const stats = {
    totalDeliveries: runnerProfile.totalDeliveries,
    completedDeliveries,
    activeDeliveries,
    totalEarnings: earnings._sum.deliveryFee || 0,
    rating: runnerProfile.rating,
    tier: runnerProfile.tier
  }

  return res.json({ stats })
}

// POST /api/runner/going-out — announce runner is going to a destination
export async function announceGoingOut(req: AuthRequest, res: Response) {
  const { destination } = req.body
  const { id: userId, hostelId, name, roomNumber } = req.user!

  if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
    return res.status(400).json({ error: 'Destination is required' })
  }

  // Emit to all users in the hostel
  io.to(`hostel:${hostelId}`).emit('runner_going_out', {
    runnerId: userId,
    runnerName: name,
    roomNumber,
    destination: destination.trim(),
    timestamp: new Date()
  })

  return res.json({ 
    success: true, 
    message: `Announced you're going to ${destination}` 
  })
}

// POST /api/runner/stop-going-out — stop the going out announcement
export async function stopGoingOut(req: AuthRequest, res: Response) {
  const { id: userId, hostelId } = req.user!

  // Emit to all users in the hostel to remove this runner
  io.to(`hostel:${hostelId}`).emit('runner_stopped', {
    runnerId: userId
  })

  return res.json({ 
    success: true, 
    message: 'Announcement stopped' 
  })
}

