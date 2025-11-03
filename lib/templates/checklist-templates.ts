export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  layout: {
    structure: string;
    itemSpacing: string;
    sectionSpacing: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    itemFontSize: string;
    headingFontSize: string;
  };
  colors: {
    primary: string;
    secondary: string;
    checkboxColor: string;
    sectionHeaderBg: string;
  };
  spacing: {
    pageMargin: string;
    sectionMargin: string;
    itemMargin: string;
  };
  features: string[];
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple, clean list with minimal styling. Perfect for straightforward checklists.',
    layout: {
      structure: 'single-column',
      itemSpacing: 'tight',
      sectionSpacing: 'moderate',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif',
      itemFontSize: '14px',
      headingFontSize: '18px',
    },
    colors: {
      primary: '#1F2937',
      secondary: '#6B7280',
      checkboxColor: '#3B82F6',
      sectionHeaderBg: 'transparent',
    },
    spacing: {
      pageMargin: '20px',
      sectionMargin: '24px',
      itemMargin: '8px',
    },
    features: [
      'Clean, uncluttered design',
      'Easy to scan',
      'Minimal visual elements',
      'Focus on content',
    ],
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Includes tips, notes, and expanded explanations. Great for comprehensive guides.',
    layout: {
      structure: 'two-column-notes',
      itemSpacing: 'comfortable',
      sectionSpacing: 'generous',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif-bold',
      itemFontSize: '15px',
      headingFontSize: '20px',
    },
    colors: {
      primary: '#111827',
      secondary: '#4B5563',
      checkboxColor: '#7C3AED',
      sectionHeaderBg: '#F3F4F6',
    },
    spacing: {
      pageMargin: '25px',
      sectionMargin: '32px',
      itemMargin: '12px',
    },
    features: [
      'Tips and notes sections',
      'Expanded explanations',
      'Visual hierarchy',
      'Professional appearance',
    ],
  },
  {
    id: 'visual',
    name: 'Visual',
    description: 'Icon-based with color coding. Engaging and easy to follow at a glance.',
    layout: {
      structure: 'icon-enhanced',
      itemSpacing: 'comfortable',
      sectionSpacing: 'generous',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif-bold',
      itemFontSize: '15px',
      headingFontSize: '22px',
    },
    colors: {
      primary: '#1F2937',
      secondary: '#6366F1',
      checkboxColor: '#8B5CF6',
      sectionHeaderBg: '#EEF2FF',
    },
    spacing: {
      pageMargin: '20px',
      sectionMargin: '28px',
      itemMargin: '10px',
    },
    features: [
      'Color-coded sections',
      'Icon indicators',
      'Visual progress tracking',
      'Eye-catching design',
    ],
  },
];

export function getChecklistTemplate(id: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultChecklistTemplate(): ChecklistTemplate {
  return CHECKLIST_TEMPLATES[0];
}

