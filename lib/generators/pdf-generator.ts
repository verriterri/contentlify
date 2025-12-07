import jsPDF from 'jspdf';
import { GeneratedProductContent, ProductSection } from '../ai/product-generator';
import { Template } from '../templates';
import { createServerClient } from '../supabase';

interface UserBranding {
  name: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

interface GeneratePDFParams {
  content: GeneratedProductContent;
  template: Template;
  userBranding?: UserBranding;
  subscriptionTier?: 'free' | 'starter' | 'pro' | 'agency';
  userId?: string;
}

interface GeneratePDFResult {
  blob: Blob;
  buffer: Buffer;
  size: number;
}

/**
 * Generate PDF from structured product content
 */
export async function generatePDF(params: GeneratePDFParams): Promise<GeneratePDFResult> {
  const { content, template, userBranding, subscriptionTier = 'free', userId } = params;

  // Create PDF document
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Get template styling
  const colors = getTemplateColors(template, userBranding);
  const typography = getTemplateTypography(template);
  const spacing = getTemplateSpacing(template);
  
  // Convert hex colors to RGB for jsPDF
  const colorsRgb = {
    primary: hexToRgb(colors.primary),
    secondary: hexToRgb(colors.secondary),
    accent: hexToRgb(colors.accent),
  };

  let currentY = spacing.pageMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - spacing.pageMargin * 2;
  const lineHeight = typography.lineHeight;

  // Check if watermark should be shown (hidden for Pro+ tiers)
  const showWatermark = subscriptionTier === 'free' || subscriptionTier === 'starter';

  // Add watermark if needed
  if (showWatermark) {
    addWatermark(doc, pageWidth, pageHeight);
  }

  // Determine if we need a table of contents (for ebooks or long content)
  const needsTOC = content.sections.length > 5 || 
    content.sections.some(s => s.type === 'chapter');

  // Add cover page / title page
  currentY = addTitlePage(doc, content.title, colorsRgb, typography, spacing, pageWidth, pageHeight, userBranding, currentY);
  
  // Add table of contents if needed
  if (needsTOC) {
    doc.addPage();
    currentY = spacing.pageMargin;
    currentY = addTableOfContents(doc, content.sections, colorsRgb, typography, spacing, pageWidth, currentY);
  }

  // Track chapter numbers for proper numbering
  let chapterNumber = 0;

  // Add content sections
  for (let i = 0; i < content.sections.length; i++) {
    const section = content.sections[i];
    
    // Increment chapter counter if this is a chapter
    if (section.type === 'chapter') {
      chapterNumber++;
    }
    
    // For chapters, start on a new page (except first chapter after TOC)
    if (section.type === 'chapter' && i > 0) {
      doc.addPage();
      currentY = spacing.pageMargin;
    }
    
    // Check if we need a new page
    if (currentY > pageHeight - spacing.pageMargin - 30) {
      doc.addPage();
      currentY = spacing.pageMargin;
      
      // Add header with page number
      addPageHeader(doc, content.title, pageWidth, currentY, colorsRgb, typography, spacing);
      currentY += 10;
    }

    // Add section
    currentY = addSection(doc, section, colorsRgb, typography, spacing, pageWidth, pageHeight, currentY, contentWidth, section.type === 'chapter' ? chapterNumber : undefined);

    // Add spacing between sections (more for chapters)
    const sectionSpacing = section.type === 'chapter' ? (spacing.sectionMargin || 10) * 1.5 : (spacing.sectionMargin || 10);
    currentY += sectionSpacing;
  }

  // Add page numbers to all pages
  addPageNumbers(doc, pageWidth, pageHeight);

  // Generate Blob and Buffer
  const pdfBlob = doc.output('blob');
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  return {
    blob: pdfBlob,
    buffer: pdfBuffer,
    size: pdfBuffer.length,
  };
}

/**
 * Upload PDF to Supabase Storage and return public URL
 */
export async function uploadPDFToStorage(
  buffer: Buffer,
  fileName: string,
  userId: string,
  folder: string = 'products'
): Promise<string> {
  const supabase = createServerClient();

  const filePath = `${folder}/${userId}/${fileName}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from('products')
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload PDF to storage: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded PDF');
  }

  return urlData.publicUrl;
}

/**
 * Get template colors, with user branding override
 */
function getTemplateColors(template: Template, userBranding?: UserBranding): any {
  if (!('colors' in template)) {
    return {
      primary: '#1F2937',
      secondary: '#6B7280',
      accent: '#7C3AED',
    };
  }

  const templateColors = template.colors as any;
  return {
    primary: userBranding?.colors?.primary || templateColors.primary || '#1F2937',
    secondary: userBranding?.colors?.secondary || templateColors.secondary || '#6B7280',
    accent: templateColors.accent || templateColors.primary || '#7C3AED',
  };
}

/**
 * Get template typography settings
 */
function getTemplateTypography(template: Template): any {
  if (!('typography' in template)) {
    return {
      fontFamily: 'helvetica',
      fontSize: 12,
      headingSize: 18,
      lineHeight: 1.5,
    };
  }

  const typo = template.typography as any;
  // Normalize font family to valid jsPDF font names
  // jsPDF supports: 'helvetica', 'times', 'courier'
  const fontFamilyRaw = (typo.fontFamily || 'sans-serif').toLowerCase();
  let fontFamily: string;
  if (fontFamilyRaw.includes('serif') && !fontFamilyRaw.includes('sans')) {
    fontFamily = 'times';
  } else {
    fontFamily = 'helvetica'; // Default to helvetica for sans-serif, system, arial, etc.
  }
  // Parse and validate font sizes, ensuring they're valid numbers
  const bodyFontSize = parseFloat(typo.bodyFontSize || typo.itemFontSize || '12');
  const headingFontSize = parseFloat(typo.headingFontSize || typo.bodyFontSize || '18');
  // Clamp font sizes to reasonable values (1-100mm) and convert px to mm
  const fontSize = Math.max(1, Math.min(100, (isNaN(bodyFontSize) || bodyFontSize <= 0 ? 12 : bodyFontSize) * 0.264583));
  const headingSize = Math.max(1, Math.min(100, (isNaN(headingFontSize) || headingFontSize <= 0 ? 18 : headingFontSize) * 0.264583));
  const lineHeight = Math.max(0.5, Math.min(3, isNaN(parseFloat(typo.lineHeight || '1.6')) ? 1.6 : parseFloat(typo.lineHeight || '1.6')));

  return {
    fontFamily,
    fontSize,
    headingSize,
    lineHeight,
  };
}

/**
 * Get template spacing settings
 */
function getTemplateSpacing(template: Template): any {
  if (!('spacing' in template)) {
    return {
      pageMargin: 20,
      sectionMargin: 15,
      itemMargin: 5,
    };
  }

  const spacing = template.spacing as any;
  const pageMargin = parseFloat(spacing.pageMargin || '20') * 0.264583; // px to mm
  const sectionMargin = parseFloat(spacing.sectionMargin || spacing.exerciseMargin || '15') * 0.264583;
  const itemMargin = parseFloat(spacing.itemMargin || '5') * 0.264583;

  return {
    pageMargin,
    sectionMargin,
    itemMargin,
  };
}

/**
 * Convert hex color to RGB array for jsPDF
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [31, 41, 55]; // Default dark gray
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Add title page
 */
function addTitlePage(
  doc: jsPDF,
  title: string,
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] },
  typography: any,
  spacing: any,
  pageWidth: number,
  pageHeight: number,
  userBranding?: UserBranding,
  startY: number = 0
): number {
  // Center content vertically
  let y = startY || pageHeight / 3;

  // Add user branding name if available
  if (userBranding?.name) {
    doc.setFont(typography.fontFamily, 'normal');
    doc.setFontSize(Math.min(100, typography.fontSize * 1.2));
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.text(userBranding.name, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // Add decorative line under brand name
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(0.3);
    const lineWidth = 30;
    doc.line((pageWidth - lineWidth) / 2, y, (pageWidth + lineWidth) / 2, y);
    y += 20;
  }

  // Add main title with better styling
  doc.setFont(typography.fontFamily, 'bold');
  doc.setFontSize(Math.min(100, typography.headingSize * 2));
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  
  const titleLines = doc.splitTextToSize(title, pageWidth - spacing.pageMargin * 2);
  const titleY = y;
  doc.text(titleLines, pageWidth / 2, titleY, { align: 'center' });
  y += titleLines.length * typography.headingSize * 2 * typography.lineHeight + 40;

  // Add decorative element at bottom
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.setLineWidth(1);
  const bottomLineY = pageHeight - 40;
  const bottomLineWidth = 50;
  doc.line((pageWidth - bottomLineWidth) / 2, bottomLineY, (pageWidth + bottomLineWidth) / 2, bottomLineY);

  return y;
}

/**
 * Add table of contents
 */
function addTableOfContents(
  doc: jsPDF,
  sections: ProductSection[],
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] },
  typography: any,
  spacing: any,
  pageWidth: number,
  startY: number
): number {
  let y = startY;

  // TOC Title with better styling
  doc.setFont(typography.fontFamily, 'bold');
  doc.setFontSize(Math.min(100, typography.headingSize * 1.2));
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('Table of Contents', spacing.pageMargin, y);
  y += typography.headingSize * 1.2 * typography.lineHeight + 15;

  // Add line under title
  doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.setLineWidth(0.5);
  doc.line(spacing.pageMargin, y - 5, pageWidth - spacing.pageMargin, y - 5);
  y += 10;

  // TOC Entries with better formatting
  doc.setFont(typography.fontFamily, 'normal');
  doc.setFontSize(Math.min(100, typography.fontSize * 1.05));
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);

  let chapterNumber = 0;
  let sectionNumber = 0;
  sections.forEach((section, index) => {
    if (section.type === 'chapter' || section.type === 'heading' || section.title) {
      if (y > 250) {
        doc.addPage();
        y = spacing.pageMargin;
      }

      let sectionTitle = section.title || `Section ${index + 1}`;
      
      // Clean up chapter titles - remove any "Chapter X:" prefixes
      if (section.type === 'chapter') {
        chapterNumber++;
        sectionTitle = sectionTitle.replace(/^Chapter\s+\d+:?\s*/i, '').trim();
        const tocText = `Chapter ${chapterNumber}: ${sectionTitle}`;
        doc.setFont(typography.fontFamily, 'bold');
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text(tocText, spacing.pageMargin + 5, y);
      } else {
        sectionNumber++;
        doc.setFont(typography.fontFamily, 'normal');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(`${sectionNumber}. ${sectionTitle}`, spacing.pageMargin + 10, y);
      }
      y += typography.fontSize * 1.05 * typography.lineHeight + 8;
    }
  });

  return y;
}

/**
 * Add page header
 */
function addPageHeader(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  y: number,
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] },
  typography: any,
  spacing: any
): void {
  doc.setFont(typography.fontFamily, 'normal');
  doc.setFontSize(typography.fontSize * 0.8);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text(title, spacing.pageMargin, y, { maxWidth: pageWidth - spacing.pageMargin * 2 });
  
  // Add line
  doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.setLineWidth(0.5);
  doc.line(spacing.pageMargin, y + 3, pageWidth - spacing.pageMargin, y + 3);
}

/**
 * Add section to PDF
 */
function addSection(
  doc: jsPDF,
  section: ProductSection,
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] },
  typography: any,
  spacing: any,
  pageWidth: number,
  pageHeight: number,
  currentY: number,
  contentWidth: number,
  chapterNumber?: number
): number {
  let y = currentY;

  // Section title with improved hierarchy
  if (section.title) {
    // Chapters get larger, more prominent formatting
    if (section.type === 'chapter') {
      // Add extra spacing before chapter
      y += 15;
      
      doc.setFont(typography.fontFamily, 'bold');
      doc.setFontSize(Math.min(100, typography.headingSize * 1.5));
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      
      // Clean up title - remove any "Chapter X:" prefixes if AI added them
      let cleanTitle = section.title.replace(/^Chapter\s+\d+:?\s*/i, '').trim();
      
      // Add chapter number prefix if provided
      const chapterTitle = chapterNumber ? `Chapter ${chapterNumber}: ${cleanTitle}` : cleanTitle;
      const titleLines = doc.splitTextToSize(chapterTitle, contentWidth);
      doc.text(titleLines, spacing.pageMargin, y);
      y += titleLines.length * typography.headingSize * 1.5 * typography.lineHeight + 12;
      
      // Add a decorative line under chapter title
      doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.setLineWidth(1);
      doc.line(spacing.pageMargin, y - 8, pageWidth - spacing.pageMargin, y - 8);
      y += 12;
    } else if (section.type === 'heading' || section.type === 'exercise') {
      // Exercise/Heading sections get medium formatting
      y += 8;
      doc.setFont(typography.fontFamily, 'bold');
      doc.setFontSize(typography.headingSize * 0.9);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      
      const titleLines = doc.splitTextToSize(section.title, contentWidth);
      doc.text(titleLines, spacing.pageMargin, y);
      y += titleLines.length * typography.headingSize * 0.9 * typography.lineHeight + 10;
      
      // Add subtle line for exercises
      if (section.type === 'exercise') {
        doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.setLineWidth(0.3);
        doc.line(spacing.pageMargin, y - 5, spacing.pageMargin + 30, y - 5);
        y += 5;
      }
    } else {
      // Regular sections get standard heading formatting
      y += 6;
      doc.setFont(typography.fontFamily, 'bold');
      doc.setFontSize(typography.headingSize * 0.85);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      
      const titleLines = doc.splitTextToSize(section.title, contentWidth);
      doc.text(titleLines, spacing.pageMargin, y);
      y += titleLines.length * typography.headingSize * 0.85 * typography.lineHeight + 8;
    }
  }

  // Section content based on type
  doc.setFont(typography.fontFamily, 'normal');
  doc.setFontSize(typography.fontSize);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);

  switch (section.type) {
    case 'list':
    case 'exercise':
      // For checklists and exercises, render items with better formatting
      if (section.items && section.items.length > 0) {
        section.items.forEach((item, itemIndex) => {
          if (y > pageHeight - spacing.pageMargin - 15) {
            doc.addPage();
            y = spacing.pageMargin;
            if (section.title) {
              addPageHeader(doc, section.title, pageWidth, y, colors, typography, spacing);
              y += 10;
            }
          }

          // Better checkbox rendering for checklist items
          if (section.type === 'list') {
            // Draw checkbox with better styling
            doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.setLineWidth(0.5);
            const checkboxSize = 4.5;
            const checkboxX = spacing.pageMargin;
            const checkboxY = y - checkboxSize;
            doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
            
            // Add item text with proper indentation
            doc.setFont(typography.fontFamily, 'normal');
            doc.setFontSize(typography.fontSize);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            const itemText = doc.splitTextToSize(item, contentWidth - checkboxSize - 5);
            doc.text(itemText, spacing.pageMargin + checkboxSize + 5, y);
            y += itemText.length * typography.fontSize * typography.lineHeight + spacing.itemMargin + 2;
          } else {
            // Exercise items with bullet or numbering
            doc.setFont(typography.fontFamily, 'normal');
            doc.setFontSize(typography.fontSize);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            
            // Add bullet point or number
            const prefix = `${itemIndex + 1}. `;
            const itemText = doc.splitTextToSize(item, contentWidth - 8);
            doc.text(prefix, spacing.pageMargin, y);
            doc.text(itemText, spacing.pageMargin + 8, y, { maxWidth: contentWidth - 8 });
            y += itemText.length * typography.fontSize * typography.lineHeight + spacing.itemMargin + 3;
          }
        });
      } else if (section.content) {
        // Regular text content for exercises
        const contentLines = doc.splitTextToSize(section.content, contentWidth);
        doc.text(contentLines, spacing.pageMargin, y);
        y += contentLines.length * typography.fontSize * typography.lineHeight + 8;
      }
      break;

    case 'paragraph':
    case 'chapter':
    default:
      // Regular paragraph content - split by paragraphs for better formatting
      if (section.content) {
        // Split content by double line breaks to preserve paragraph structure
        const paragraphs = section.content.split(/\n\n+/).filter(p => p.trim());
        
        paragraphs.forEach((paragraph, paraIdx) => {
          // Check for page break before each paragraph
          if (y > pageHeight - spacing.pageMargin - 25) {
            doc.addPage();
            y = spacing.pageMargin;
            if (section.title) {
              addPageHeader(doc, section.title, pageWidth, y, colors, typography, spacing);
              y += 10;
            }
          }
          
          // Format paragraph with proper indentation for first line (optional)
          const contentLines = doc.splitTextToSize(paragraph.trim(), contentWidth);
          doc.text(contentLines, spacing.pageMargin, y);
          y += contentLines.length * typography.fontSize * typography.lineHeight;
          
          // Add spacing between paragraphs
          if (paraIdx < paragraphs.length - 1) {
            y += typography.fontSize * 0.8; // Better paragraph spacing
          } else {
            y += typography.fontSize * 0.4; // Small spacing after last paragraph
          }
        });
      }
      break;
  }

  return y;
}

/**
 * Add page numbers to all pages
 */
function addPageNumbers(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

/**
 * Add watermark
 */
function addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  doc.setFontSize(20);
  doc.setTextColor(200, 200, 200);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.text(
    'Created with ContentMaxer',
    pageWidth / 2,
    pageHeight / 2,
    {
      align: 'center',
      angle: 45,
    }
  );
  doc.setGState(doc.GState({ opacity: 1 }));
}

