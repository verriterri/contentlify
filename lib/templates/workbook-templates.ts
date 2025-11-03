export interface WorkbookTemplate {
  id: string;
  name: string;
  description: string;
  layout: {
    structure: string;
    exerciseSpacing: string;
    writingSpace: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    bodyFontSize: string;
    exerciseFontSize: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    writingLines: string;
    exerciseHeaderBg: string;
  };
  spacing: {
    pageMargin: string;
    exerciseMargin: string;
    writingAreaPadding: string;
  };
  features: string[];
}

export const WORKBOOK_TEMPLATES: WorkbookTemplate[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate style with lots of whitespace. Perfect for business and professional contexts.',
    layout: {
      structure: 'formal-layout',
      exerciseSpacing: 'generous',
      writingSpace: 'large',
    },
    typography: {
      fontFamily: 'serif',
      headingFont: 'sans-serif',
      bodyFontSize: '16px',
      exerciseFontSize: '14px',
    },
    colors: {
      primary: '#1F2937',
      secondary: '#4B5563',
      accent: '#3B82F6',
      writingLines: '#E5E7EB',
      exerciseHeaderBg: '#F9FAFB',
    },
    spacing: {
      pageMargin: '30px',
      exerciseMargin: '40px',
      writingAreaPadding: '20px',
    },
    features: [
      'Corporate-friendly design',
      'Ample whitespace',
      'Professional typography',
      'Formal structure',
    ],
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Colorful with hand-drawn elements. Engaging and inspiring for creative projects.',
    layout: {
      structure: 'freeform-layout',
      exerciseSpacing: 'comfortable',
      writingSpace: 'moderate',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'handwritten-style',
      bodyFontSize: '16px',
      exerciseFontSize: '15px',
    },
    colors: {
      primary: '#111827',
      secondary: '#6366F1',
      accent: '#EC4899',
      writingLines: '#F3F4F6',
      exerciseHeaderBg: '#FDF2F8',
    },
    spacing: {
      pageMargin: '25px',
      exerciseMargin: '35px',
      writingAreaPadding: '18px',
    },
    features: [
      'Colorful design elements',
      'Hand-drawn style accents',
      'Creative typography',
      'Inspiring layout',
    ],
  },
  {
    id: 'practical',
    name: 'Practical',
    description: 'Dense, information-focused layout. Maximizes content while remaining readable.',
    layout: {
      structure: 'compact-layout',
      exerciseSpacing: 'efficient',
      writingSpace: 'compact',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif',
      bodyFontSize: '14px',
      exerciseFontSize: '13px',
    },
    colors: {
      primary: '#1F2937',
      secondary: '#6B7280',
      accent: '#059669',
      writingLines: '#F3F4F6',
      exerciseHeaderBg: '#ECFDF5',
    },
    spacing: {
      pageMargin: '20px',
      exerciseMargin: '25px',
      writingAreaPadding: '15px',
    },
    features: [
      'Information-dense',
      'Efficient use of space',
      'Practical formatting',
      'Clear organization',
    ],
  },
];

export function getWorkbookTemplate(id: string): WorkbookTemplate | undefined {
  return WORKBOOK_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultWorkbookTemplate(): WorkbookTemplate {
  return WORKBOOK_TEMPLATES[0];
}

