'use client'

import { useState } from 'react'

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
}

export function ProductIdeaCard({ idea }: ProductIdeaCardProps) {
  const [showModal, setShowModal] = useState(false)

  const typeColors: Record<string, string> = {
    checklist: 'bg-blue-100 text-blue-800',
    workbook: 'bg-green-100 text-green-800',
    ebook: 'bg-purple-100 text-purple-800',
    template: 'bg-yellow-100 text-yellow-800',
    newsletter: 'bg-pink-100 text-pink-800',
  }

  return (
    <>
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
          onClick={() => setShowModal(true)}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
        >
          Generate Outline
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Generate Product Outline</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Select a template and generate an outline for: <strong>{idea.name}</strong>
              </p>
              {/* Template selection and generation would go here */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Navigate to generate page
                    window.location.href = `/dashboard/generate?idea=${encodeURIComponent(JSON.stringify(idea))}`
                  }}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 font-medium"
                >
                  Continue to Generator
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

