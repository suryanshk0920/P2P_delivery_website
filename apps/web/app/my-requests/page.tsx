'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '../components/ThemeToggle'
import { getSocket, connectSocket } from '@/lib/socket'
import RatingModal from '../components/RatingModal'

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
  acceptedAt?: string
  pickedUpAt?: string
  deliveredAt?: string
  pickupPhotoUrl?: string
  deliveryPhotoUrl?: string
  runner?: {
    name: string
    roomNumber: string
    phone: string
  }
  rating?: {
    score: number
    comment: string
  }
}

export default function MyRequestsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)

  useEffect(() => {
    if (!session?.user) return

    fetchMyRequests()

    // Connect to Socket.io for live updates
    const socket = connectSocket(session.user.id, session.user.hostelId)

    // Listen for request accepted
    socket.on('request_accepted', (data: { requestId: string; runner: any }) => {
      console.log('Request accepted:', data)
      setRequests(prev =>
        prev.map(req =>
          req.id === data.requestId
            ? { ...req, status: 'ACCEPTED', runner: data.runner }
            : req
        )
      )
    })

    // Listen for status updates
    socket.on('request_status_update', (data: { requestId: string; status: string; photoUrl?: string }) => {
      console.log('Status update:', data)
      setRequests(prev =>
        prev.map(req => {
          if (req.id === data.requestId) {
            const updated = { ...req, status: data.status }
            if (data.status === 'PICKED_UP') {
              updated.pickupPhotoUrl = data.photoUrl
              updated.pickedUpAt = new Date().toISOString()
            }
            if (data.status === 'DELIVERED') {
              updated.deliveryPhotoUrl = data.photoUrl
              updated.deliveredAt = new Date().toISOString()
            }
            return updated
          }
          return req
        })
      )
    })

    return () => {
      socket.off('request_accepted')
      socket.off('request_status_update')
    }
  }, [session])

  async function fetchMyRequests() {
    if (!session?.user?.id) return

    try {
      const res = await fetch(`http://localhost:4000/api/requests/my-requests`, {
        headers: {
          'x-user-id': session.user.id,
          'x-hostel-id': session.user.hostelId
        }
      })
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteRequest(requestId: string) {
    if (!confirm('Are you sure you want to delete this request?')) {
      return
    }

    try {
      const res = await fetch(`http://localhost:4000/api/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || ''
        }
      })

      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId))
      } else if (res.status === 404) {
        // Request already deleted, just remove from UI
        setRequests(prev => prev.filter(r => r.id !== requestId))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete request')
      }
    } catch (error) {
      console.error('Failed to delete request:', error)
      alert('Failed to delete request')
    }
  }

  async function submitRating(rating: number, comment: string) {
    if (!selectedRequest) return

    try {
      const res = await fetch(`http://localhost:4000/api/requests/${selectedRequest.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || ''
        },
        body: JSON.stringify({ rating, comment })
      })

      if (res.ok) {
        // Update the request with rating
        setRequests(prev =>
          prev.map(r =>
            r.id === selectedRequest.id
              ? { ...r, rating: { score: rating, comment } }
              : r
          )
        )
        setRatingModalOpen(false)
        setSelectedRequest(null)
        alert('Thank you for your rating!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Failed to submit rating:', error)
      alert('Failed to submit rating')
    }
  }

  function openRatingModal(request: Request) {
    setSelectedRequest(request)
    setRatingModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'ACCEPTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'PICKED_UP': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'EXPIRED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '🔍'
      case 'ACCEPTED':
        return '✋'
      case 'PICKED_UP':
        return '📦'
      case 'DELIVERED':
        return '✅'
      case 'EXPIRED':
        return '⏰'
      default:
        return '📋'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Requests</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">No requests yet</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Request
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)} {request.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress Timeline */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center opacity-100">
                      <div className="w-8 h-8 mx-auto rounded-full flex items-center justify-center bg-green-500">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">Created</p>
                    </div>
                    <div className={`flex-1 h-1 ${request.status !== 'OPEN' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 text-center ${['ACCEPTED', 'PICKED_UP', 'DELIVERED'].includes(request.status) ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${['ACCEPTED', 'PICKED_UP', 'DELIVERED'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">Accepted</p>
                    </div>
                    <div className={`flex-1 h-1 ${['PICKED_UP', 'DELIVERED'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 text-center ${['PICKED_UP', 'DELIVERED'].includes(request.status) ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${['PICKED_UP', 'DELIVERED'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">Picked Up</p>
                    </div>
                    <div className={`flex-1 h-1 ${request.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 text-center ${request.status === 'DELIVERED' ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${request.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">Delivered</p>
                    </div>
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
                  {request.runner && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Runner:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.runner.name}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Fee:</span>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      ₹{(request.deliveryFee / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Proof Photos */}
                {(request.pickupPhotoUrl || request.deliveryPhotoUrl) && (
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {request.pickupPhotoUrl && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          Pickup Proof
                        </p>
                        <a href={request.pickupPhotoUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={request.pickupPhotoUrl}
                            alt="Pickup proof"
                            className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        </a>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">Click to view full size</p>
                      </div>
                    )}
                    {request.deliveryPhotoUrl && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Delivery Proof
                        </p>
                        <a href={request.deliveryPhotoUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={request.deliveryPhotoUrl}
                            alt="Delivery proof"
                            className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        </a>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">Click to view full size</p>
                      </div>
                    )}
                  </div>
                )}

                {request.status === 'DELIVERED' && (
                  <div className="mt-4 space-y-3">
                    {request.rating ? (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⭐</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            You rated: {request.rating.score}/5
                          </span>
                        </div>
                        {request.rating.comment && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            "{request.rating.comment}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openRatingModal(request)}
                        className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Rate Runner
                      </button>
                    )}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                        ✅ Delivered successfully! Payment has been released to the runner.
                      </p>
                    </div>
                    <button
                      onClick={() => deleteRequest(request.id)}
                      className="w-full px-6 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                    >
                      Remove from List
                    </button>
                  </div>
                )}

                {request.status === 'EXPIRED' && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-400">
                        ⏰ This request expired. No runner accepted it within 3 hours.
                      </p>
                    </div>
                    <button
                      onClick={() => deleteRequest(request.id)}
                      className="w-full px-6 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                    >
                      Remove from List
                    </button>
                  </div>
                )}

                {request.status === 'OPEN' && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      🔍 Waiting for a runner to accept your request...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => {
          setRatingModalOpen(false)
          setSelectedRequest(null)
        }}
        onSubmit={submitRating}
        runnerName={selectedRequest?.runner?.name || 'Runner'}
      />
    </div>
  )
}
