'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ExportOptions } from '@/components/export/ExportOptions';
import { ProductIdea } from '@/lib/ai/product-ideas-generator';
import { GeneratedProductContent } from '@/lib/ai/product-generator';

interface Analysis {
  id: string;
  url: string;
  title: string;
  product_ideas: ProductIdea[];
  affiliate_opportunities: any[];
}

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get('analysisId');
  const productIdParam = searchParams.get('productId');

  const [step, setStep] = useState<'select' | 'customize' | 'generating' | 'preview' | 'edit'>('select');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [selectedProductIdea, setSelectedProductIdea] = useState<ProductIdea | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [includeAffiliateLinks, setIncludeAffiliateLinks] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#A78BFA');
  const [generatedContent, setGeneratedContent] = useState<GeneratedProductContent | null>(null);
  const [generatedProductId, setGeneratedProductId] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  // Load analyses with product ideas
  useEffect(() => {
    async function loadAnalyses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('content_analyses')
        .select('id, url, title, product_ideas, affiliate_opportunities, created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading analyses:', error);
      } else if (data) {
        setAnalyses(data as Analysis[]);

        // If analysisId is in URL, select it
        if (analysisIdParam) {
          const analysis = data.find((a) => a.id === analysisIdParam);
          if (analysis) {
            setSelectedAnalysis(analysis);
            // If productId is also in URL, select that product idea
            if (productIdParam && analysis.product_ideas) {
              const product = (analysis.product_ideas as ProductIdea[]).find(
                (p, idx) => idx.toString() === productIdParam
              );
              if (product) {
                setSelectedProductIdea(product);
                setProductTitle(product.name);
                setStep('customize');
              }
            }
          }
        }
      }
      setLoadingAnalyses(false);
    }

    loadAnalyses();
  }, [analysisIdParam, productIdParam, router]);

  // Load user branding
  useEffect(() => {
    async function loadBranding() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For now, use email as brand name
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          const name = authUser.email.split('@')[0];
          setBrandName(name.charAt(0).toUpperCase() + name.slice(1));
        }
      }
    }
    loadBranding();
  }, []);

  const handleGenerate = async () => {
    if (!selectedAnalysis || !selectedProductIdea) {
      setError('Please select an analysis and product idea');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('generating');
    setProgressMessage('Analyzing your content...');

    try {
      // Simulate progress updates
      const progressSteps = [
        { delay: 1000, message: 'Analyzing your content...' },
        { delay: 3000, message: 'Creating outline structure...' },
        { delay: 5000, message: 'Organizing key points...' },
        { delay: 7000, message: 'Finalizing outline...' },
        { delay: 9000, message: 'Almost ready...' },
      ];

      for (const step of progressSteps) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
        setProgressMessage(step.message);
      }

      // Call API
      const response = await fetch('/api/generate-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIdea: selectedProductIdea,
          analysisId: selectedAnalysis.id,
          productTitle: productTitle || undefined,
          includeAffiliateLinks,
          userBranding: {
            name: brandName,
            colors: {
              primary: primaryColor,
              secondary: secondaryColor,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate outline');
      }

      setGeneratedContent(data.outline || data.product); // Support both for compatibility
      setGeneratedProductId(data.productId);
      setStep('preview');
      setLoading(false);
    } catch (err: any) {
      console.error('Error generating outline:', err);
      setError(err.message || 'Failed to generate outline');
      setStep('customize');
      setLoading(false);
    }
  };


  if (loadingAnalyses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate Outline</h1>
          <p className="mt-2 text-gray-600">
            Create a downloadable outline to guide your digital product development
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Select Product Idea */}
        {step === 'select' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Product Idea</h2>

            {analyses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No analyses found.</p>
                <button
                  onClick={() => router.push('/dashboard/analyze')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Analyze Content First
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{analysis.title || analysis.url}</h3>
                        <p className="text-sm text-gray-500 mt-1">{analysis.url}</p>
                      </div>
                    </div>

                    {analysis.product_ideas && (analysis.product_ideas as ProductIdea[]).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(analysis.product_ideas as ProductIdea[]).map((idea, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedAnalysis(analysis);
                              setSelectedProductIdea(idea);
                              setProductTitle(idea.name);
                              setStep('customize');
                            }}
                            className="text-left p-3 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-purple-600 uppercase">
                                {idea.type}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{idea.name}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{idea.description}</p>
                            <p className="text-xs text-purple-600 mt-2 font-medium">
                              {idea.suggestedPrice}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No product ideas available</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Customize Options */}
        {step === 'customize' && selectedProductIdea && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Customize Your Product</h2>

              {/* Product Info Summary */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="text-sm font-medium text-purple-900 mb-2">Selected Product Idea</h3>
                <p className="text-lg font-semibold text-gray-900">{selectedProductIdea.name}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedProductIdea.description}</p>
              </div>

              {/* Product Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outline Title
                </label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Enter product title"
                />
              </div>

              {/* Branding Options */}
              <div className="mb-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Branding (Optional)</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Your brand name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Affiliate Links Toggle */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeAffiliateLinks}
                    onChange={(e) => setIncludeAffiliateLinks(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Note affiliate opportunities in outline
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Include notes on where affiliate links could be placed in the final product
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
                  </svg>
                  <span>Generate Outline</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 'generating' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating Your Outline</h2>
            <p className="text-gray-600">{progressMessage}</p>
            <div className="mt-8 max-w-md mx-auto">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: '75%' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Download */}
        {step === 'preview' && generatedContent && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Outline is Ready!</h2>
              <p className="text-gray-600 mb-6">
                Download your outline below. Use it as a guide to develop your digital product.
              </p>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Outline Structure</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">{generatedContent.title}</h4>
                  </div>
                  {generatedContent.sections.map((section, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border-l-4 border-purple-500">
                      <h4 className="font-medium text-gray-900 mb-1">{section.title}</h4>
                      {section.content && (
                        <p className="text-sm text-gray-600 mb-2">{section.content}</p>
                      )}
                      {section.items && section.items.length > 0 && (
                        <ul className="text-sm text-gray-700 space-y-1 ml-4">
                          {section.items.slice(0, 5).map((item, itemIdx) => (
                            <li key={itemIdx} className="list-disc">{item}</li>
                          ))}
                          {section.items.length > 5 && (
                            <li className="text-gray-500 italic">
                              ... and {section.items.length - 5} more items
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <ExportOptions
                content={generatedContent}
                userBranding={{
                  name: brandName,
                  colors: {
                    primary: primaryColor,
                    secondary: secondaryColor,
                  },
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => {
                  setStep('select');
                  setGeneratedContent(null);
                  setSelectedProductIdea(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Generate Another Outline
              </button>
              <button
                onClick={() => router.push('/dashboard/products')}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                View Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

