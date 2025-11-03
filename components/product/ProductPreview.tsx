'use client';

import { useState } from 'react';
import { GeneratedProductContent, ProductSection } from '@/lib/ai/product-generator';

interface ProductPreviewProps {
  content: GeneratedProductContent;
  onEdit?: () => void;
}

export function ProductPreview({ content, onEdit }: ProductPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination - show 5 sections per page
  const sectionsPerPage = 5;
  const totalPages = Math.ceil(content.sections.length / sectionsPerPage);
  const startIndex = (currentPage - 1) * sectionsPerPage;
  const endIndex = startIndex + sectionsPerPage;
  const visibleSections = content.sections.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {content.sections.length} sections • {content.affiliateLinks.length} affiliate links
          </p>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            Edit Content
          </button>
        )}
      </div>

      {/* Content Preview */}
      <div className="p-6 space-y-8">
        {visibleSections.map((section, index) => {
          // Calculate proper chapter number (count only chapters before this one)
          let chapterNumber = 0;
          for (let i = 0; i <= startIndex + index; i++) {
            if (content.sections[i]?.type === 'chapter') {
              chapterNumber++;
            }
          }
          
          return (
            <SectionPreview
              key={startIndex + index}
              section={section}
              sectionNumber={startIndex + index + 1}
              chapterNumber={section.type === 'chapter' ? chapterNumber : undefined}
              affiliateLinks={content.affiliateLinks}
              allSections={content.sections}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Affiliate Links Summary */}
      {content.affiliateLinks.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-green-50">
          <h3 className="text-sm font-semibold text-green-900 mb-2">
            Affiliate Links Included ({content.affiliateLinks.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {content.affiliateLinks.map((link, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded"
                title={`${link.product} - ${link.affiliateProgram.name}`}
              >
                {link.product}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionPreview({
  section,
  sectionNumber,
  chapterNumber,
  affiliateLinks,
  allSections,
}: {
  section: ProductSection;
  sectionNumber: number;
  chapterNumber?: number;
  affiliateLinks: any[];
  allSections: ProductSection[];
}) {
  // Find related affiliate links for this section
  const relatedLinks = affiliateLinks.filter((link) =>
    section.content.toLowerCase().includes(link.product.toLowerCase()) ||
    (section.title && section.title.toLowerCase().includes(link.product.toLowerCase()))
  );

  // Clean title - remove any "Chapter X:" prefixes that might have been added by AI
  let displayTitle = section.title || '';
  if (section.type === 'chapter') {
    displayTitle = displayTitle.replace(/^Chapter\s+\d+:?\s*/i, '').trim();
  }

  return (
    <div className="border-l-4 border-purple-500 pl-4">
      {/* Section Title */}
      {displayTitle && (
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {section.type === 'chapter' && chapterNumber && (
            <span className="text-purple-600 mr-2">
              Chapter {chapterNumber}:
            </span>
          )}
          {displayTitle}
        </h3>
      )}

      {/* Section Type Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
          {section.type}
        </span>
      </div>

      {/* Section Content */}
      <div className="prose prose-sm max-w-none">
        {section.type === 'list' && section.items ? (
          <ul className="list-none space-y-2">
            {section.items.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2 mt-1">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : section.type === 'exercise' && section.items ? (
          <ul className="list-none space-y-2">
            {section.items.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">{section.content}</div>
        )}
      </div>

      {/* Related Affiliate Links */}
      {relatedLinks.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-900 mb-1">Affiliate Links:</p>
          <div className="flex flex-wrap gap-2">
            {relatedLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.affiliateProgram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-blue-700 hover:text-blue-900 underline"
              >
                {link.product} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

