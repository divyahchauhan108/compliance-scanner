'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileImage, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2, Sparkles, Camera, ScanSearch, ClipboardCheck, ListChecks, Zap, BadgeCheck, AlertTriangle } from 'lucide-react';
import { SAMPLE_PACKAGES } from '@/lib/scanner';
import { saveScan } from '@/lib/storage';
import { SamplePackage } from '@/lib/types';
import { compressImage } from '@/lib/imageUtils';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionDetails, setCompressionDetails] = useState<{ dimensions: string; sizeEstimate: string } | null>(null);
  const [scanStep, setScanStep] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    setSelectedFileName(file.name);
    setApiError(null);
    setIsCompressing(true);

    try {
      // Client-side compression using HTML Canvas API:
      // Resizes so the longest side is <= 1600px and compresses to ~80% JPEG quality
      const { dataUrl, width, height } = await compressImage(file, 1600, 0.8);
      setSelectedImage(dataUrl);

      const estimatedKb = Math.round((dataUrl.length * 0.75) / 1024);
      setCompressionDetails({
        dimensions: `${width}×${height}px`,
        sizeEstimate: estimatedKb > 1024 ? `${(estimatedKb / 1024).toFixed(1)} MB` : `${estimatedKb} KB`,
      });
    } catch (err) {
      console.warn('Canvas compression fallback to raw data URL:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SamplePackage) => {
    setSelectedImage(sample.imageUrl);
    setSelectedFileName(sample.name);
    setCompressionDetails(null);
  };

  const handleScanNow = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setScanStep('Preparing image...');

    try {
      // Check if sample package was selected
      const matchedSample = SAMPLE_PACKAGES.find(
        (s) => s.imageUrl === selectedImage || s.name === selectedFileName
      );

      if (matchedSample) {
        const resultScan = {
          id: matchedSample.id,
          timestamp: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          productName: matchedSample.name,
          category: matchedSample.category,
          imageUrl: matchedSample.imageUrl,
          fields: matchedSample.fields,
          compliantCount: matchedSample.fields.filter((f) => f.status === 'pass').length,
          totalFields: 5,
          overallStatus: (matchedSample.badgeColor === 'green'
            ? 'compliant'
            : matchedSample.badgeColor === 'orange'
            ? 'partially_compliant'
            : 'non_compliant') as 'compliant' | 'partially_compliant' | 'non_compliant',
          notes: matchedSample.description,
        };
        saveScan(resultScan);
        router.push(`/results/${resultScan.id}`);
      } else {
        setScanStep('Compressing & validating image size...');
        let payloadImage = selectedImage;
        try {
          const compressed = await compressImage(selectedImage, 1600, 0.8);
          payloadImage = compressed.dataUrl;
        } catch {
          // fallback to selectedImage
        }

        setScanStep('Sending image to Gemini Vision API...');
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: payloadImage,
            filename: selectedFileName || 'Uploaded Package Image',
          }),
        });

        if (!res.ok) {
          // Surface the actual error from the API route
          let detail = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            detail = errData.detail || errData.error || detail;
            if (errData.hint) detail += `\n\n${errData.hint}`;
          } catch { /* ignore */ }
          setApiError(detail);
          setIsScanning(false);
          return;
        }

        const data = await res.json();
        // Use the Supabase row id for navigation
        if (data.id) {
          setApiError(null);
          router.push(`/results/${data.id}`);
        }
      }
    } catch (err: any) {
      console.error('Scan failed:', err);
      setApiError(err?.message || 'An unexpected error occurred. Check the browser console for details.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* === Hero Explainer Section === */}
      <div className="space-y-5 pt-2">
        {/* Headline & Problem Statement */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-lg bg-amber-50 border border-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                A significant share of packaged products in India may be missing mandatory label declarations
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                The Legal Metrology (Packaged Commodities) Rules, 2011 require every packaged product to declare five details: manufacturer, net quantity, MRP, manufacture date, and consumer care contact. Enforcement today relies on manual inspection, which cannot scale. This tool automates that check using AI-powered label reading.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works — 3 Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '1', icon: Camera, label: 'Upload a photo of the label' },
            { step: '2', icon: ScanSearch, label: 'AI reads and validates against Rule 6' },
            { step: '3', icon: ClipboardCheck, label: 'Get an instant compliance report' },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="relative bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 shadow-sm"
            >
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-xs font-bold">
                {item.step}
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <item.icon className="w-4 h-4 text-[#1E3A8A] mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-gray-800 leading-snug">{item.label}</span>
              </div>
              {idx < 2 && (
                <ArrowRight className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
              )}
            </div>
          ))}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ListChecks, value: '5', label: 'Mandatory Fields Checked' },
            { icon: Zap, value: 'Instant', label: 'Results' },
            { icon: BadgeCheck, value: 'Rule 6(1)', label: 'Compliant Validation' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm space-y-1.5"
            >
              <div className="mx-auto w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-[#1E3A8A]" />
              </div>
              <div className="text-lg font-extrabold text-[#1E3A8A] leading-none">{stat.value}</div>
              <div className="text-[11px] font-medium text-gray-500 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Legal Metrology Compliance Scanner
        </h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto font-normal">
          Upload or select a package label below to verify compliance.
        </p>
      </div>

      {/* API / Scan Error Banner */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Scan Failed — Gemini API Error</p>
            <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap font-mono bg-red-100/60 rounded p-2">{apiError}</pre>
            <button
              onClick={() => setApiError(null)}
              className="mt-2 text-xs text-red-600 underline hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept="image/*"
          className="hidden"
        />

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#1E3A8A] bg-blue-50/70'
              : selectedImage
              ? 'border-blue-300 bg-blue-50/30'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50'
          }`}
        >
          {selectedImage ? (
            <div className="space-y-4">
              <div className="relative inline-block max-w-sm rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                {/* Image Preview */}
                <img
                  src={selectedImage}
                  alt="Selected package preview"
                  className="max-h-64 object-contain mx-auto"
                />
                <div className="absolute top-2 right-2 bg-black/75 text-white text-[11px] font-medium px-2 py-1 rounded">
                  Preview Selected
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium flex items-center justify-center gap-2">
                <FileImage className="w-4 h-4 text-[#1E3A8A]" />
                <span>{selectedFileName || 'Selected Package Image'}</span>
              </div>
              {compressionDetails && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full w-fit mx-auto font-medium shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span>Optimized: {compressionDetails.dimensions} ({compressionDetails.sizeEstimate})</span>
                </div>
              )}
              {isCompressing && (
                <div className="flex items-center justify-center gap-2 text-xs text-blue-700 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Optimizing camera photo for fast upload...</span>
                </div>
              )}
              <p className="text-[11px] text-gray-400">Click or drag a new image to replace</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-[#1E3A8A] border border-blue-100">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[#1E3A8A]">Click to upload package image</span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
              </div>
              <p className="text-xs text-gray-400">Supports PNG, JPG, WEBP format up to 10MB</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isScanning ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-[#1E3A8A] font-medium text-sm">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{scanStep}</span>
              </div>
              <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#1E3A8A] h-full animate-pulse w-3/4 rounded-full"></div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleScanNow}
              disabled={!selectedImage}
              className={`w-full py-3.5 px-6 rounded-lg text-white font-semibold text-base shadow transition-all flex items-center justify-center space-x-2 ${
                selectedImage
                  ? 'bg-[#1E3A8A] hover:bg-[#1E40AF] active:bg-[#172554] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Scan Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pre-configured Demo Sample Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Or Try Pre-Loaded Sample Packages
            </h2>
          </div>
          <span className="text-xs text-gray-500">Quick Test Scans</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SAMPLE_PACKAGES.map((sample) => {
            const isSelected = selectedImage === sample.imageUrl;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`text-left p-3.5 rounded-lg border transition-all text-xs space-y-2 flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#1E3A8A] bg-blue-50/60 ring-2 ring-blue-900/20'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/80 bg-white'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-semibold text-gray-900 text-xs line-clamp-1">{sample.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />}
                  </div>
                  <p className="text-gray-500 line-clamp-2 text-[11px] leading-relaxed">{sample.description}</p>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-gray-100 mt-2">
                  <span className="text-[10px] text-gray-400 font-medium">{sample.category}</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      sample.badgeColor === 'green'
                        ? 'bg-green-100 text-[#16A34A]'
                        : sample.badgeColor === 'orange'
                        ? 'bg-amber-100 text-[#D97706]'
                        : 'bg-red-100 text-[#DC2626]'
                    }`}
                  >
                    {sample.expectedScore}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Field Verification Disclaimer */}
      <div className="text-center text-xs text-gray-500 pt-2 pb-1">
        <p>AI-assisted screening tool for field verification. Results should be confirmed by a Legal Metrology Officer before formal compliance action.</p>
      </div>
    </div>
  );
}
