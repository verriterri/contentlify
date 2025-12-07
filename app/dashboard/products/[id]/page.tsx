'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GeneratedProduct } from '@/types/database';
import { GeneratedProductContent } from '@/lib/ai/product-generator';
import { ProductPreview } from '@/components/product/ProductPreview';
import { ProductEditor } from '@/components/product/ProductEditor';
import { ExportOptions } from '@/components/export/ExportOptions';
import { getTemplate, getDefaultTemplate } from '@/lib/templates';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const isEditMode = searchParams.get('edit') === 'true';

  const [product, setProduct] = useState<GeneratedProduct | null>(null);
  const [productContent, setProductContent] = useState<GeneratedProductContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'analytics'>('preview');

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadUserTier();
    }

    if (isEditMode) {
      setViewMode('edit');
    }
  }, [productId, isEditMode]);

  async function loadUserTier() {
    // Credit-based system, no tier needed
    setUserTier('free');
  }

  async function loadProduct() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('generated_products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        setError('Product not found');
        return;
      }

      setProduct(data);

      // Parse content from JSON string
      try {
        const content = JSON.parse(data.content);
        setProductContent(content);
      } catch (parseError) {
        console.error('Error parsing product content:', parseError);
        setError('Failed to parse product content');
      }
    } catch (err: any) {
      console.error('Error loading product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveEdit = async (editedContent: GeneratedProductContent) => {
    if (!product) return;

    try {
      // Update product in database
      const { error } = await supabase
        .from('generated_products')
        .update({
          title: editedContent.title,
          content: JSON.stringify(editedContent),
        })
        .eq('id', product.id);

      if (error) {
        throw error;
      }

      setProductContent(editedContent);
      setProduct({ ...product, title: editedContent.title });
      setViewMode('preview');
      alert('Product saved successfully!');
    } catch (err: any) {
      console.error('Error saving product:', err);
      alert('Failed to save product');
    }
  };


  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('generated_products')
        .delete()
        .eq('id', productId);

      if (error) {
        throw error;
      }

      router.push('/dashboard/products');
    } catch (err: any) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !product || !productContent) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <p className="text-red-800">{error || 'Product not found'}</p>
            <button
              onClick={() => router.push('/dashboard/products')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  const template = product.template_used
    ? getTemplate(product.product_type, product.template_used) ||
      getDefaultTemplate(product.product_type)
    : getDefaultTemplate(product.product_type);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/dashboard/products')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Library
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
              <span className="capitalize">{product.product_type}</span>
              <span>•</span>
              <span>Created {formatDate(product.created_at)}</span>
              {product.template_used && (
                <>
                  <span>•</span>
                  <span>Template: {product.template_used}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setViewMode('preview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  viewMode === 'preview'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  viewMode === 'edit'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Edit
              </button>
              {(userTier === 'pro' || userTier === 'agency') && (
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    viewMode === 'analytics'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Analytics
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'preview' && productContent && (
          <div className="space-y-6">
            <ProductPreview content={productContent} />

            {/* Export Options */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <ExportOptions
                content={productContent}
                userBranding={{
                  name: 'Your Brand', // Could load from user settings
                  colors: {
                    primary: '#7C3AED',
                    secondary: '#A78BFA',
                  },
                }}
                userId={product.user_id}
              />
            </div>
          </div>
        )}

        {viewMode === 'edit' && productContent && (
          <ProductEditor
            content={productContent}
            onSave={handleSaveEdit}
            onCancel={() => setViewMode('preview')}
          />
        )}

        {viewMode === 'analytics' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics</h2>
            <div className="space-y-6">
              {/* Placeholder analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-900">0</div>
                  <div className="text-sm text-blue-700 mt-1">Times Downloaded</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-900">0</div>
                  <div className="text-sm text-green-700 mt-1">Social Shares</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-900">0</div>
                  <div className="text-sm text-purple-700 mt-1">Affiliate Clicks</div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Analytics tracking is coming soon. This will include download
                  tracking, social share metrics, and affiliate link click tracking.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

