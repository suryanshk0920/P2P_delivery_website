'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: false,
      withCredentials: true
    })
  }
  return socket
}

export function connectSocket(userId: string, hostelId: string) {
  const socket = getSocket()
  
  if (!socket.connected) {
    socket.connect()
    
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
      socket.emit('join_hostel', { userId, hostelId })
    })
    
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
    })
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }
  
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
