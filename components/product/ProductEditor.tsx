'use client';

import { useState } from 'react';
import { GeneratedProductContent, ProductSection } from '@/lib/ai/product-generator';

interface ProductEditorProps {
  content: GeneratedProductContent;
  onSave: (content: GeneratedProductContent) => void;
  onCancel: () => void;
}

export function ProductEditor({ content, onSave, onCancel }: ProductEditorProps) {
  const [editedContent, setEditedContent] = useState<GeneratedProductContent>(content);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);

  const handleTitleChange = (newTitle: string) => {
    setEditedContent({ ...editedContent, title: newTitle });
  };

  const handleSectionChange = (index: number, field: 'title' | 'content', value: string) => {
    const updatedSections = [...editedContent.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value,
    };
    setEditedContent({ ...editedContent, sections: updatedSections });
  };

  const handleItemChange = (sectionIndex: number, itemIndex: number, newValue: string) => {
    const updatedSections = [...editedContent.sections];
    const section = updatedSections[sectionIndex];
    if (section.items) {
      const updatedItems = [...section.items];
      updatedItems[itemIndex] = newValue;
      updatedSections[sectionIndex] = {
        ...section,
        items: updatedItems,
      };
      setEditedContent({ ...editedContent, sections: updatedSections });
    }
  };

  const handleAddItem = (sectionIndex: number) => {
    const updatedSections = [...editedContent.sections];
    const section = updatedSections[sectionIndex];
    if (section.items) {
      updatedSections[sectionIndex] = {
        ...section,
        items: [...(section.items || []), 'New item'],
      };
      setEditedContent({ ...editedContent, sections: updatedSections });
    }
  };

  const handleRemoveItem = (sectionIndex: number, itemIndex: number) => {
    const updatedSections = [...editedContent.sections];
    const section = updatedSections[sectionIndex];
    if (section.items) {
      const updatedItems = section.items.filter((_, idx) => idx !== itemIndex);
      updatedSections[sectionIndex] = {
        ...section,
        items: updatedItems,
      };
      setEditedContent({ ...editedContent, sections: updatedSections });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editedContent)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Title Editor */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Title</label>
          <input
            type="text"
            value={editedContent.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
            placeholder="Enter product title"
          />
        </div>
      </div>

      {/* Sections Editor */}
      <div className="p-6 space-y-6">
        {editedContent.sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">
                Section {sectionIndex + 1} • {section.type}
              </span>
              <button
                onClick={() =>
                  setActiveSectionIndex(
                    activeSectionIndex === sectionIndex ? null : sectionIndex
                  )
                }
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                {activeSectionIndex === sectionIndex ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {/* Section Title */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Section Title</label>
              <input
                type="text"
                value={section.title || ''}
                onChange={(e) => handleSectionChange(sectionIndex, 'title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="Section title"
              />
            </div>

            {/* Section Content - Show if expanded */}
            {activeSectionIndex === sectionIndex && (
              <div className="mt-4 space-y-4">
                {/* For lists/exercises with items */}
                {section.items && section.items.length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Items</label>
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) =>
                              handleItemChange(sectionIndex, itemIndex, e.target.value)
                            }
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                            placeholder="Item text"
                          />
                          <button
                            onClick={() => handleRemoveItem(sectionIndex, itemIndex)}
                            className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove item"
                          >
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddItem(sectionIndex)}
                        className="w-full px-3 py-2 text-sm text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50"
                      >
                        + Add Item
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Regular content */
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      value={section.content || ''}
                      onChange={(e) => handleSectionChange(sectionIndex, 'content', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="Section content"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

