/**
 * Map product categories to standardized 4-category system
 */

export type StandardCategory = 
  | 'Software & Tools'
  | 'Physical Products'
  | 'Services'
  | 'Digital Products';

/**
 * Map a category string to one of the 4 standard categories
 */
export function mapToStandardCategory(category: string): StandardCategory {
  const categoryLower = category.toLowerCase();
  
  // Software & Tools (hosting, email, SEO, plugins)
  if (
    categoryLower.includes('hosting') ||
    categoryLower.includes('email') ||
    categoryLower.includes('seo') ||
    categoryLower.includes('plugin') ||
    categoryLower.includes('software') ||
    categoryLower.includes('tool') ||
    categoryLower.includes('app') ||
    categoryLower.includes('platform') ||
    categoryLower.includes('saas') ||
    categoryLower.includes('cms') ||
    categoryLower.includes('analytics') ||
    categoryLower.includes('marketing tool')
  ) {
    return 'Software & Tools';
  }
  
  // Services (travel, finance, insurance)
  if (
    categoryLower.includes('travel') ||
    categoryLower.includes('finance') ||
    categoryLower.includes('insurance') ||
    categoryLower.includes('service') ||
    categoryLower.includes('consulting') ||
    categoryLower.includes('subscription service')
  ) {
    return 'Services';
  }
  
  // Digital Products (ebooks, courses, downloads)
  if (
    categoryLower.includes('ebook') ||
    categoryLower.includes('course') ||
    categoryLower.includes('download') ||
    categoryLower.includes('digital') ||
    categoryLower.includes('template') ||
    categoryLower.includes('checklist') ||
    categoryLower.includes('workbook') ||
    categoryLower.includes('newsletter')
  ) {
    return 'Digital Products';
  }
  
  // Physical Products (everything else tangible)
  // This is the default catch-all for anything not matching above
  return 'Physical Products';
}

