export interface EbookTemplate {
  id: string;
  name: string;
  description: string;
  layout: {
    structure: string;
    columnStyle: string;
    imagePlacement: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    bodyFontSize: string;
    headingFontSize: string;
    lineHeight: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    chapterHeaderBg: string;
    pageBg: string;
  };
  spacing: {
    pageMargin: string;
    chapterMargin: string;
    paragraphSpacing: string;
  };
  features: string[];
}

export const EBOOK_TEMPLATES: EbookTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sans-serif fonts, image-heavy layout. Contemporary and visually engaging.',
    layout: {
      structure: 'single-column',
      columnStyle: 'wide',
      imagePlacement: 'integrated',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif-bold',
      bodyFontSize: '16px',
      headingFontSize: '28px',
      lineHeight: '1.7',
    },
    colors: {
      primary: '#111827',
      secondary: '#4B5563',
      accent: '#3B82F6',
      chapterHeaderBg: '#F9FAFB',
      pageBg: '#FFFFFF',
    },
    spacing: {
      pageMargin: '40px',
      chapterMargin: '60px',
      paragraphSpacing: '20px',
    },
    features: [
      'Contemporary design',
      'Image-friendly layout',
      'Clean sans-serif typography',
      'Modern visual style',
    ],
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Serif fonts, traditional book layout. Timeless and professional.',
    layout: {
      structure: 'single-column',
      columnStyle: 'narrow',
      imagePlacement: 'centered',
    },
    typography: {
      fontFamily: 'serif',
      headingFont: 'serif',
      bodyFontSize: '17px',
      headingFontSize: '24px',
      lineHeight: '1.8',
    },
    colors: {
      primary: '#1F2937',
      secondary: '#4B5563',
      accent: '#7C3AED',
      chapterHeaderBg: '#FFFFFF',
      pageBg: '#FEFEFE',
    },
    spacing: {
      pageMargin: '50px',
      chapterMargin: '80px',
      paragraphSpacing: '24px',
    },
    features: [
      'Traditional book design',
      'Serif typography',
      'Classic layout',
      'Professional appearance',
    ],
  },
  {
    id: 'magazine',
    name: 'Magazine',
    description: 'Multi-column sections, editorial style. Dynamic and visually striking.',
    layout: {
      structure: 'multi-column',
      columnStyle: 'editorial',
      imagePlacement: 'featured',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif-bold',
      bodyFontSize: '15px',
      headingFontSize: '32px',
      lineHeight: '1.6',
    },
    colors: {
      primary: '#000000',
      secondary: '#374151',
      accent: '#EF4444',
      chapterHeaderBg: '#F3F4F6',
      pageBg: '#FFFFFF',
    },
    spacing: {
      pageMargin: '30px',
      chapterMargin: '50px',
      paragraphSpacing: '18px',
    },
    features: [
      'Editorial layout',
      'Multi-column sections',
      'Visual breaks',
      'Magazine-style design',
    ],
  },
];

export function getEbookTemplate(id: string): EbookTemplate | undefined {
  return EBOOK_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultEbookTemplate(): EbookTemplate {
  return EBOOK_TEMPLATES[0];
}

