export interface NewsletterTemplate {
  id: string;
  name: string;
  description: string;
  layout: {
    structure: string;
    contentFormat: string;
    linkStyle: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    bodyFontSize: string;
    lineHeight: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    linkColor: string;
    bgColor: string;
  };
  spacing: {
    sectionSpacing: string;
    paragraphSpacing: string;
    mobilePadding: string;
  };
  features: string[];
}

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'plain-text',
    name: 'Plain Text',
    description: 'No formatting, email-friendly. Works everywhere, even in basic email clients.',
    layout: {
      structure: 'text-only',
      contentFormat: 'plain',
      linkStyle: 'inline',
    },
    typography: {
      fontFamily: 'system',
      headingFont: 'system',
      bodyFontSize: '16px',
      lineHeight: '1.6',
    },
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#0066CC',
      linkColor: '#0066CC',
      bgColor: '#FFFFFF',
    },
    spacing: {
      sectionSpacing: '24px',
      paragraphSpacing: '16px',
      mobilePadding: '15px',
    },
    features: [
      'Universal compatibility',
      'No HTML required',
      'Email-safe',
      'Works in all clients',
    ],
  },
  {
    id: 'styled',
    name: 'Styled',
    description: 'HTML with brand colors and formatting. Professional and visually appealing.',
    layout: {
      structure: 'html-layout',
      contentFormat: 'html',
      linkStyle: 'button',
    },
    typography: {
      fontFamily: 'Arial, sans-serif',
      headingFont: 'Arial, sans-serif',
      bodyFontSize: '16px',
      lineHeight: '1.7',
    },
    colors: {
      primary: '#1F2937',
      secondary: '#4B5563',
      accent: '#7C3AED',
      linkColor: '#7C3AED',
      bgColor: '#FFFFFF',
    },
    spacing: {
      sectionSpacing: '32px',
      paragraphSpacing: '18px',
      mobilePadding: '20px',
    },
    features: [
      'Brand colors',
      'HTML formatting',
      'Visual appeal',
      'Professional design',
    ],
  },
  {
    id: 'digest',
    name: 'Digest',
    description: 'Link roundup style. Perfect for quick reads and curated content.',
    layout: {
      structure: 'bullet-layout',
      contentFormat: 'structured',
      linkStyle: 'highlighted',
    },
    typography: {
      fontFamily: 'sans-serif',
      headingFont: 'sans-serif',
      bodyFontSize: '15px',
      lineHeight: '1.6',
    },
    colors: {
      primary: '#111827',
      secondary: '#6B7280',
      accent: '#059669',
      linkColor: '#059669',
      bgColor: '#F9FAFB',
    },
    spacing: {
      sectionSpacing: '28px',
      paragraphSpacing: '14px',
      mobilePadding: '18px',
    },
    features: [
      'Quick-read format',
      'Bullet points',
      'Link highlights',
      'Scannable layout',
    ],
  },
];

export function getNewsletterTemplate(id: string): NewsletterTemplate | undefined {
  return NEWSLETTER_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultNewsletterTemplate(): NewsletterTemplate {
  return NEWSLETTER_TEMPLATES[0];
}

