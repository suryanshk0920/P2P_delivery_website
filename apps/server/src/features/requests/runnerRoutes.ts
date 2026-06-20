import { Router } from 'express'
import { getRunnerStats, announceGoingOut, stopGoingOut } from './controller.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

router.get('/stats', authenticate, getRunnerStats)
router.post('/going-out', authenticate, announceGoingOut)
router.post('/stop-going-out', authenticate, stopGoingOut)

export default router
