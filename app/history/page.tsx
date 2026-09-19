'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Eye, ArrowRight, Trash2, Calendar, FileText, Scale } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ComplianceScan, FieldResult } from '@/lib/types';
import ScoreBadge from '@/components/ScoreBadge';

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

export default function HistoryPage() {
  const [history, setHistory] = useState<ComplianceScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setHistory(data.map(rowToScan));
      }
      setLoading(false);
    }

    fetchHistory();
  }, []);

  const handleClearHistory = () => {
    // Clear history is no longer supported with Supabase backend
    alert('Scan history is stored in the cloud database and cannot be cleared from the client.');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-600 font-medium">Loading scan audit history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded border border-blue-200 mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Audit Log Database</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Past Scan Audit History</h1>
          <p className="text-xs text-gray-500 mt-1">
            Archived product compliance inspections under Legal Metrology Rules, 2011.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}

          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-[#1E3A8A] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1E40AF] transition-colors shadow-sm"
          >
            <span>Scan New Product</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Scans Table Container */}
      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E3A8A] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-900">No Past Scans Found</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            You haven't performed any compliance scans yet. Upload a packaged product image to create your first audit record.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-[#1E3A8A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1E40AF]"
          >
            <span>Start First Scan</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Product Package</th>
                  <th className="py-3.5 px-4">Audit Date & Time</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Score Badge</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {history.map((scan) => (
                  <tr key={scan.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Thumbnail & Product Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={scan.imageUrl}
                            alt={scan.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm leading-tight">
                            {scan.productName}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">ID: {scan.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{scan.timestamp}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-[11px] font-medium border border-gray-200">
                        {scan.category || 'General Package'}
                      </span>
                    </td>

                    {/* Score Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <ScoreBadge score={scan.compliantCount} total={5} size="sm" />
                    </td>

                    {/* Action View Link */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <Link
                        href={`/results/${scan.id}`}
                        className="inline-flex items-center space-x-1.5 text-xs text-[#1E3A8A] font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {history.length} audit records</span>
            <span>Legal Metrology Audit Database</span>
          </div>
        </div>
      )}
    </div>
  );
}
