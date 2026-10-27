import React from 'react';
import type { EvidenceItem } from '../../types';
import { X, Printer, Shield, Check, Copy } from 'lucide-react';

interface EvidenceQRModalProps {
  evidence: EvidenceItem;
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceQRModal: React.FC<EvidenceQRModalProps> = ({
  evidence,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(evidence.qr_code_identifier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate a reproducible pseudo-random QR pattern from the string identifier
  const generateQRMatrix = (seed: string) => {
    const size = 21; // standard version 1 QR size
    const matrix: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

    // Fill corner finders (7x7)
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0); // Top-Left
    drawFinder(size - 7, 0); // Top-Right
    drawFinder(0, size - 7); // Bottom-Left

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Fill data area pseudorandomly based on seed hash
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder zones
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= size - 8;
        const inBL = r >= size - 8 && c < 8;
        if (inTL || inTR || inBL || (r === 6) || (c === 6)) continue;

        // Deterministic pseudo-random based on seed & coordinates
        const val = Math.abs(Math.sin((r * 29 + c * 37 + hash)) * 10000);
        matrix[r][c] = (val - Math.floor(val)) > 0.45;
      }
    }

    return matrix;
  };

  const qrMatrix = generateQRMatrix(evidence.qr_code_identifier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Official Police Exhibit Tag
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Exhibit Tag Area */}
        <div className="p-6 space-y-6 print:p-2 bg-slate-900 print:bg-white print:text-black">
          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-slate-700 print:border-black pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/crest.jpg"
                alt="Kenya Police Crest"
                className="w-12 h-12 object-contain rounded-full shadow"
              />
              <div className="text-left">
                <p className="text-xs font-black tracking-widest uppercase text-amber-400 print:text-black">
                  National Police Service
                </p>
                <p className="text-sm font-extrabold text-white print:text-black">
                  Rockport Police Station • RPS-001
                </p>
                <p className="text-[10px] text-slate-400 print:text-black">
                  CID & Forensics Exhibit Register (Cap 75 Laws of Kenya)
                </p>
              </div>
            </div>
            <div className="mt-2 inline-block px-3 py-1 bg-red-950/80 border border-red-700 text-red-300 print:border-black print:text-black print:bg-transparent rounded text-xs font-mono font-bold tracking-wider uppercase">
              Chain of Custody Exhibit Tag
            </div>
          </div>

          {/* QR & Core Identification */}
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center bg-slate-950/80 print:bg-gray-50 border border-slate-800 print:border-gray-300 rounded-xl p-4">
            {/* SVG QR Code */}
            <div className="p-2 bg-white rounded-lg shadow-md border border-slate-300">
              <svg
                width="140"
                height="140"
                viewBox="0 0 21 21"
                className="w-32 h-32"
                shapeRendering="crispEdges"
              >
                {qrMatrix.map((row, rIdx) =>
                  row.map((filled, cIdx) =>
                    filled ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width="1"
                        height="1"
                        fill="#000000"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            {/* Identifiers */}
            <div className="space-y-2 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 print:text-black uppercase">
                  Exhibit Reference
                </span>
                <p className="text-base font-mono font-black text-white print:text-black">
                  {evidence.exhibit_number}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 print:text-black uppercase">
                  Linked Case File
                </span>
                <p className="text-sm font-mono font-bold text-amber-300 print:text-black">
                  {evidence.case_number}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 print:text-black uppercase">
                  Category
                </span>
                <p className="text-xs font-bold text-emerald-400 print:text-black">
                  {evidence.category}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs border border-slate-800 print:border-gray-300 rounded-xl p-4 bg-slate-950/40 print:bg-white">
            <div className="col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black">
                Exhibit Description
              </span>
              <p className="font-medium text-slate-200 print:text-black mt-0.5 leading-snug">
                {evidence.description}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black">
                Storage Location
              </span>
              <p className="font-semibold text-white print:text-black mt-0.5">
                {evidence.storage_location}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black">
                Current Custodian
              </span>
              <p className="font-semibold text-white print:text-black mt-0.5">
                {evidence.current_custodian_name} ({evidence.current_custodian_service_no})
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black">
                Current Status
              </span>
              <p className="font-semibold text-emerald-300 print:text-black mt-0.5">
                {evidence.status}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black">
                Logged Date & Time
              </span>
              <p className="font-mono text-slate-300 print:text-black mt-0.5">
                {new Date(evidence.created_at).toLocaleString('en-KE')}
              </p>
            </div>
          </div>

          {/* Cryptographic UID Stamp */}
          <div className="p-3 bg-slate-950 border border-slate-800 print:border-gray-300 rounded-xl flex items-center justify-between text-xs">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-black block">
                Cryptographic Seal (SHA-256 Checksum)
              </span>
              <span className="font-mono text-[11px] text-cyan-400 print:text-black font-semibold truncate block">
                {evidence.qr_code_identifier}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 transition print:hidden"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="text-[10px] text-slate-500 print:text-black text-center italic border-t border-slate-800 print:border-black pt-2">
            NOTICE: Tampering with or altering an exhibit tag is a penal offense under Section 116 of the Penal Code of Kenya.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Print Exhibit Label (80mm Tag)
          </button>
        </div>
      </div>
    </div>
  );
};
