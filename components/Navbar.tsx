'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, History, Upload, Scale } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const isUploadActive = pathname === '/' || pathname.startsWith('/results');
  const isHistoryActive = pathname === '/history';

  return (
    <header className="bg-[#1E3A8A] text-white shadow-md sticky top-0 z-50">
      {/* Top Ministry Reference Bar */}
      <div className="bg-[#172554] px-4 py-1 text-xs text-blue-200 border-b border-blue-900/50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-blue-300" />
            <span className="font-medium">Government of India • Ministry of Consumer Affairs, Food & Public Distribution</span>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-[11px] text-blue-300">
            <span>Legal Metrology Act, 2009</span>
            <span>•</span>
            <span>Packaged Commodities Rules, 2011</span>
          </div>
        </div>
      </div>

      {/* Main Top Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-lg bg-blue-800/80 border border-blue-600/50 flex items-center justify-center shadow-inner group-hover:bg-blue-700 transition-colors">
            <ShieldCheck className="w-6 h-6 text-blue-200" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-2">
              Legal Metrology Compliance Scanner
              <span className="hidden sm:inline-block text-[10px] bg-blue-700 text-blue-100 font-semibold px-2 py-0.5 rounded border border-blue-500">
                Official Portal
              </span>
            </div>
            <div className="text-xs text-blue-200 font-normal">
              Rules 2011 Automated Verification Engine
            </div>
          </div>
        </Link>

        {/* Links */}
        <nav className="flex items-center space-x-2">
          <Link
            href="/"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isUploadActive
                ? 'bg-white text-[#1E3A8A] shadow-sm font-semibold'
                : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </Link>

          <Link
            href="/history"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isHistoryActive
                ? 'bg-white text-[#1E3A8A] shadow-sm font-semibold'
                : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
