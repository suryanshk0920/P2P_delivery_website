import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    hostelId: string
    roomNumber: string
    hostelBlock: string
    name: string
  }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.headers['x-user-id'] as string
  const hostelId = req.headers['x-hostel-id'] as string

  if (!userId || !hostelId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = {
    id: userId,
    email: req.headers['x-user-email'] as string || '',
    hostelId,
    roomNumber: req.headers['x-room-number'] as string || '',
    hostelBlock: req.headers['x-hostel-block'] as string || '',
    name: req.headers['x-user-name'] as string || ''
  }

  next()
}
