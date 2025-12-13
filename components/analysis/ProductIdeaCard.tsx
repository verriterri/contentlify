'use client'

import { useRouter } from 'next/navigation'

interface ProductIdea {
  name: string
  type: string
  description: string
  valueProposition: string
  suggestedPrice: string
  estimatedTime: string
  targetAudience: string
}

interface ProductIdeaCardProps {
  idea: ProductIdea
  analysisId?: string
  productIndex?: number
}

export function ProductIdeaCard({ idea, analysisId, productIndex }: ProductIdeaCardProps) {
  const router = useRouter()

  const typeColors: Record<string, string> = {
    checklist: 'bg-blue-100 text-blue-800',
    workbook: 'bg-green-100 text-green-800',
    ebook: 'bg-purple-100 text-purple-800',
    template: 'bg-yellow-100 text-yellow-800',
    newsletter: 'bg-pink-100 text-pink-800',
  }

  const handleGenerateOutline = () => {
    // If we have analysisId and productIndex, go directly to customize step
    if (analysisId !== undefined && productIndex !== undefined) {
      router.push(`/dashboard/generate?analysisId=${analysisId}&productId=${productIndex}`)
    } else {
      // Fallback to old behavior if called from elsewhere
      router.push(`/dashboard/generate?idea=${encodeURIComponent(JSON.stringify(idea))}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            typeColors[idea.type] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {idea.type}
        </span>
        <span className="text-lg font-bold text-gray-900">{idea.suggestedPrice}</span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{idea.name}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{idea.description}</p>

      <div className="space-y-2 mb-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Target Audience: </span>
          <span className="text-gray-600">{idea.targetAudience}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Est. Time: </span>
          <span className="text-gray-600">{idea.estimatedTime}</span>
        </div>
      </div>

      <button
        onClick={handleGenerateOutline}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
      >
        Generate Outline
      </button>
    </div>
  )
}

