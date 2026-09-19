import { ComplianceScan, FieldResult, SamplePackage } from './types';

// Helper SVG generator for crisp sample product mock images
function createSampleSvgUrl(title: string, sub: string, bgGradient: [string, string], statusText: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}" />
        <stop offset="100%" stop-color="${bgGradient[1]}" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="#F3F4F6"/>
    <rect x="50" y="30" width="500" height="340" rx="12" fill="url(#bg)" stroke="#E5E7EB" stroke-width="2"/>
    <rect x="70" y="50" width="460" height="60" rx="8" fill="#1E3A8A" opacity="0.95"/>
    <text x="90" y="88" font-family="Arial, sans-serif" font-weight="bold" font-size="22" fill="#FFFFFF">${title}</text>
    <text x="90" y="128" font-family="Arial, sans-serif" font-size="14" fill="#374151" font-weight="600">${sub}</text>
    <rect x="80" y="145" width="440" height="205" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1.5"/>
    <text x="95" y="172" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1E3A8A">LEGAL METROLOGY DECLARATIONS (RULE 6)</text>
    <line x1="95" y1="180" x2="505" y2="180" stroke="#E5E7EB" stroke-width="1"/>
    <text x="95" y="202" font-family="Arial, sans-serif" font-size="12" fill="#111827">1. MFD / PACKER: Apex Foodworks Pvt Ltd, Plot 42, GIDC, Gujarat - 382445</text>
    <text x="95" y="227" font-family="Arial, sans-serif" font-size="12" fill="#111827">2. NET QUANTITY: 250 g (Standard Unit)</text>
    <text x="95" y="252" font-family="Arial, sans-serif" font-size="12" fill="#111827">3. MAXIMUM RETAIL PRICE: Rs. 45.00 (Incl. of all taxes)</text>
    <text x="95" y="277" font-family="Arial, sans-serif" font-size="12" fill="#111827">4. DATE OF MFG: 08/2026</text>
    <text x="95" y="302" font-family="Arial, sans-serif" font-size="12" fill="#111827">5. CONSUMER CARE: Helpline 1800-11-4223 | Email: care@apexfoods.in</text>
    <rect x="360" y="55" width="160" height="28" rx="14" fill="#16A34A"/>
    <text x="440" y="74" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${statusText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PACKAGES: SamplePackage[] = [
  {
    id: 'sample-biscuits-01',
    name: 'Royal Digest Wheat Biscuits (250g)',
    category: 'Packaged Food',
    description: 'Fully compliant packaged biscuit box meeting all 5 Legal Metrology 2011 declarations.',
    imageUrl: createSampleSvgUrl('Royal Digest Biscuits', 'Category: Baked Goods (250g)', ['#EFF6FF', '#DBEAFE'], '5/5 Compliant'),
    expectedScore: '5 / 5 Compliant',
    badgeColor: 'green',
    fields: [
      {
        id: 'manufacturer',
        name: 'Manufacturer/Packer Details',
        ruleReference: 'Rule 6(1)(a) - Name & complete address of manufacturer/packer/importer',
        status: 'pass',
        extractedText: 'Apex Foodworks Pvt Ltd, Plot 42, GIDC Estate, Sanand, Ahmedabad, Gujarat - 382445',
        description: 'Full corporate name and registered street address identified.',
      },
      {
        id: 'netQuantity',
        name: 'Net Quantity',
        ruleReference: 'Rule 6(1)(b) - Net quantity in standard units of weight, measure or number',
        status: 'pass',
        extractedText: '250 g',
        description: 'Declared in standard SI unit (g).',
      },
      {
        id: 'mrp',
        name: 'MRP (Maximum Retail Price)',
        ruleReference: 'Rule 6(1)(e) - MRP inclusive of all taxes',
        status: 'pass',
        extractedText: 'Rs. 45.00 (Incl. of all taxes)',
        description: 'Compliant mandatory tax statement format present.',
      },
      {
        id: 'manufactureDate',
        name: 'Manufacture Date',
        ruleReference: 'Rule 6(1)(d) - Month and Year of manufacture or pre-packing',
        status: 'pass',
        extractedText: '08/2026',
        description: 'Valid MM/YYYY format detected.',
      },
      {
        id: 'consumerCare',
        name: 'Consumer Care Details',
        ruleReference: 'Rule 6(1)(8) - Name, address, telephone number, email of grievance officer',
        status: 'pass',
        extractedText: 'Toll Free: 1800-11-4223, Email: care@apexfoods.in',
        description: 'Toll-free phone number and active email address available.',
      },
    ],
  },
  {
    id: 'sample-juice-02',
    name: 'Pure Nectar Orange Juice (1L)',
    category: 'Beverages',
    description: 'Partially compliant beverage carton missing Mfg Date and Consumer helpline.',
    imageUrl: createSampleSvgUrl('Pure Nectar Orange Juice', 'Category: Fruit Beverage (1 Liter)', ['#FEF3C7', '#FDE68A'], '3/5 Compliant'),
    expectedScore: '3 / 5 Compliant',
    badgeColor: 'orange',
    fields: [
      {
        id: 'manufacturer',
        name: 'Manufacturer/Packer Details',
        ruleReference: 'Rule 6(1)(a) - Name & complete address of manufacturer/packer',
        status: 'pass',
        extractedText: 'Nectar Botanicals Ltd, Industrial Area Phase 2, Mohali, Punjab',
        description: 'Manufacturer name and factory location present.',
      },
      {
        id: 'netQuantity',
        name: 'Net Quantity',
        ruleReference: 'Rule 6(1)(b) - Net quantity in standard units',
        status: 'pass',
        extractedText: '1 L (1000 mL)',
        description: 'Standard volume metric unit declared clearly.',
      },
      {
        id: 'mrp',
        name: 'MRP (Maximum Retail Price)',
        ruleReference: 'Rule 6(1)(e) - MRP inclusive of all taxes',
        status: 'pass',
        extractedText: 'Rs. 110.00 (Incl. of all taxes)',
        description: 'Valid price declaration found.',
      },
      {
        id: 'manufactureDate',
        name: 'Manufacture Date',
        ruleReference: 'Rule 6(1)(d) - Month and Year of manufacture',
        status: 'fail',
        extractedText: null,
        description: 'NON-COMPLIANT: Packaging only states "Best Before 6 Months" without mandatory Mfg Date.',
      },
      {
        id: 'consumerCare',
        name: 'Consumer Care Details',
        ruleReference: 'Rule 6(1)(8) - Contact helpline and grievance details',
        status: 'fail',
        extractedText: null,
        description: 'NON-COMPLIANT: Lacks required customer care telephone/toll-free contact number.',
      },
    ],
  },
  {
    id: 'sample-chips-03',
    name: 'Super Crunch Potato Chips',
    category: 'Snacks',
    description: 'Non-compliant pouch missing Net Quantity, Mfg Date, and Consumer Helpline.',
    imageUrl: createSampleSvgUrl('Super Crunch Chips', 'Category: Savory Snacks', ['#FEE2E2', '#FECACA'], '1/5 Non-Compliant'),
    expectedScore: '1 / 5 Compliant',
    badgeColor: 'red',
    fields: [
      {
        id: 'manufacturer',
        name: 'Manufacturer/Packer Details',
        ruleReference: 'Rule 6(1)(a) - Name & address of manufacturer',
        status: 'fail',
        extractedText: null,
        description: 'NON-COMPLIANT: Street address, pin code, and city are omitted.',
      },
      {
        id: 'netQuantity',
        name: 'Net Quantity',
        ruleReference: 'Rule 6(1)(b) - Standard units of weight',
        status: 'fail',
        extractedText: null,
        description: 'NON-COMPLIANT: Net weight declaration is missing from all panels.',
      },
      {
        id: 'mrp',
        name: 'MRP (Maximum Retail Price)',
        ruleReference: 'Rule 6(1)(e) - Tax inclusive price',
        status: 'pass',
        extractedText: 'Rs. 20.00 (Incl. of all taxes)',
        description: 'MRP printed on back seal.',
      },
      {
        id: 'manufactureDate',
        name: 'Manufacture Date',
        ruleReference: 'Rule 6(1)(d) - Date of packing',
        status: 'fail',
        extractedText: null,
        description: 'NON-COMPLIANT: No packing month or year printed on package.',
      },
      {
        id: 'consumerCare',
        name: 'Consumer Care Details',
        ruleReference: 'Rule 6(1)(8) - Grievance cell details',
        status: 'fail',
        extractedText: null,
        description: 'NON-COMPLIANT: No customer care address, phone number or email provided.',
      },
    ],
  },
];

/**
 * Fallback used ONLY when GEMINI_API_KEY is not configured in .env.local.
 *
 * IMPORTANT: This function does NOT perform any OCR. Running regex on a base64
 * encoded image string produces garbage (e.g. "Rs. 4" instead of "Rs. 120").
 * Instead it returns NOT_FOUND for all fields and explains what to do.
 */
export function analyzePackageImage(imageUrl: string, filename: string = 'Uploaded Product'): ComplianceScan {
  const scanId = `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const productName =
    cleanName.length > 3
      ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
      : 'Packaged Goods Scan';

  const makeField = (id: FieldResult['id'], name: string, ruleRef: string): FieldResult => ({
    id,
    name,
    ruleReference: ruleRef,
    status: 'fail',
    extractedText: null,
    description:
      'Gemini Vision API key not configured. Add GEMINI_API_KEY to .env.local to enable real OCR scanning.',
  });

  const fields: FieldResult[] = [
    makeField('manufacturer', 'Manufacturer/Packer Details', 'Rule 6(1)(a) - Name & complete address of manufacturer/packer/importer'),
    makeField('netQuantity', 'Net Quantity', 'Rule 6(1)(b) - Net quantity in standard units of weight, measure or number'),
    makeField('mrp', 'MRP (Maximum Retail Price)', 'Rule 6(1)(e) - Price declaration format: MRP ₹ xx.xx (incl. of all taxes)'),
    makeField('manufactureDate', 'Manufacture Date', 'Rule 6(1)(d) - Month and Year of manufacture or pre-packing'),
    makeField('consumerCare', 'Consumer Care Details', 'Rule 6(1)(8) - Name, address, telephone & email of grievance officer'),
  ];

  return {
    id: scanId,
    timestamp,
    productName,
    category: 'General FMCG',
    imageUrl,
    fields,
    compliantCount: 0,
    totalFields: 5,
    overallStatus: 'non_compliant',
    notes:
      'GEMINI_API_KEY not configured. Create .env.local with GEMINI_API_KEY=your_key to enable real Vision OCR. Sample packages above work without a key.',
  };
}
