export interface AffiliateProgram {
  name: string;
  url: string;
  applies_to: string | string[]; // Product names/keywords or "all_physical_products"
  commission: string;
  category: string[];
}

export const CURATED_PROGRAMS: AffiliateProgram[] = [
  // E-commerce & Marketplaces
  {
    name: 'Amazon Associates',
    url: 'https://affiliate-program.amazon.com',
    applies_to: 'all_physical_products',
    commission: '1-10%',
    category: ['physical_product', 'electronics', 'books', 'home', 'fashion'],
  },
  {
    name: 'eBay Partner Network',
    url: 'https://partnernetwork.ebay.com',
    applies_to: 'all_physical_products',
    commission: '50-70% of revenue share',
    category: ['physical_product', 'electronics', 'vintage', 'collectibles'],
  },
  {
    name: 'Etsy Affiliate Program',
    url: 'https://www.etsy.com/affiliates',
    applies_to: 'etsy',
    commission: '4-8%',
    category: ['handmade', 'artisan', 'crafts', 'vintage'],
  },

  // Software & Productivity
  {
    name: 'Notion Partners',
    url: 'https://notion.so/affiliates',
    applies_to: ['notion'],
    commission: '$10/user',
    category: ['software', 'productivity'],
  },
  {
    name: 'ConvertKit',
    url: 'https://convertkit.com/ambassador',
    applies_to: ['convertkit'],
    commission: '30% recurring',
    category: ['email_marketing', 'software'],
  },
  {
    name: 'Mailchimp',
    url: 'https://mailchimp.com/partners/',
    applies_to: ['mailchimp'],
    commission: '$5-200 per signup',
    category: ['email_marketing', 'software'],
  },
  {
    name: 'AWeber',
    url: 'https://www.aweber.com/affiliate-program.htm',
    applies_to: ['aweber'],
    commission: '30% recurring',
    category: ['email_marketing', 'software'],
  },
  {
    name: 'ActiveCampaign',
    url: 'https://www.activecampaign.com/partners',
    applies_to: ['activecampaign'],
    commission: '20% recurring',
    category: ['email_marketing', 'software'],
  },
  {
    name: 'ClickFunnels',
    url: 'https://affiliates.clickfunnels.com',
    applies_to: ['clickfunnels'],
    commission: '40% recurring',
    category: ['software', 'marketing', 'funnels'],
  },
  {
    name: 'Leadpages',
    url: 'https://www.leadpages.com/affiliate-program',
    applies_to: ['leadpages'],
    commission: '30% recurring',
    category: ['software', 'marketing', 'landing_pages'],
  },

  // Hosting & Web Services
  {
    name: 'Bluehost',
    url: 'https://bluehost.com/affiliates',
    applies_to: ['bluehost', 'hosting', 'web hosting'],
    commission: '$65-100/sale',
    category: ['hosting', 'web_hosting'],
  },
  {
    name: 'SiteGround',
    url: 'https://www.siteground.com/partners.htm',
    applies_to: ['siteground', 'hosting'],
    commission: '$50-100/sale',
    category: ['hosting', 'web_hosting'],
  },
  {
    name: 'WP Engine',
    url: 'https://wpengine.com/affiliate-program/',
    applies_to: ['wp engine', 'wpengine', 'hosting'],
    commission: '$200/sale',
    category: ['hosting', 'web_hosting', 'wordpress'],
  },
  {
    name: 'Cloudways',
    url: 'https://www.cloudways.com/en/affiliates.php',
    applies_to: ['cloudways', 'hosting'],
    commission: '$30-50/sale',
    category: ['hosting', 'cloud_hosting'],
  },
  {
    name: 'Kinsta',
    url: 'https://kinsta.com/affiliate/',
    applies_to: ['kinsta', 'hosting'],
    commission: '50-100% of first payment',
    category: ['hosting', 'web_hosting'],
  },

  // Design & Creative Tools
  {
    name: 'Canva',
    url: 'https://www.canva.com/affiliate/',
    applies_to: ['canva'],
    commission: '$15-30/referral',
    category: ['design', 'software', 'graphic_design'],
  },
  {
    name: 'Adobe',
    url: 'https://www.adobe.com/affiliates.html',
    applies_to: ['adobe', 'photoshop', 'illustrator', 'premiere'],
    commission: '$50-150/referral',
    category: ['design', 'software', 'creative'],
  },
  {
    name: 'Figma',
    url: 'https://www.figma.com/affiliates',
    applies_to: ['figma'],
    commission: '$30/referral',
    category: ['design', 'software', 'ui_design'],
  },
  {
    name: 'Sketch',
    url: 'https://www.sketch.com/affiliate',
    applies_to: ['sketch'],
    commission: '$20/referral',
    category: ['design', 'software', 'ui_design'],
  },

  // E-commerce Platforms
  {
    name: 'Shopify',
    url: 'https://www.shopify.com/affiliates',
    applies_to: ['shopify'],
    commission: '$58-2000/sale',
    category: ['ecommerce', 'platform', 'software'],
  },
  {
    name: 'BigCommerce',
    url: 'https://www.bigcommerce.com/partners/affiliate-program/',
    applies_to: ['bigcommerce'],
    commission: '$300-1500/sale',
    category: ['ecommerce', 'platform'],
  },
  {
    name: 'WooCommerce',
    url: 'https://woocommerce.com/affiliates/',
    applies_to: ['woocommerce'],
    commission: '$50-500/sale',
    category: ['ecommerce', 'platform', 'wordpress'],
  },

  // Course Platforms
  {
    name: 'Teachable',
    url: 'https://teachable.com/affiliate-program',
    applies_to: ['teachable'],
    commission: '30% recurring',
    category: ['course', 'education', 'platform'],
  },
  {
    name: 'Thinkific',
    url: 'https://www.thinkific.com/affiliate-program/',
    applies_to: ['thinkific'],
    commission: '$100-500/sale',
    category: ['course', 'education', 'platform'],
  },
  {
    name: 'Kajabi',
    url: 'https://kajabi.com/affiliates',
    applies_to: ['kajabi'],
    commission: '30% recurring',
    category: ['course', 'education', 'platform'],
  },
  {
    name: 'Udemy',
    url: 'https://www.udemy.com/affiliate/',
    applies_to: ['udemy'],
    commission: '10% per sale',
    category: ['course', 'education', 'platform'],
  },
  {
    name: 'Skillshare',
    url: 'https://www.skillshare.com/affiliate-program',
    applies_to: ['skillshare'],
    commission: '$10/referral',
    category: ['course', 'education', 'platform'],
  },
  {
    name: 'MasterClass',
    url: 'https://www.masterclass.com/affiliate',
    applies_to: ['masterclass'],
    commission: '$10/referral',
    category: ['course', 'education', 'platform'],
  },

  // Digital Product Platforms
  {
    name: 'Gumroad',
    url: 'https://gumroad.com/affiliates',
    applies_to: ['gumroad'],
    commission: '10% per sale',
    category: ['digital_product', 'platform'],
  },
  {
    name: 'Paddle',
    url: 'https://paddle.com/partners/affiliates',
    applies_to: ['paddle'],
    commission: '5-10% per sale',
    category: ['payment', 'platform', 'software'],
  },
  {
    name: 'Selz',
    url: 'https://selz.com/affiliates',
    applies_to: ['selz'],
    commission: '30% recurring',
    category: ['digital_product', 'platform'],
  },

  // Marketing & Analytics
  {
    name: 'HubSpot',
    url: 'https://www.hubspot.com/partners/affiliate-program',
    applies_to: ['hubspot'],
    commission: '15-30% recurring',
    category: ['marketing', 'crm', 'software'],
  },
  {
    name: 'Semrush',
    url: 'https://www.semrush.com/affiliate-program/',
    applies_to: ['semrush'],
    commission: '40% recurring',
    category: ['seo', 'marketing', 'analytics'],
  },
  {
    name: 'Ahrefs',
    url: 'https://ahrefs.com/affiliates',
    applies_to: ['ahrefs'],
    commission: '30% recurring',
    category: ['seo', 'marketing', 'analytics'],
  },
  {
    name: 'Jasper (formerly Jarvis)',
    url: 'https://www.jasper.ai/affiliate-program',
    applies_to: ['jasper', 'jarvis'],
    commission: '30% recurring',
    category: ['ai', 'content', 'software'],
  },
  {
    name: 'Copy.ai',
    url: 'https://www.copy.ai/affiliate',
    applies_to: ['copy.ai', 'copyai'],
    commission: '$10-50/referral',
    category: ['ai', 'content', 'software'],
  },

  // WordPress Plugins & Tools
  {
    name: 'Elementor',
    url: 'https://elementor.com/affiliate/',
    applies_to: ['elementor'],
    commission: '30% recurring',
    category: ['wordpress', 'plugin', 'design'],
  },
  {
    name: 'WP Rocket',
    url: 'https://wp-rocket.me/affiliate-area/',
    applies_to: ['wp rocket', 'wprocket'],
    commission: '20% recurring',
    category: ['wordpress', 'plugin', 'performance'],
  },
  {
    name: 'Yoast SEO',
    url: 'https://yoast.com/affiliate-program/',
    applies_to: ['yoast', 'yoast seo'],
    commission: '50% first payment',
    category: ['wordpress', 'plugin', 'seo'],
  },

  // Project Management & Tools
  {
    name: 'Asana',
    url: 'https://asana.com/affiliates',
    applies_to: ['asana'],
    commission: '$200/referral',
    category: ['productivity', 'project_management', 'software'],
  },
  {
    name: 'Trello',
    url: 'https://trello.com/affiliate-program',
    applies_to: ['trello'],
    commission: '$25/referral',
    category: ['productivity', 'project_management', 'software'],
  },
  {
    name: 'Monday.com',
    url: 'https://monday.com/affiliate-program',
    applies_to: ['monday.com', 'monday'],
    commission: '$50-200/referral',
    category: ['productivity', 'project_management', 'software'],
  },

  // Video & Media
  {
    name: 'Vimeo',
    url: 'https://vimeo.com/affiliate-program',
    applies_to: ['vimeo'],
    commission: '$25/referral',
    category: ['video', 'media', 'platform'],
  },
  {
    name: 'Wistia',
    url: 'https://wistia.com/affiliates',
    applies_to: ['wistia'],
    commission: '$100-500/referral',
    category: ['video', 'hosting', 'platform'],
  },

  // Payment Processors
  {
    name: 'Stripe',
    url: 'https://stripe.com/partners',
    applies_to: ['stripe'],
    commission: '$100/referral',
    category: ['payment', 'processing', 'software'],
  },
  {
    name: 'PayPal',
    url: 'https://www.paypal.com/us/webapps/mpp/referral-program',
    applies_to: ['paypal'],
    commission: '$5-20/referral',
    category: ['payment', 'processing'],
  },

  // Webinar & Live Tools
  {
    name: 'Zoom',
    url: 'https://zoom.us/affiliates',
    applies_to: ['zoom'],
    commission: '$15-30/referral',
    category: ['video_conferencing', 'software'],
  },
  {
    name: 'GoToWebinar',
    url: 'https://www.goto.com/webinar/affiliate-program',
    applies_to: ['gotowebinar', 'goto webinar'],
    commission: '$50-100/referral',
    category: ['webinar', 'software'],
  },

  // Additional Popular Programs
  {
    name: 'Grammarly',
    url: 'https://www.grammarly.com/affiliates',
    applies_to: ['grammarly'],
    commission: '$20/referral',
    category: ['writing', 'software', 'productivity'],
  },
  {
    name: 'LastPass',
    url: 'https://www.lastpass.com/affiliate-program',
    applies_to: ['lastpass'],
    commission: '$20/referral',
    category: ['security', 'software', 'password_manager'],
  },
  {
    name: 'NordVPN',
    url: 'https://nordvpn.com/affiliates/',
    applies_to: ['nordvpn', 'vpn'],
    commission: '30-100% of first payment',
    category: ['security', 'vpn', 'software'],
  },
];

/**
 * Default suggestion for products not found in curated list
 */
export const DEFAULT_SUGGESTION = {
  name: 'Search Web',
  url: '#',
  commission: 'Unknown',
  note: "Google '[product] affiliate program' to find options",
};

