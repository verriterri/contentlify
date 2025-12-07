'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Analysis {
  id: string
  url: string
  title: string | null
  status: string
  created_at: string
  credits_used: number
}

interface Scan {
  id: string
  site_url: string
  total_pages: number
  scanned_pages: number
  created_at: string
  scan_data: {
    method?: string
  }
}

interface RecentActivityProps {
  analyses: Analysis[]
  scans: Scan[]
}

export function RecentActivity({ analyses, scans }: RecentActivityProps) {
  const [activeTab, setActiveTab] = useState<'analyses' | 'scans'>('analyses')

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === 'analyses' ? 'Recent Analyses' : 'Recent Scans'}
          </h2>
          {/* Pill Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('analyses')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'analyses'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analyses
            </button>
            <button
              onClick={() => setActiveTab('scans')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'scans'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Scans
            </button>
          </div>
        </div>
      </div>

      {/* Analyses Tab */}
      {activeTab === 'analyses' && (
        <>
          {analyses && analyses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 break-words max-w-md">
                          {analysis.title || analysis.url}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {analysis.url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                          analysis.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {analysis.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {analysis.credits_used || 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/analyze?analysisId=${analysis.id}`}
                          className="text-primary hover:text-primary-600"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No analyses yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by analyzing your first page.</p>
              <div className="mt-6">
                <Link
                  href="/dashboard/analyze"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600"
                >
                  Analyze New Site
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Scans Tab */}
      {activeTab === 'scans' && (
        <>
          {scans && scans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scans.map((scan) => (
                    <tr key={scan.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 break-words max-w-md">
                          {scan.site_url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {scan.scanned_pages} / {scan.total_pages}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {scan.scan_data?.method || 'crawl'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/analyze?scanId=${scan.id}`}
                          className="text-primary hover:text-primary-600"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scans yet</h3>
              <p className="mt-1 text-sm text-gray-500">Scan your site to discover all your pages.</p>
              <div className="mt-6">
                <Link
                  href="/dashboard/analyze"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600"
                >
                  Scan Your Site
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

