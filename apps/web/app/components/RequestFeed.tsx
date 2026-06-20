'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getSocket, connectSocket } from '@/lib/socket'

interface Request {
  id: string
  title: string
  description: string
  pickupLocation: string
  deliveryRoom: string
  deliveryBlock: string
  deliveryFee: number
  status: string
  createdAt: string
  requester: {
    name: string
    roomNumber: string
    hostelBlock: string
  }
}

export default function RequestFeed() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) return
    
    // Check if user has completed onboarding
    if (!session.user.hostelId) {
      console.log('User has not completed onboarding')
      setLoading(false)
      return
    }

    // Fetch initial requests
    fetchRequests()

    // Connect to Socket.io
    const socket = connectSocket(session.user.id, session.user.hostelId)

    // Listen for new requests
    socket.on('new_request', (request: Request) => {
      console.log('New request received:', request)
      setRequests(prev => [request, ...prev])
    })

    // Listen for request updates
    socket.on('request_updated', (updatedRequest: Request) => {
      console.log('Request updated:', updatedRequest)
      setRequests(prev =>
        prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
      )
    })

    // Listen for request removal (accepted by someone else)
    socket.on('request_removed', (data: { requestId: string } | string) => {
      const requestId = typeof data === 'string' ? data : data.requestId
      console.log('Request removed:', requestId)
      setRequests(prev => prev.filter(req => req.id !== requestId))
    })

    return () => {
      socket.off('new_request')
      socket.off('request_updated')
      socket.off('request_removed')
    }
  }, [session])

  async function fetchRequests() {
    try {
      // Check if user has completed onboarding
      if (!session?.user?.hostelId) {
        console.log('User has not completed onboarding')
        setLoading(false)
        return
      }

      const res = await fetch('http://localhost:4000/api/requests', {
        headers: {
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || ''
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  async function acceptRequest(requestId: string) {
    try {
      const res = await fetch(`http://localhost:4000/api/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || ''
        }
      })
      
      if (res.ok) {
        // Request will be removed via socket event
        console.log('Request accepted!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to accept request')
      }
    } catch (error) {
      console.error('Failed to accept request:', error)
      alert('Failed to accept request')
    }
  }

  // Check if user has completed onboarding
  if (!session?.user?.hostelId) {
    return (
      <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-gray-900 dark:text-white font-medium mb-2">Complete your profile first</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          You need to complete onboarding before you can view or create requests.
        </p>
        <a
          href="/onboarding"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Finish Onboarding
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">No open requests at the moment</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Check back soon or create a new request!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <div
          key={request.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {request.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {request.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ₹{(request.deliveryFee / 100).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">delivery fee</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Pickup:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {request.pickupLocation}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Deliver to:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {request.deliveryBlock} - Room {request.deliveryRoom}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Requested by {request.requester.name} ({request.requester.hostelBlock} - {request.requester.roomNumber})
            </div>
            {request.requester.id !== session?.user?.id && (
              <button
                onClick={() => acceptRequest(request.id)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Accept Request
              </button>
            )}
            {request.requester.id === session?.user?.id && (
              <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                Your request
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
