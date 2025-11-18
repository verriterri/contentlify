import { PricingTable } from '@/components/pricing/PricingTable'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Purchase Credits
        </h1>
        <p className="text-xl text-gray-600">
          1 credit = 1 post analysis. Credits never expire.
        </p>
      </div>
      <PricingTable />
    </div>
  )
}

