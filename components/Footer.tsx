import { ShieldCheck, Scale, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto text-gray-600 text-xs py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2 text-[#1E3A8A] font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-[#1E3A8A]" />
              <span>Legal Metrology Audit Framework</span>
            </div>
            <p className="text-gray-500 leading-relaxed">
              Designed for compliance verification under the Legal Metrology (Packaged Commodities) Rules, 2011. Ensures mandatory declarations are present on all pre-packaged commodities sold in India.
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 text-gray-800 font-semibold text-xs mb-2 uppercase tracking-wider">
              <Scale className="w-4 h-4 text-gray-500" />
              <span>Mandatory Rule 6 Declarations</span>
            </div>
            <ul className="space-y-1 text-gray-500">
              <li>• Manufacturer / Packer / Importer Name & Address</li>
              <li>• Net Quantity in Standard Units (Weight/Volume)</li>
              <li>• Maximum Retail Price (MRP incl. of all taxes)</li>
              <li>• Month & Year of Manufacture / Pre-packing</li>
              <li>• Consumer Care Officer Helpline & Address</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center space-x-2 text-gray-800 font-semibold text-xs mb-2 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>Statutory Compliance Notice</span>
            </div>
            <p className="text-gray-500 leading-relaxed">
              Non-compliance with mandatory packaging declarations carries penalties under Section 36 of the Legal Metrology Act, 2009. This portal offers automated verification prior to commercial distribution.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-between items-center text-gray-400 text-[11px] gap-2">
          <div>© {new Date().getFullYear()} Legal Metrology Compliance Scanner • Official Reference Portal</div>
          <div>Standards of Weights and Measures Guidelines • Department of Consumer Affairs</div>
        </div>
      </div>
    </footer>
  );
}
