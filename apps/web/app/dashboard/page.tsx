'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ThemeToggle } from '../components/ThemeToggle'
import RequestFeed from '../components/RequestFeed'
import CreateRequestModal from '../components/CreateRequestModal'
import { getSocket } from '@/lib/socket'

interface ActiveRunner {
  runnerId: string
  runnerName: string
  roomNumber: string
  destination: string
  timestamp: Date
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeRunners, setActiveRunners] = useState<ActiveRunner[]>([])
  const [showAllRunners, setShowAllRunners] = useState(false)
  const [searchDestination, setSearchDestination] = useState('')

  useEffect(() => {
    if (!session?.user) return

    const socket = getSocket()
    
    // Listen for runners going out
    socket.on('runner_going_out', (data: ActiveRunner) => {
      setActiveRunners(prev => {
        // Remove existing entry for this runner if any
        const filtered = prev.filter(r => r.runnerId !== data.runnerId)
        // Add new entry at the beginning, limit to 6 most recent
        return [data, ...filtered].slice(0, 6)
      })

      // Auto-remove after 30 minutes
      setTimeout(() => {
        setActiveRunners(prev => prev.filter(r => r.runnerId !== data.runnerId))
      }, 30 * 60 * 1000)
    })

    // Listen for runners stopping their announcement
    socket.on('runner_stopped', (data: { runnerId: string }) => {
      setActiveRunners(prev => prev.filter(r => r.runnerId !== data.runnerId))
    })

    return () => {
      socket.off('runner_going_out')
      socket.off('runner_stopped')
    }
  }, [session])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">HosRunner</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a
                href="/runner"
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
              >
                Runner Dashboard
              </a>
              <a
                href="/my-requests"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
              >
                My Requests
              </a>
              <a
                href="/my-deliveries"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                My Deliveries
              </a>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Welcome to HosRunner! 🎉</h2>
          <p className="text-blue-100 dark:text-blue-200 text-lg">
            Your account is verified and ready to use. Start requesting or delivering now!
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">0</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Requests</h3>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">0</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</h3>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">₹0</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Earnings</h3>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Request Delivery Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Request a Delivery</h3>
              <p className="text-blue-100 mb-6">
                Need something picked up from the gate or campus shop? Post a request and a runner will deliver it to your room.
              </p>
              <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Request
              </button>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Typical delivery fee: ₹10-20
              </div>
            </div>
          </div>

          {/* Become Runner Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Become a Runner</h3>
              <p className="text-purple-100 mb-6">
                Heading out to the gate or campus? Accept delivery requests on your way and earn money for helping your peers.
              </p>
              <a href="/runner" className="block w-full bg-white text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition text-center">
                Start Running
              </a>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Earn ₹10-20 per delivery
              </div>
            </div>
          </div>
        </div>

        {/* Active Runners */}
        {activeRunners.length > 0 && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  🏃 Active Runners
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({activeRunners.filter(r => 
                      r.destination.toLowerCase().includes(searchDestination.toLowerCase())
                    ).length})
                  </span>
                </h3>
                {activeRunners.length > 3 && (
                  <button
                    onClick={() => setShowAllRunners(!showAllRunners)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    {showAllRunners ? 'Show Less' : `Show All (${activeRunners.length})`}
                  </button>
                )}
              </div>

              {/* Search Filter */}
              {activeRunners.length > 3 && (
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchDestination}
                      onChange={(e) => setSearchDestination(e.target.value)}
                      placeholder="Search by destination..."
                      className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRunners
                  .filter(runner => 
                    runner.destination.toLowerCase().includes(searchDestination.toLowerCase())
                  )
                  .slice(0, showAllRunners ? undefined : 3)
                  .map((runner) => (
                    <div
                      key={runner.runnerId}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-all animate-slide-up"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{runner.runnerName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Room {runner.roomNumber}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium truncate">{runner.destination}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(() => {
                          const now = new Date()
                          const timestamp = new Date(runner.timestamp)
                          const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / 60000)
                          if (diffMinutes < 1) return 'Just now'
                          if (diffMinutes < 60) return `${diffMinutes}m ago`
                          return timestamp.toLocaleTimeString()
                        })()}
                      </p>
                    </div>
                  ))}
              </div>

              {searchDestination && activeRunners.filter(r => 
                r.destination.toLowerCase().includes(searchDestination.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No runners going to "{searchDestination}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Request Feed */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Live Requests</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates</span>
            </div>
          </div>
          <RequestFeed key={refreshKey} />
        </div>

        {/* How it Works */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Post or Accept</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create a delivery request or accept one as a runner</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Track Progress</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time updates as your delivery moves forward</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Complete & Pay</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Confirm delivery and payment is processed securely</p>
            </div>
          </div>
        </div>
      </main>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1) // Trigger feed refresh
        }}
      />
    </div>
  )
}
