'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '../components/ThemeToggle'
import PhotoUploadModal from '../components/PhotoUploadModal'

interface Delivery {
  id: string
  title: string
  description: string
  pickupLocation: string
  deliveryRoom: string
  deliveryBlock: string
  deliveryFee: number
  status: string
  acceptedAt: string
  pickedUpAt?: string
  deliveredAt?: string
  requester: {
    name: string
    phone: string
  }
}

export default function MyDeliveriesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<{ id: string; nextStatus: string } | null>(null)

  useEffect(() => {
    fetchMyDeliveries()
  }, [session])

  async function fetchMyDeliveries() {
    if (!session?.user?.id) return

    try {
      const res = await fetch(`http://localhost:4000/api/requests/my-deliveries`, {
        headers: {
          'x-user-id': session.user.id,
          'x-hostel-id': session.user.hostelId
        }
      })
      const data = await res.json()
      setDeliveries(data.deliveries || [])
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(requestId: string, newStatus: string, photoUrl: string) {
    try {
      const res = await fetch(`http://localhost:4000/api/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || ''
        },
        body: JSON.stringify({
          status: newStatus,
          photoUrl
        })
      })

      if (res.ok) {
        fetchMyDeliveries() // Refresh list
        setPhotoModalOpen(false)
        setSelectedDelivery(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    }
  }

  function openPhotoModal(requestId: string, nextStatus: string) {
    setSelectedDelivery({ id: requestId, nextStatus })
    setPhotoModalOpen(true)
  }

  function handlePhotoUpload(photoUrl: string) {
    if (selectedDelivery) {
      updateStatus(selectedDelivery.id, selectedDelivery.nextStatus, photoUrl)
    }
  }

  async function deleteDelivery(requestId: string) {
    if (!confirm('Are you sure you want to remove this delivery from your list?')) {
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
        setDeliveries(prev => prev.filter(d => d.id !== requestId))
      } else if (res.status === 404) {
        // Request already deleted, just remove from UI
        setDeliveries(prev => prev.filter(d => d.id !== requestId))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete delivery')
      }
    } catch (error) {
      console.error('Failed to delete delivery:', error)
      alert('Failed to delete delivery')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'PICKED_UP': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getNextAction = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return { label: 'Mark as Picked Up', nextStatus: 'PICKED_UP' }
      case 'PICKED_UP': return { label: 'Mark as Delivered', nextStatus: 'DELIVERED' }
      default: return null
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Active Deliveries</h1>
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
        ) : deliveries.length === 0 ? (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">No active deliveries</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Browse Requests
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map(delivery => {
              const nextAction = getNextAction(delivery.status)
              return (
                <div
                  key={delivery.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {delivery.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {delivery.description}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(delivery.status)}`}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Pickup:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {delivery.pickupLocation}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Deliver to:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {delivery.deliveryBlock} - Room {delivery.deliveryRoom}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Requester:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {delivery.requester.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Fee:</span>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        ₹{(delivery.deliveryFee / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {nextAction && (
                    <button
                      onClick={() => openPhotoModal(delivery.id, nextAction.nextStatus)}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {nextAction.label}
                    </button>
                  )}

                  {delivery.status === 'DELIVERED' && (
                    <div className="space-y-3">
                      <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Delivery Complete - Payment will be released
                      </div>
                      <button
                        onClick={() => deleteDelivery(delivery.id)}
                        className="w-full px-6 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                      >
                        Remove from List
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => {
          setPhotoModalOpen(false)
          setSelectedDelivery(null)
        }}
        onUpload={handlePhotoUpload}
        title={selectedDelivery?.nextStatus === 'PICKED_UP' ? 'Pickup Photo' : 'Delivery Photo'}
        description={
          selectedDelivery?.nextStatus === 'PICKED_UP'
            ? 'Take a photo of the item you picked up as proof'
            : 'Take a photo of the delivered item at the destination'
        }
      />
    </div>
  )
}
