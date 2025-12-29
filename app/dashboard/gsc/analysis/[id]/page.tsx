import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

interface AnalysisItem {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issue: string;
  recommendation: string;
  potentialGain?: string;
}

interface AnalysisSection {
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  items: AnalysisItem[];
}

export default async function AnalysisResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch analysis results
  const { data: analysis, error } = await supabase
    .from('gsc_analysis_results')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !analysis) {
    redirect('/dashboard/gsc');
  }

  const results = analysis.analysis_results as {
    lowHangingFruit: AnalysisSection;
    almostThere: AnalysisSection;
    clickDeserts: AnalysisSection;
    lowVolumeWins: AnalysisSection;
    ctrUnderperformers: AnalysisSection;
    topOpportunities: AnalysisItem[];
    summary: {
      totalQueries: number;
      totalPages: number;
      avgCTR: number;
      avgPosition: number;
    };
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SEO Analysis Results
            </h1>
            <p className="text-gray-600">
              {analysis.site_url} • {new Date(analysis.created_at).toLocaleDateString()}
            </p>
          </div>
          <a
            href="/dashboard/gsc"
            className="text-primary hover:text-primary-600 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-primary-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Queries</p>
            <p className="text-2xl font-bold text-gray-900">
              {results.summary.totalQueries}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Pages</p>
            <p className="text-2xl font-bold text-gray-900">
              {results.summary.totalPages}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Avg CTR</p>
            <p className="text-2xl font-bold text-gray-900">
              {(results.summary.avgCTR * 100).toFixed(2)}%
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Avg Position</p>
            <p className="text-2xl font-bold text-gray-900">
              {results.summary.avgPosition.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Top Opportunities */}
      <div className="bg-gradient-to-br from-primary-50 to-purple-50 border-2 border-primary rounded-xl p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🎯 Top 5 Opportunities
        </h2>
        <p className="text-gray-700 mb-4">
          These are your biggest wins - prioritize these for maximum impact
        </p>
        <div className="space-y-4">
          {results.topOpportunities.map((item, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-primary-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-gray-900">{item.query}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.issue}</p>
                  <p className="text-sm text-primary font-medium">{item.recommendation}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200">
                <span>Position: #{Math.round(item.position)}</span>
                <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                <span>Impressions: {item.impressions.toLocaleString()}</span>
                {item.potentialGain && (
                  <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Analysis Sections */}
      {[
        results.lowHangingFruit,
        results.almostThere,
        results.clickDeserts,
        results.ctrUnderperformers,
        results.lowVolumeWins,
      ].map((section, sectionIndex) => (
        section.items.length > 0 && (
          <div key={sectionIndex} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{section.title}</h2>
                <p className="text-gray-600">{section.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getImpactColor(section.impact)}`}>
                {section.impact.toUpperCase()} IMPACT
              </span>
            </div>
            <div className="space-y-3">
              {section.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.query || item.page}</h3>
                    <p className="text-sm text-gray-600">{item.issue}</p>
                  </div>
                  <p className="text-sm text-primary font-medium mb-3">
                    💡 {item.recommendation}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Position: #{Math.round(item.position)}</span>
                    <span>Clicks: {item.clicks}</span>
                    <span>Impressions: {item.impressions.toLocaleString()}</span>
                    <span>CTR: {(item.ctr * 100).toFixed(2)}%</span>
                    {item.potentialGain && (
                      <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {/* CTA for another analysis */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Want another analysis?
        </h3>
        <p className="text-gray-600 mb-4">
          Get a fresh analysis with updated data for $4.99
        </p>
        <a
          href="/pricing"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
        >
          Get Another Analysis
        </a>
      </div>
    </div>
  );
}
