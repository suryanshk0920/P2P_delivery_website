import { Router } from 'express'
import { createRequest, getOpenRequests, getMyDeliveries, getMyRequests, acceptRequest, updateStatus, deleteRequest, getRunnerStats, announceGoingOut, rateRunner } from './controller.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

router.get('/', authenticate, getOpenRequests)
router.get('/my-deliveries', authenticate, getMyDeliveries)
router.get('/my-requests', authenticate, getMyRequests)
router.post('/', authenticate, createRequest)
router.post('/:id/accept', authenticate, acceptRequest)
router.post('/:id/rate', authenticate, rateRunner)
router.patch('/:id/status', authenticate, updateStatus)
router.delete('/:id', authenticate, deleteRequest)

export default router
