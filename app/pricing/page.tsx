import { PricingTable } from '@/components/pricing/PricingTable'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600">
          Start monetizing your content today
        </p>
      </div>
      <PricingTable />
    </div>
  )
}

