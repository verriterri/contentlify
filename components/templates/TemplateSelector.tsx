'use client';

import { useState, useEffect } from 'react';
import { ProductType } from '@/lib/ai/product-ideas-generator';
import { getTemplatesForType, Template, TemplateInfo } from '@/lib/templates';

interface TemplateSelectorProps {
  productType: ProductType;
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({ productType, selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const templates = getTemplatesForType(productType);
  
  // Auto-select first template if none is selected
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      onSelect(templates[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType]); // Only re-run when product type changes
  
  const selectedTemplate = selectedTemplateId 
    ? templates.find((t) => t.id === selectedTemplateId)
    : templates[0]; // Default to first template

  if (templates.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No templates available for this product type.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId || 
            (!selectedTemplateId && template.id === templates[0].id);
          
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-purple-600 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              {/* Template Preview Thumbnail */}
              <div className="mb-3">
                <div
                  className={`h-32 rounded border-2 ${
                    isSelected ? 'border-purple-200' : 'border-gray-200'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${getTemplatePreviewColor(template, 'primary')} 0%, ${getTemplatePreviewColor(template, 'secondary')} 100%)`,
                  }}
                >
                  {/* Preview pattern based on template type */}
                  <div className="h-full flex items-center justify-center text-white text-xs opacity-50">
                    {getTemplatePreviewPattern(template)}
                  </div>
                </div>
              </div>

              {/* Template Name */}
              <h3 className="font-semibold text-lg mb-1 text-gray-900">
                {template.name}
              </h3>

              {/* Template Description */}
              <p className="text-sm text-gray-600 mb-3">
                {template.description}
              </p>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="flex items-center text-purple-600 text-sm font-medium">
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-lg mb-4 text-gray-900">
            Template Details: {selectedTemplate.name}
          </h4>

          {/* Features List */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Features:</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {selectedTemplate.features.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
          </div>

          {/* Template Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Layout:</span>
              <span className="ml-2 text-gray-600">
                {getTemplateLayoutInfo(selectedTemplate)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Typography:</span>
              <span className="ml-2 text-gray-600">
                {getTemplateTypographyInfo(selectedTemplate)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get preview color for template thumbnail
 */
function getTemplatePreviewColor(template: Template, colorType: 'primary' | 'secondary' | 'accent'): string {
  if ('colors' in template) {
    const colors = template.colors as any;
    if (colorType === 'primary') return colors.primary || '#7C3AED';
    if (colorType === 'secondary') return colors.secondary || '#A78BFA';
    if (colorType === 'accent') return colors.accent || colors.primary || '#7C3AED';
  }
  return '#7C3AED';
}

/**
 * Get preview pattern for template thumbnail
 */
function getTemplatePreviewPattern(template: Template): string {
  if ('layout' in template) {
    const layout = template.layout as any;
    if (layout.structure?.includes('column')) return 'Multi-column';
    if (layout.structure?.includes('icon')) return 'Visual';
    if (layout.structure?.includes('compact')) return 'Compact';
  }
  
  // Default based on name
  if (template.name.toLowerCase().includes('minimal')) return 'Minimal';
  if (template.name.toLowerCase().includes('creative')) return 'Creative';
  if (template.name.toLowerCase().includes('professional')) return 'Professional';
  
  return 'Preview';
}

/**
 * Get layout information string
 */
function getTemplateLayoutInfo(template: Template): string {
  if ('layout' in template) {
    const layout = template.layout as any;
    if (layout.structure) return String(layout.structure).replace(/-/g, ' ');
    if (layout.contentFormat) return String(layout.contentFormat);
  }
  return 'Standard';
}

/**
 * Get typography information string
 */
function getTemplateTypographyInfo(template: Template): string {
  if ('typography' in template) {
    const typography = template.typography as any;
    const fontFamily = typography.fontFamily || 'sans-serif';
    const fontSize = typography.bodyFontSize || typography.itemFontSize || '14px';
    return `${fontFamily} (${fontSize})`;
  }
  return 'Standard';
}

