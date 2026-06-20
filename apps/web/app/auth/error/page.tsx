'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, { title: string; message: string }> = {
    DomainNotAllowed: {
      title: 'Email Not Allowed',
      message: 'Only @paruluniversity.ac.in email addresses are allowed to sign in. Please use your university email.'
    },
    Configuration: {
      title: 'Configuration Error',
      message: 'There is a problem with the server configuration. Please contact support.'
    },
    AccessDenied: {
      title: 'Access Denied',
      message: 'You do not have permission to sign in. Please contact your administrator.'
    },
    Verification: {
      title: 'Verification Failed',
      message: 'The verification token has expired or has already been used.'
    },
  }

  const errorInfo = errorMessages[error || ''] || {
    title: 'Authentication Error',
    message: 'An unknown error occurred during sign in. Please try again.'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Error Content */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{errorInfo.title}</h1>
          <p className="text-gray-600 mb-8">{errorInfo.message}</p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link 
              href="/auth/login"
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Try Again
            </Link>
            
            {error === 'DomainNotAllowed' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <p className="text-sm text-gray-700 mb-2 font-semibold">Need help?</p>
                <p className="text-sm text-gray-600">
                  Make sure you're using your Parul University email address (enrollment@paruluniversity.ac.in)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Still having issues? Contact your hostel admin
        </p>
      </div>
    </div>
  )
}
