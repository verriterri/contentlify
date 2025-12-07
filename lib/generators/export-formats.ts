import { GeneratedProductContent, ProductSection } from '../ai/product-generator';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface UserBranding {
  name: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

interface ExportOptions {
  content: GeneratedProductContent;
  userBranding?: UserBranding;
  subscriptionTier?: 'free' | 'starter' | 'pro' | 'agency';
  userId?: string;
}

interface ExportResult {
  blob: Blob;
  fileName: string;
  size: number;
  url?: string; // For cloud storage URLs
}

/**
 * Export product to DOCX format
 */
export async function exportToDocx(options: ExportOptions): Promise<ExportResult> {
  const { content, userBranding } = options;

  // Get colors for styling (use user branding or defaults)
  const colors = getUserBrandingColors(userBranding);
  const typography = getDefaultTypography();

  // Build DOCX document
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: content.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400,
      },
    })
  );

  // Add sections
  content.sections.forEach((section) => {
    children.push(...convertSectionToDocx(section, colors, typography));
  });

  // Add affiliate links section if available
  if (content.affiliateLinks && content.affiliateLinks.length > 0) {
    children.push(
      new Paragraph({
        text: 'Resources & Affiliate Links',
        heading: HeadingLevel.HEADING_1,
        spacing: {
          before: 400,
          after: 200,
        },
      })
    );

    content.affiliateLinks.forEach((link) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: link.product,
              bold: true,
            }),
            new TextRun({
              text: ` - ${link.context}`,
            }),
          ],
          spacing: {
            after: 100,
          },
        })
      );

      // Add clickable link
      const linkColor = hexToDocxColor(colors.primary || '#0563C1');
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: link.affiliateProgram.url,
              color: linkColor,
              underline: {
                type: 'single',
              },
            }),
          ],
          spacing: {
            after: 200,
          },
        })
      );
    });
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  const fileName = `${sanitizeFileName(content.title)}.docx`;

  return {
    blob,
    fileName,
    size: blob.size,
  };
}

/**
 * Export product to Markdown format
 */
export function exportToMarkdown(options: ExportOptions): ExportResult {
  const { content } = options;

  let markdown = '';

  // Title
  markdown += `# ${content.title}\n\n`;

  // Add sections
  content.sections.forEach((section) => {
    markdown += convertSectionToMarkdown(section);
    markdown += '\n\n';
  });

  // Add affiliate links section if available
  if (content.affiliateLinks && content.affiliateLinks.length > 0) {
    markdown += '## Resources & Affiliate Links\n\n';

    content.affiliateLinks.forEach((link) => {
      markdown += `### ${link.product}\n\n`;
      markdown += `${link.context}\n\n`;
      markdown += `[${link.affiliateProgram.name}](${link.affiliateProgram.url})\n\n`;
    });
  }

  // Create blob
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const fileName = `${sanitizeFileName(content.title)}.md`;

  return {
    blob,
    fileName,
    size: blob.size,
  };
}

/**
 * Convert section to DOCX paragraphs
 */
function convertSectionToDocx(
  section: ProductSection,
  colors: any,
  typography: any
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Section title
  if (section.title) {
    // Clean chapter titles - remove any "Chapter X:" prefixes
    let cleanTitle = section.title;
    if (section.type === 'chapter') {
      cleanTitle = cleanTitle.replace(/^Chapter\s+\d+:?\s*/i, '').trim();
    }
    
    paragraphs.push(
      new Paragraph({
        text: cleanTitle,
        heading: section.type === 'chapter' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        spacing: {
          before: 300,
          after: 200,
        },
      })
    );
  }

  // Section content based on type
  switch (section.type) {
    case 'list':
    case 'exercise':
      if (section.items && section.items.length > 0) {
        section.items.forEach((item) => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.type === 'list' ? '☐ ' : '• ',
                }),
                new TextRun({
                  text: item,
                }),
              ],
              spacing: {
                after: 100,
              },
            })
          );
        });
      } else if (section.content) {
        paragraphs.push(
          new Paragraph({
            text: section.content,
            spacing: {
              after: 200,
            },
          })
        );
      }
      break;

    case 'paragraph':
    case 'chapter':
    default:
      if (section.content) {
        // Split into paragraphs if there are double line breaks
        const contentParagraphs = section.content.split(/\n\n+/);
        contentParagraphs.forEach((para) => {
          paragraphs.push(
            new Paragraph({
              text: para.trim(),
              spacing: {
                after: 200,
              },
            })
          );
        });
      }
      break;
  }

  return paragraphs;
}

/**
 * Convert section to Markdown
 */
function convertSectionToMarkdown(section: ProductSection): string {
  let markdown = '';

  // Section title
  if (section.title) {
    // Clean chapter titles - remove any "Chapter X:" prefixes
    let cleanTitle = section.title;
    if (section.type === 'chapter') {
      cleanTitle = cleanTitle.replace(/^Chapter\s+\d+:?\s*/i, '').trim();
    }
    
    const headingLevel = section.type === 'chapter' ? '#' : '##';
    markdown += `${headingLevel} ${cleanTitle}\n\n`;
  }

  // Section content based on type
  switch (section.type) {
    case 'list':
    case 'exercise':
      if (section.items && section.items.length > 0) {
        section.items.forEach((item) => {
          const prefix = section.type === 'list' ? '- [ ] ' : '- ';
          markdown += `${prefix}${item}\n`;
        });
      } else if (section.content) {
        markdown += `${section.content}\n`;
      }
      break;

    case 'paragraph':
    case 'chapter':
    default:
      if (section.content) {
        markdown += `${section.content}\n`;
      }
      break;
  }

  return markdown;
}

/**
 * Get colors for export formatting (from user branding or defaults)
 */
function getUserBrandingColors(userBranding?: UserBranding): any {
  return {
    primary: userBranding?.colors?.primary || '#1F2937',
    secondary: userBranding?.colors?.secondary || '#6B7280',
  };
}

/**
 * Get default typography for export formatting
 */
function getDefaultTypography(): any {
  return {
    fontFamily: 'Calibri',
    fontSize: 11,
  };
}

/**
 * Sanitize file name for safe download
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
    .toLowerCase();
}

/**
 * Download file helper
 */
export function downloadFile(blob: Blob, fileName: string): void {
  saveAs(blob, fileName);
}

/**
 * Copy markdown to clipboard
 */
export async function copyMarkdownToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Estimate file size for different formats
 */
export function estimateFileSize(
  content: GeneratedProductContent,
  format: 'docx' | 'markdown'
): number {
  // Rough estimates based on content length
  const textLength = JSON.stringify(content).length;
  
  switch (format) {
    case 'docx':
      // DOCX has more overhead
      return Math.round(textLength * 1.2);
    case 'markdown':
      // Markdown is similar to text
      return textLength;
    default:
      return textLength;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Convert hex color to DOCX color format (removes # and returns uppercase)
 */
function hexToDocxColor(hex: string): string {
  return hex.replace('#', '').toUpperCase();
}

