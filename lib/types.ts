export type ComplianceStatus = 'pass' | 'fail';

export interface FieldResult {
  id: 'manufacturer' | 'netQuantity' | 'mrp' | 'manufactureDate' | 'consumerCare';
  name: string;
  ruleReference: string;
  status: ComplianceStatus;
  extractedText: string | null;
  description: string;
}

export interface ComplianceScan {
  id: string;
  timestamp: string;
  productName: string;
  category: string;
  imageUrl: string;
  fields: FieldResult[];
  compliantCount: number; // 0 to 5
  totalFields: number; // 5
  overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
  notes?: string;
}

export interface SamplePackage {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  expectedScore: string;
  badgeColor: 'green' | 'orange' | 'red';
  fields: FieldResult[];
}
