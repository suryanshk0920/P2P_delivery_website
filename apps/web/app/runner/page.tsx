'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '../components/ThemeToggle'
import { getSocket } from '@/lib/socket'

interface RunnerStats {
  totalDeliveries: number
  completedDeliveries: number
  activeDeliveries: number
  totalEarnings: number
  rating: number
  tier: string
}

interface Notification {
  id: string
  message: string
  timestamp: Date
}

export default function RunnerPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<RunnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [goingOut, setGoingOut] = useState(false)
  const [destination, setDestination] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    fetchRunnerStats()
  }, [session])

  useEffect(() => {
    if (!session?.user) return

    const socket = getSocket()
    
    socket.emit('join_hostel', {
      hostelId: session.user.hostelId,
      userId: session.user.id
    })

    // Listen for new requests
    socket.on('new_request', (request: any) => {
      const notification: Notification = {
        id: request.id,
        message: `New ${request.type} request: ${request.title}`,
        timestamp: new Date()
      }
      setNotifications(prev => [notification, ...prev.slice(0, 4)])
      setShowNotifications(true)
      
      // Auto-hide after 5 seconds
      setTimeout(() => setShowNotifications(false), 5000)
    })

    return () => {
      socket.off('new_request')
    }
  }, [session])

  async function fetchRunnerStats() {
    if (!session?.user?.id) return

    try {
      const res = await fetch(`http://localhost:4000/api/runner/stats`, {
        headers: {
          'x-user-id': session.user.id,
          'x-hostel-id': session.user.hostelId
        }
      })
      const data = await res.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch runner stats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function announceGoingOut() {
    if (!destination.trim()) {
      alert('Please enter a destination')
      return
    }

    try {
      const res = await fetch(`http://localhost:4000/api/runner/going-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || '',
          'x-user-name': session?.user?.name || ''
        },
        body: JSON.stringify({ destination })
      })

      if (res.ok) {
        setGoingOut(true)
      }
    } catch (error) {
      console.error('Failed to announce:', error)
    }
  }

  async function stopAnnouncement() {
    try {
      const res = await fetch(`http://localhost:4000/api/runner/stop-going-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-hostel-id': session?.user?.hostelId || ''
        }
      })

      if (res.ok) {
        setGoingOut(false)
        setDestination('')
      }
    } catch (error) {
      console.error('Failed to stop announcement:', error)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PROBATIONARY': return 'text-gray-600 dark:text-gray-400'
      case 'TRUSTED': return 'text-blue-600 dark:text-blue-400'
      case 'VERIFIED': return 'text-green-600 dark:text-green-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PROBATIONARY': return '🆕'
      case 'TRUSTED': return '⭐'
      case 'VERIFIED': return '✅'
      default: return '📦'
    }
  }

  const getTierRequirement = (tier: string) => {
    switch (tier) {
      case 'PROBATIONARY': return { next: 'TRUSTED', deliveries: 10, rating: 4.3 }
      case 'TRUSTED': return { next: 'VERIFIED', deliveries: 50, rating: 4.7 }
      case 'VERIFIED': return { next: 'MAX', deliveries: 0, rating: 0 }
      default: return { next: 'TRUSTED', deliveries: 10, rating: 4.3 }
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
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Runner Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Notifications Dropdown */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed top-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">New Requests</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => router.push('/dashboard')}
              >
                <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Runner Profile Card */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{session?.user?.name}</h2>
                  <p className="text-blue-100 dark:text-blue-200">
                    {session?.user?.hostelBlock} - Room {session?.user?.roomNumber}
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-5xl mb-2">{getTierBadge(stats?.tier || 'PROBATIONARY')}</div>
                  <div className={`text-sm font-medium ${getTierColor(stats?.tier || 'PROBATIONARY')} bg-white dark:bg-gray-800 px-3 py-1 rounded-full`}>
                    {stats?.tier || 'PROBATIONARY'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats?.completedDeliveries || 0}</div>
                  <div className="text-sm text-blue-100 dark:text-blue-200">Completed</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats?.activeDeliveries || 0}</div>
                  <div className="text-sm text-blue-100 dark:text-blue-200">Active</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">₹{((stats?.totalEarnings || 0) / 100).toFixed(0)}</div>
                  <div className="text-sm text-blue-100 dark:text-blue-200">Earnings</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats?.rating?.toFixed(1) || '5.0'}</div>
                  <div className="text-sm text-blue-100 dark:text-blue-200">Rating ⭐</div>
                </div>
              </div>
            </div>

            {/* Going Out Feature */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  📍 Announce You're Going Out
                </h3>
                {goingOut && (
                  <span className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-glow"></span>
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Let requesters know you're heading to the gate or a shop. They can post requests matching your route!
              </p>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Main Gate, Campus Shop, Canteen"
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={goingOut}
                />
                <button
                  onClick={goingOut ? stopAnnouncement : announceGoingOut}
                  className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    goingOut 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                  }`}
                >
                  {goingOut ? 'Stop' : 'Announce'}
                </button>
              </div>

              {goingOut && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 animate-slide-up">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        You're now visible to requesters!
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                        Going to: {destination}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => router.push('/my-deliveries')}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {stats?.activeDeliveries || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  My Active Deliveries
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View and update your ongoing deliveries
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View deliveries
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Browse Requests
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Find new delivery requests to accept
                </p>
                <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Browse now
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Tier Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                🏆 Tier Progress
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Tier:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getTierBadge(stats?.tier || 'PROBATIONARY')} {stats?.tier || 'PROBATIONARY'}
                  </span>
                </div>
                
                {stats?.tier !== 'VERIFIED' && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Next Tier:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getTierBadge(getTierRequirement(stats?.tier || 'PROBATIONARY').next)} {getTierRequirement(stats?.tier || 'PROBATIONARY').next}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Deliveries:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats?.completedDeliveries || 0} / {getTierRequirement(stats?.tier || 'PROBATIONARY').deliveries}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, ((stats?.completedDeliveries || 0) / getTierRequirement(stats?.tier || 'PROBATIONARY').deliveries) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Rating Required:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats?.rating?.toFixed(1) || '5.0'} / {getTierRequirement(stats?.tier || 'PROBATIONARY').rating}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, ((stats?.rating || 5.0) / getTierRequirement(stats?.tier || 'PROBATIONARY').rating) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}

                {stats?.tier === 'VERIFIED' ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-400 text-center">
                      🎉 Congratulations! You've reached the highest tier!
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Complete more deliveries and maintain a high rating to unlock the next tier!
                  </p>
                )}
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                💰 Earnings Breakdown
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹{((stats?.totalEarnings || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Delivery</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₹{stats?.completedDeliveries ? ((stats.totalEarnings / stats.completedDeliveries) / 100).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">This Week</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-300">₹0.00</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">This Month</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-300">
                      ₹{((stats?.totalEarnings || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
