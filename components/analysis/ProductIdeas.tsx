'use client'

import { ProductIdeaCard } from './ProductIdeaCard'

interface ProductIdea {
  name: string
  type: string
  description: string
  valueProposition: string
  suggestedPrice: string
  estimatedTime: string
  targetAudience: string
}

interface ProductIdeasProps {
  ideas: ProductIdea[]
  analysisId: string
}

export function ProductIdeas({ ideas, analysisId }: ProductIdeasProps) {
  if (ideas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">No product ideas generated.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Product Ideas</h2>
        <p className="text-sm text-gray-600 mt-1">
          {ideas.length} idea{ideas.length !== 1 ? 's' : ''} generated
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.map((idea, index) => (
          <ProductIdeaCard key={index} idea={idea} analysisId={analysisId} productIndex={index} />
        ))}
      </div>
    </div>
  )
}

