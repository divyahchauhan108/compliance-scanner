'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Download,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Scale,
  Tag,
  Calendar,
  PhoneCall,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getScanById } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { ComplianceScan, FieldResult } from '@/lib/types';
import ScoreBadge from '@/components/ScoreBadge';
import { generatePdfReport } from '@/lib/pdfExporter';

const FIELD_ICONS: Record<string, any> = {
  manufacturer: Building2,
  netQuantity: Scale,
  mrp: Tag,
  manufactureDate: Calendar,
  consumerCare: PhoneCall,
};

/** Map a Supabase scans row into the ComplianceScan shape used by the UI */
function rowToScan(row: any): ComplianceScan {
  const score: number = row.score ?? 0;
  let overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant' = 'compliant';
  if (score < 2) overallStatus = 'non_compliant';
  else if (score < 4) overallStatus = 'partially_compliant';

  const makeField = (
    id: FieldResult['id'],
    name: string,
    ruleRef: string,
    value: string | null
  ): FieldResult => ({
    id,
    name,
    ruleReference: ruleRef,
    status: value ? 'pass' : 'fail',
    extractedText: value,
    description: value ? 'Literally verified in photograph.' : 'Not found or illegible in photo.',
  });

  const fields: FieldResult[] = [
    makeField('manufacturer', 'Manufacturer/Packer Details', 'Rule 6(1)(a) - Name & complete address of manufacturer/packer/importer', row.manufacturer),
    makeField('netQuantity', 'Net Quantity', 'Rule 6(1)(b) - Net quantity in standard units of weight, measure or number', row.net_quantity),
    makeField('mrp', 'MRP (Maximum Retail Price)', 'Rule 6(1)(e) - Price declaration format: MRP ₹ xx.xx (incl. of all taxes)', row.mrp),
    makeField('manufactureDate', 'Manufacture Date', 'Rule 6(1)(d) - Month and Year of manufacture or pre-packing', row.mfg_date),
    makeField('consumerCare', 'Consumer Care Details', 'Rule 6(1)(8) - Name, address, telephone & email of grievance officer', row.consumer_care),
  ];

  const timestamp = row.created_at
    ? new Date(row.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return {
    id: row.id,
    timestamp,
    productName: 'Scanned Product',
    category: 'General FMCG',
    imageUrl: row.image_url || '',
    fields,
    compliantCount: score,
    totalFields: 5,
    overallStatus,
    notes: 'Audited using strict Gemini Vision (Temperature: 0) under Legal Metrology Rules, 2011.',
  };
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const routeParams = useParams();
  const scanId = params?.id || (routeParams?.id as string);

  const [scan, setScan] = useState<ComplianceScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!scanId) return;

    async function fetchScan() {
      // Try Supabase first
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (data && !error) {
        setScan(rowToScan(data));
      } else {
        // Fallback to localStorage for sample packages
        const item = getScanById(scanId);
        if (item) setScan(item);
      }
      setLoading(false);
    }

    fetchScan();
  }, [scanId]);

  const handleDownloadPdf = async () => {
    if (!scan) return;
    setIsGeneratingPdf(true);
    await generatePdfReport(scan);
    setIsGeneratingPdf(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-600 font-medium">Loading compliance audit report...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Scan Report Not Found</h2>
        <p className="text-sm text-gray-600">The requested compliance report ID does not exist or has expired.</p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 bg-[#1E3A8A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1E40AF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Scan a Product</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
            <Link href="/history" className="hover:text-[#1E3A8A] flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              History
            </Link>
            <span>/</span>
            <span>Scan ID: {scan.id}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{scan.productName}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Audited on {scan.timestamp}</p>
        </div>

        {/* Overall Score Badge */}
        <div className="flex flex-col items-start sm:items-end gap-2">
          <ScoreBadge score={scan.compliantCount} total={5} size="lg" />
          <span className="text-xs text-gray-500 font-medium">Rule 6 Compliance Score</span>
        </div>
      </div>

      {/* Main Content Grid: Image Left, Checklist Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Preview */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#1E3A8A]" />
              <span>Package Label Image</span>
            </h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">Audited</span>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center p-2 min-h-[300px]">
            <img
              src={scan.imageUrl}
              alt={scan.productName}
              className="max-h-[420px] object-contain rounded"
            />
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5 text-[#1E3A8A]">
              <ShieldCheck className="w-4 h-4" />
              <span>Legal Metrology Act, 2009 Reference</span>
            </div>
            <p className="text-blue-800/80 leading-relaxed text-[11px]">
              Declarations must be legible, prominent, and un-obscured on the principal display panel.
            </p>
          </div>
        </div>

        {/* Right Column: 5 Fields Checklist */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Statutory 5-Field Audit Checklist</h2>
                <p className="text-xs text-gray-500">Legal Metrology (Packaged Commodities) Rules, 2011</p>
              </div>
              <span className="text-xs font-semibold text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                Rule 6 Verified
              </span>
            </div>

            {/* Checklist of 5 Fields */}
            <div className="space-y-3">
              {scan.fields.map((field: FieldResult, idx: number) => {
                const IconComponent = FIELD_ICONS[field.id] || FileText;
                const isPass = field.status === 'pass';

                return (
                  <div
                    key={field.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isPass
                        ? 'border-green-200 bg-green-50/30'
                        : 'border-red-200 bg-red-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                            isPass ? 'bg-green-100 text-[#16A34A]' : 'bg-red-100 text-[#DC2626]'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-gray-900">
                              {idx + 1}. {field.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">{field.ruleReference}</p>
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="shrink-0 flex items-center space-x-1 font-bold text-xs">
                        {isPass ? (
                          <div className="flex items-center space-x-1 text-[#16A34A] bg-green-100 px-2.5 py-1 rounded-full border border-green-300">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>PASS</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-[#DC2626] bg-red-100 px-2.5 py-1 rounded-full border border-red-300">
                            <XCircle className="w-4 h-4" />
                            <span>FAIL</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extracted Text Snippet */}
                    <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-baseline justify-between text-xs gap-1">
                      <span className="text-gray-500 font-medium shrink-0">Extracted Text:</span>
                      {field.extractedText ? (
                        <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-800 text-[11px] font-medium break-all">
                          "{field.extractedText}"
                        </span>
                      ) : (
                        <span className="text-[#DC2626] font-semibold text-[11px] bg-red-100/80 px-2 py-0.5 rounded">
                          Not Found / Missing on Label
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#1E3A8A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1E40AF] transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
                <span>Scan Another</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
