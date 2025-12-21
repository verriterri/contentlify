import Image from 'next/image'
import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { redirect?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-4">
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
          <h2 className="text-center text-2xl font-semibold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join thousands of creators monetizing their content
          </p>
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary-600 font-medium"
            >
              ← Back to home
            </Link>
          </div>
        </div>
        <SignupForm redirect={searchParams?.redirect} />
      </div>
    </div>
  )
}

