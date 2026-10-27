import React, { useState } from 'react';
import type { CaseRecord, EvidenceCategory, EvidenceItem, Officer } from '../../types';
import { X, Shield, Plus, Camera, Check } from 'lucide-react';

interface AddEvidenceModalProps {
  cases: CaseRecord[];
  activeOfficers: Officer[];
  currentOfficer: Officer;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newEvidence: EvidenceItem) => void;
}

const STORAGE_LOCATIONS = [
  'Armory Safe 2 / Shelf A-1',
  'Armory Safe 1 / Weapons Rack',
  'Forensics Evidence Cabinet 1',
  'Forensics Digital Lab Vault',
  'Station Ballistics Safe Box B',
  'Narcotics Secured Locker N-1',
  'Evidence Locker B-4',
  'Refrigerated Biological Unit 1',
  'General Property Room Shelf 3',
];

export const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({
  cases,
  activeOfficers,
  currentOfficer,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || '');
  const [category, setCategory] = useState<EvidenceCategory>('FIREARM');
  const [description, setDescription] = useState('');
  const [storageLocation, setStorageLocation] = useState(STORAGE_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [custodianId, setCustodianId] = useState(currentOfficer.id);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a detailed description of the exhibit.');
      return;
    }

    const linkedCase = cases.find((c) => c.id === selectedCaseId);
    if (!linkedCase) {
      setError('Please select a valid linked case file.');
      return;
    }

    const custodian = activeOfficers.find((o) => o.id === custodianId) || currentOfficer;
    const finalLocation = customLocation.trim() ? customLocation.trim() : storageLocation;

    // Generate random sequence and QR code identifier
    const seq = Math.floor(Math.random() * 900) + 100;
    const exhibitNumber = `RPS-001/EX/2026/0${seq}`;
    const qrIdentifier = `QR-RPS-EX-2026-0${seq}-${Date.now().toString(36).toUpperCase()}`;

    const newEvidence: EvidenceItem = {
      id: `ev-${Date.now()}`,
      station_id: 'a0000000-0000-0000-0000-000000000001',
      case_id: linkedCase.id,
      case_number: linkedCase.case_number,
      exhibit_number: exhibitNumber,
      qr_code_identifier: qrIdentifier,
      description: description.trim(),
      category,
      storage_location: finalLocation,
      current_custodian_id: custodian.id,
      current_custodian_name: `${custodian.rank} ${custodian.full_name}`,
      current_custodian_service_no: custodian.service_number,
      status: 'IN_STORE',
      initial_photo_path: photoPreview || undefined,
      created_at: new Date().toISOString(),
      transfers_count: 0,
    };

    onSubmit(newEvidence);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Log New Physical/Forensic Exhibit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Linked Case */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Linked Case File *
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} - {c.title} ({c.crime_category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Exhibit Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="FIREARM">FIREARM & BALLISTICS</option>
                <option value="NARCOTICS">NARCOTICS & CONTROLLED DRUGS</option>
                <option value="DIGITAL">DIGITAL (PHONES, USBs, HARD DRIVES)</option>
                <option value="CLOTHING">CLOTHING & PERSONAL EFFECTS</option>
                <option value="DOCUMENT">DOCUMENTS & FRAUD INSTRUMENTS</option>
                <option value="BIOLOGICAL">BIOLOGICAL SAMPLES (DNA, BLOOD)</option>
                <option value="CURRENCY">CURRENCY & VALUABLES</option>
                <option value="OTHER">OTHER GENERAL EXHIBIT</option>
              </select>
            </div>

            {/* Custodian */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Initial Custodian *
              </label>
              <select
                value={custodianId}
                onChange={(e) => setCustodianId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {activeOfficers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.rank} {o.full_name} ({o.service_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Detailed Description & Serial Numbers *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 1x Silver Lenovo ThinkPad laptop (S/N: PF-42991-KE), damaged screen hinge, recovered from suspect bedroom wardrobe."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Storage Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Designated Storage Vault / Unit
              </label>
              <select
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Or Specify Custom Bin / Shelf
              </label>
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="e.g. Evidence Locker C-12, Tier 3"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              >
              </input>
            </div>
          </div>

          {/* Photo Capture / Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Attach Photographic Proof (Optional)
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl cursor-pointer text-xs font-bold transition border border-slate-700">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Upload / Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {photoPreview && (
                <div className="flex items-center gap-2">
                  <img
                    src={photoPreview}
                    alt="Exhibit Preview"
                    className="w-10 h-10 object-cover rounded-lg border border-emerald-500/50"
                  />
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Photo Attached
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Anti-corruption disclosure notice */}
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 text-amber-300/90 rounded-xl text-xs flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Evidence registration triggers an immediate cryptographic entry in the Exhibit Ledger. All subsequent custody transfers will require dual acknowledgment.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Log Exhibit & Generate QR Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
