import Link from 'next/link'
import Image from 'next/image'

/**
 * Simple header component for public pages and post-checkout flows.
 * Does not check authentication state - use for pages where auth isn't relevant yet.
 */
export function SimpleHeader() {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Contentlify"
                width={40}
                height={40}
                className="h-8 w-auto"
                priority
              />
              <span className="text-2xl font-bold text-primary">
                Contentlify
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
