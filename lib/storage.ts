import { ComplianceScan } from './types';
import { SAMPLE_PACKAGES } from './scanner';

const STORAGE_KEY = 'legal_metrology_scans_v1';

function sampleToScan(sample: (typeof SAMPLE_PACKAGES)[0]): ComplianceScan {
  const compliantCount = sample.fields.filter((f) => f.status === 'pass').length;
  let overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant' = 'compliant';
  if (compliantCount < 2) overallStatus = 'non_compliant';
  else if (compliantCount < 4) overallStatus = 'partially_compliant';

  return {
    id: sample.id,
    timestamp: '18 Sep 2026, 14:30',
    productName: sample.name,
    category: sample.category,
    imageUrl: sample.imageUrl,
    fields: sample.fields,
    compliantCount,
    totalFields: 5,
    overallStatus,
    notes: sample.description,
  };
}

export function getScanHistory(): ComplianceScan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with sample packages on initial load
      const initialScans: ComplianceScan[] = SAMPLE_PACKAGES.map((s, idx) => {
        const scan = sampleToScan(s);
        // Vary timestamps slightly
        const date = new Date(Date.now() - (idx + 1) * 3600 * 24 * 1000);
        scan.timestamp = date.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return scan;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialScans));
      return initialScans;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read scan history from storage:', err);
    return [];
  }
}

export function getScanById(id: string): ComplianceScan | null {
  const history = getScanHistory();
  const found = history.find((scan) => scan.id === id);
  if (found) return found;

  // Fallback check against SAMPLE_PACKAGES
  const sample = SAMPLE_PACKAGES.find((s) => s.id === id);
  if (sample) return sampleToScan(sample);

  return null;
}

export function saveScan(scan: ComplianceScan): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getScanHistory();
    // Prepend new scan so latest appears first
    const updated = [scan, ...history.filter((item) => item.id !== scan.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save scan to storage:', err);
  }
}

export function clearScanHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}
