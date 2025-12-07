'use client';

import { useState } from 'react';
import { GeneratedProductContent } from '@/lib/ai/product-generator';
import {
  exportToDocx,
  exportToMarkdown,
  downloadFile,
  copyMarkdownToClipboard,
  estimateFileSize,
  formatFileSize,
} from '@/lib/generators/export-formats';

interface UserBranding {
  name: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

interface ExportOptionsProps {
  content: GeneratedProductContent;
  userBranding?: UserBranding;
  subscriptionTier?: 'free' | 'starter' | 'pro' | 'agency';
  userId?: string;
}

export function ExportOptions({
  content,
  userBranding,
  subscriptionTier = 'free',
  userId,
}: ExportOptionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = async (format: 'docx' | 'markdown') => {
    setLoading(format);
    try {
      let result;

      switch (format) {
        case 'docx':
          result = await exportToDocx({
            content,
            userBranding,
            subscriptionTier,
            userId,
          });
          downloadFile(result.blob, result.fileName);
          break;

        case 'markdown':
          result = exportToMarkdown({
            content,
            userBranding,
            subscriptionTier,
            userId,
          });
          downloadFile(result.blob, result.fileName);
          break;
      }

      setLoading(null);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Failed to export to ${format}. Please try again.`);
      setLoading(null);
    }
  };

  const handleCopyMarkdown = async () => {
    const result = exportToMarkdown({
      content,
      userBranding,
      subscriptionTier,
      userId,
    });

    const markdownText = await result.blob.text();
    const success = await copyMarkdownToClipboard(markdownText);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('Failed to copy to clipboard. Please try downloading instead.');
    }
  };

  const estimatedSizes = {
    docx: estimateFileSize(content, 'docx'),
    markdown: estimateFileSize(content, 'markdown'),
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DOCX Export */}
        <button
          onClick={() => handleExport('docx')}
          disabled={loading !== null}
          className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">DOCX</div>
              <div className="text-sm text-gray-500">
                {formatFileSize(estimatedSizes.docx)} • Editable in Word or Google Docs
              </div>
            </div>
          </div>
          {loading === 'docx' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
          ) : (
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
        </button>

        {/* Markdown Export */}
        <button
          onClick={() => handleExport('markdown')}
          disabled={loading !== null}
          className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">Markdown</div>
              <div className="text-sm text-gray-500">
                {formatFileSize(estimatedSizes.markdown)} • Plain text format
              </div>
            </div>
          </div>
          {loading === 'markdown' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
          ) : (
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Copy Markdown to Clipboard */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleCopyMarkdown}
          disabled={loading !== null}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Copied to clipboard!</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy Markdown to Clipboard</span>
            </>
          )}
        </button>
      </div>

      {/* Google Docs Instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Using with Google Docs:</strong> After downloading the DOCX file, you can upload it to{' '}
          <a
            href="https://docs.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-900"
          >
            Google Docs
          </a>{' '}
          for online editing and collaboration. Google Docs will automatically convert the DOCX file.
        </p>
      </div>
    </div>
  );
}

