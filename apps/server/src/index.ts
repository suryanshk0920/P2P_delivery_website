import './env.js'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

import requestRoutes from './features/requests/routes.js'
import runnerRoutes from './features/requests/runnerRoutes.js'

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: { 
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true 
  }
})

app.use(cors({ 
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true 
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/requests', requestRoutes)
app.use('/api/runner', runnerRoutes)

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join_hostel', ({ hostelId, userId }) => {
    socket.join(`hostel:${hostelId}`)
    socket.join(`user:${userId}`)
    console.log(`User ${userId} joined hostel ${hostelId}`)
  })

  socket.on('runner_going_out', ({ hostelId, destination }) => {
    socket.join(`route:${hostelId}:${destination}`)
    console.log(`Runner going to ${destination} in hostel ${hostelId}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 Socket.io ready for connections`)
})
