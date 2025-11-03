import { CHECKLIST_TEMPLATES, ChecklistTemplate } from './checklist-templates';
import { WORKBOOK_TEMPLATES, WorkbookTemplate } from './workbook-templates';
import { EBOOK_TEMPLATES, EbookTemplate } from './ebook-templates';
import { NEWSLETTER_TEMPLATES, NewsletterTemplate } from './newsletter-templates';
import { ProductType } from '../ai/product-ideas-generator';

export type Template = ChecklistTemplate | WorkbookTemplate | EbookTemplate | NewsletterTemplate;

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  type: ProductType;
}

/**
 * Get all templates for a specific product type
 */
export function getTemplatesForType(type: ProductType): Template[] {
  switch (type) {
    case 'checklist':
      return CHECKLIST_TEMPLATES as Template[];
    case 'workbook':
      return WORKBOOK_TEMPLATES as Template[];
    case 'ebook':
      return EBOOK_TEMPLATES as Template[];
    case 'newsletter':
      return NEWSLETTER_TEMPLATES as Template[];
    default:
      return [];
  }
}

/**
 * Get a specific template by type and ID
 */
export function getTemplate(type: ProductType, id: string): Template | undefined {
  switch (type) {
    case 'checklist':
      return CHECKLIST_TEMPLATES.find((t) => t.id === id);
    case 'workbook':
      return WORKBOOK_TEMPLATES.find((t) => t.id === id);
    case 'ebook':
      return EBOOK_TEMPLATES.find((t) => t.id === id);
    case 'newsletter':
      return NEWSLETTER_TEMPLATES.find((t) => t.id === id);
    default:
      return undefined;
  }
}

/**
 * Get default template for a product type
 */
export function getDefaultTemplate(type: ProductType): Template | undefined {
  switch (type) {
    case 'checklist':
      return CHECKLIST_TEMPLATES[0];
    case 'workbook':
      return WORKBOOK_TEMPLATES[0];
    case 'ebook':
      return EBOOK_TEMPLATES[0];
    case 'newsletter':
      return NEWSLETTER_TEMPLATES[0];
    default:
      return undefined;
  }
}

/**
 * Get all templates as a flat list with type info
 */
export function getAllTemplateInfos(): TemplateInfo[] {
  const infos: TemplateInfo[] = [];
  
  CHECKLIST_TEMPLATES.forEach((t) => {
    infos.push({ id: t.id, name: t.name, description: t.description, type: 'checklist' });
  });
  
  WORKBOOK_TEMPLATES.forEach((t) => {
    infos.push({ id: t.id, name: t.name, description: t.description, type: 'workbook' });
  });
  
  EBOOK_TEMPLATES.forEach((t) => {
    infos.push({ id: t.id, name: t.name, description: t.description, type: 'ebook' });
  });
  
  NEWSLETTER_TEMPLATES.forEach((t) => {
    infos.push({ id: t.id, name: t.name, description: t.description, type: 'newsletter' });
  });
  
  return infos;
}

