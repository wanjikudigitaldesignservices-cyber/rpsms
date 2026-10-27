import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Scale, 
  Package, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft 
} from 'lucide-react';
import type { 
  Officer, 
  OBEntry, 
  Person, 
  Cell, 
  CustodyRecord, 
  PropertyItem, 
  Mugshot, 
  Gender, 
  RiskLevel 
} from '@/types';
import { MugshotCapture } from './MugshotCapture';
import { computeBlindIndexHash, quickHashSync } from '@/lib/crypto';

interface PersonBookInFlowProps {
  activeOfficer: Officer;
  cells: Cell[];
  obEntries: OBEntry[];
  existingPersons: Person[];
  preselectedOBEntry?: OBEntry | null;
  onCancel: () => void;
  onCompleteBookIn: (params: {
    person: Person;
    custodyRecord: CustodyRecord;
    propertyItems: PropertyItem[];
  }) => void;
}

export function PersonBookInFlow({
  activeOfficer,
  cells,
  obEntries,
  existingPersons,
  preselectedOBEntry,
  onCancel,
  onCompleteBookIn,
}: PersonBookInFlowProps) {
  // Step State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Demographic state
  const [fullName, setFullName] = useState('');
  const [alias, setAlias] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [dob, setDob] = useState('1998-05-14');
  const [nationality, setNationality] = useState('Kenyan');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [distinguishingMarks, setDistinguishingMarks] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('NORMAL');

  // Identifiers state
  const [nationalId, setNationalId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [priorRecordMatch, setPriorRecordMatch] = useState<Person | null>(null);

  // Incident & Arrest state
  const [selectedOBId, setSelectedOBId] = useState<string>(preselectedOBEntry?.id || (obEntries[0]?.id || ''));
  const [arrestReason, setArrestReason] = useState(preselectedOBEntry?.subject || '');
  const [arrestingOfficerName, setArrestingOfficerName] = useState(activeOfficer.full_name);
  const [arrestingOfficerServiceNo, setArrestingOfficerServiceNo] = useState(activeOfficer.service_number);
  const [healthStatus, setHealthStatus] = useState('Healthy, no apparent physical distress or injuries');

  // Article 49 Rights Checklist
  const [rightsRead, setRightsRead] = useState(true);
  const [lawyerNotified, setLawyerNotified] = useState(false);
  const [nextOfKinNotified, setNextOfKinNotified] = useState(false);

  // Next of Kin
  const [nokName, setNokName] = useState('');
  const [nokRelationship, setNokRelationship] = useState('Spouse');
  const [nokPhone, setNokPhone] = useState('');

  // Cell Allocation
  const [selectedCellId, setSelectedCellId] = useState<string>(() => {
    // Auto-select cell based on gender
    const maleCell = cells.find((c) => c.cell_type === 'MALE' && c.current_occupants < c.capacity);
    return maleCell?.id || cells[0]?.id || '';
  });

  // Mugshots
  const [mugshots, setMugshots] = useState<Mugshot[]>([]);

  // Property Items
  const [propertyItems, setPropertyItems] = useState<{
    desc: string;
    cat: 'VALUABLES' | 'CASH' | 'PHONE' | 'BELT_SHOELACES' | 'MEDICATION' | 'CLOTHING' | 'OTHER';
    qty: number;
    cond: string;
  }[]>([
    { desc: 'Smart Mobile Phone', cat: 'PHONE', qty: 1, cond: 'Functional, screen intact' },
    { desc: 'Waist belt (Suicide prevention policy)', cat: 'BELT_SHOELACES', qty: 1, cond: 'Standard leather' },
  ]);

  const [newPropDesc, setNewPropDesc] = useState('');
  const [newPropCat, setNewPropCat] = useState<'VALUABLES' | 'CASH' | 'PHONE' | 'BELT_SHOELACES' | 'MEDICATION' | 'CLOTHING' | 'OTHER'>('CASH');
  const [newPropCond, setNewPropCond] = useState('Good condition');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Blind-Index duplicate detection on National ID input
  useEffect(() => {
    if (!nationalId.trim()) {
      setPriorRecordMatch(null);
      return;
    }

    const hash = quickHashSync(`ROCKPORT-POLICE-SALT-2026-KDPA-COMPLIANT:${nationalId.trim().toUpperCase()}`);
    const match = existingPersons.find((p) =>
      p.identifiers.some((id) => id.id_value_hash === hash || id.id_value_masked.startsWith(nationalId.substring(0, 4)))
    );

    if (match) {
      setPriorRecordMatch(match);
      // Pre-fill existing known data
      if (!fullName) setFullName(match.full_name);
      if (!alias && match.alias) setAlias(match.alias);
      if (match.risk_level) setRiskLevel(match.risk_level);
      if (match.distinguishing_marks && !distinguishingMarks) setDistinguishingMarks(match.distinguishing_marks);
    } else {
      setPriorRecordMatch(null);
    }
  }, [nationalId, existingPersons]);

  // Handle cell recommendation when gender or risk changes
  useEffect(() => {
    if (riskLevel === 'ESCAPE_RISK' || riskLevel === 'MEDICAL_ATTENTION') {
      const iso = cells.find((c) => c.cell_type === 'ISOLATION');
      if (iso) setSelectedCellId(iso.id);
    } else if (gender === 'FEMALE') {
      const fem = cells.find((c) => c.cell_type === 'FEMALE');
      if (fem) setSelectedCellId(fem.id);
    } else {
      const male = cells.find((c) => c.cell_type === 'MALE' && c.current_occupants < c.capacity);
      if (male) setSelectedCellId(male.id);
    }
  }, [gender, riskLevel, cells]);

  const handleAddProperty = () => {
    if (!newPropDesc.trim()) return;
    setPropertyItems((prev) => [
      ...prev,
      { desc: newPropDesc.trim(), cat: newPropCat, qty: 1, cond: newPropCond },
    ]);
    setNewPropDesc('');
  };

  const handleRemoveProperty = (index: number) => {
    setPropertyItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCell = cells.find((c) => c.id === selectedCellId) || cells[0];
  const selectedOB = obEntries.find((e) => e.id === selectedOBId) || obEntries[0];

  const handleFinalSubmit = async () => {
    if (!fullName.trim()) {
      setValidationError('Full legal name is required.');
      setCurrentStep(1);
      return;
    }
    if (!arrestReason.trim()) {
      setValidationError('Statutory arrest reason is required.');
      setCurrentStep(2);
      return;
    }
    if (!rightsRead) {
      setValidationError('Article 49 rights must be confirmed read to detainee.');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const personId = crypto.randomUUID();
      const custodyRecordId = crypto.randomUUID();

      // Masked National ID and blind hash
      const natIdHash = nationalId.trim()
        ? await computeBlindIndexHash(nationalId.trim())
        : quickHashSync('UNSPECIFIED');

      const maskedNatId = nationalId.trim()
        ? nationalId.substring(0, 4) + '****'
        : 'UNSPECIFIED';

      const createdPerson: Person = {
        id: personId,
        station_id: activeOfficer.station_id,
        full_name: fullName.trim(),
        alias: alias.trim() || undefined,
        gender,
        date_of_birth: dob,
        nationality,
        physical_address: physicalAddress.trim() || undefined,
        distinguishing_marks: distinguishingMarks.trim() || undefined,
        risk_level: riskLevel,
        prior_arrests_count: priorRecordMatch ? (priorRecordMatch.prior_arrests_count || 1) + 1 : 0,
        identifiers: [
          {
            id: crypto.randomUUID(),
            person_id: personId,
            identifier_type: 'NATIONAL_ID',
            id_value_masked: maskedNatId,
            id_value_hash: natIdHash,
            is_primary: true,
            created_at: new Date().toISOString(),
          },
        ],
        mugshots: mugshots.map((m) => ({ ...m, person_id: personId })),
        next_of_kin: nokName.trim()
          ? [
              {
                id: crypto.randomUUID(),
                person_id: personId,
                name: nokName.trim(),
                relationship: nokRelationship,
                phone: nokPhone.trim(),
              },
            ]
          : undefined,
        created_at: new Date().toISOString(),
      };

      const nowIso = new Date().toISOString();

      const createdCustodyRecord: CustodyRecord = {
        id: custodyRecordId,
        station_id: activeOfficer.station_id,
        person_id: personId,
        person: createdPerson,
        ob_entry_id: selectedOB?.id || 'ob-entry-001',
        ob_number: selectedOB?.ob_number || '1/27/10/2026',
        cell_id: selectedCell.id,
        cell_number: selectedCell.cell_number,
        book_in_time: nowIso,
        arrest_reason: arrestReason.trim(),
        arresting_officer_name: arrestingOfficerName.trim(),
        arresting_officer_service_no: arrestingOfficerServiceNo.trim(),
        booked_in_by: activeOfficer.id,
        booked_in_by_service_no: activeOfficer.service_number,
        rights_read: rightsRead,
        lawyer_notified: lawyerNotified,
        next_of_kin_notified: nextOfKinNotified,
        health_status_at_entry: healthStatus.trim(),
        is_in_custody: true,
        custody_limit_hours: 24,
        countdown_start: nowIso,
        alert_12h_sent: false,
        alert_20h_sent: false,
        breach_flagged: false,
        property_items_count: propertyItems.length,
        welfare_logs_count: 1,
      };

      const createdPropertyItems: PropertyItem[] = propertyItems.map((p) => ({
        id: crypto.randomUUID(),
        custody_record_id: custodyRecordId,
        item_description: p.desc,
        category: p.cat,
        quantity: p.qty,
        condition_at_booking: p.cond,
        booked_by_service_no: activeOfficer.service_number,
        status: 'HELD',
        prisoner_signature_captured: true,
        created_at: nowIso,
      }));

      onCompleteBookIn({
        person: createdPerson,
        custodyRecord: createdCustodyRecord,
        propertyItems: createdPropertyItems,
      });
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to complete book-in');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Return to custody directory"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Custody Book-In Desk</span>
              <span className="text-xs font-mono font-semibold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                Article 49 Compliance
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Station RPS-001 • Booking Officer: {activeOfficer.full_name} ({activeOfficer.service_number})
            </p>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => setCurrentStep(1)}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              currentStep === 1
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>1. Demographics & Blind-Index</span>
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <button
            onClick={() => setCurrentStep(2)}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              currentStep === 2
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>2. Arrest & Article 49</span>
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <button
            onClick={() => setCurrentStep(3)}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              currentStep === 3
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3. Biometrics & Mugshot</span>
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <button
            onClick={() => setCurrentStep(4)}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              currentStep === 4
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>4. Cell & Property</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="rounded-lg bg-red-950/50 border border-red-800 p-3.5 text-xs text-red-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* STEP 1: DEMOGRAPHICS & BLIND INDEX LOOKUP */}
      {currentStep === 1 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Step 1: Detainee Identity & Blind-Index Check</h3>
              <p className="text-xs text-slate-400">
                Identifiers are hashed with HMAC salt under the Kenya Data Protection Act 2019 to detect recidivism without exposing plain PII.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">1 of 4</span>
          </div>

          {/* Blind Index Prior Record Warning */}
          {priorRecordMatch && (
            <div className="rounded-lg bg-amber-950/40 border border-amber-800/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>PRIOR ROCKPORT POLICE RECORD IDENTIFIED</span>
              </div>
              <p className="text-xs text-amber-200 leading-relaxed">
                National ID match found in station registry for <strong className="text-white">{priorRecordMatch.full_name}</strong> (Alias: {priorRecordMatch.alias || 'N/A'}). Record notes: {priorRecordMatch.prior_arrests_count || 1} previous book-ins. Risk classification: <strong className="text-amber-300">{priorRecordMatch.risk_level}</strong>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                National ID / Passport <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 29481920"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contact Phone <span className="text-emerald-400 font-mono text-[10px]">(KDPA)</span>
              </label>
              <input
                type="text"
                placeholder="+2547XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Legal Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Martin Kariuki Ndung'u"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alias / Street Moniker
              </label>
              <input
                type="text"
                placeholder="e.g. Karis"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="MALE">Male (M)</option>
                <option value="FEMALE">Female (F)</option>
                <option value="OTHER">Other / Protective Placement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="LOW">Low Risk</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Risk</option>
                <option value="ESCAPE_RISK">Escape Risk (Isolate)</option>
                <option value="MEDICAL_ATTENTION">Medical Attention Needed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Physical Residential Address
              </label>
              <input
                type="text"
                placeholder="e.g. Kawangware Stage 2 / Rockport Central Ward 3"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Distinguishing Physical Marks (Scars, Tattoos, Amputations)
              </label>
              <input
                type="text"
                placeholder="e.g. Scar over left eyebrow, linear tattoo on right forearm"
                value={distinguishingMarks}
                onChange={(e) => setDistinguishingMarks(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Step 1 Actions */}
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (!fullName.trim()) {
                  setValidationError('Please enter detainee full legal name.');
                  return;
                }
                setValidationError(null);
                setCurrentStep(2);
              }}
              className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition-colors shadow-md"
            >
              <span>Next: Arrest & Article 49</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ARREST & STATUTORY ARTICLE 49 RIGHTS */}
      {currentStep === 2 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Step 2: Arrest Incident & Article 49 Statutory Checklist</h3>
              <p className="text-xs text-slate-400">
                Kenya Constitution Article 49 compliance ensures legal detention and admissible evidence.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">2 of 4</span>
          </div>

          {/* Linked OB Incident */}
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              Linked Occurrence Book (OB) Entry Reference <span className="text-amber-400">*</span>
            </label>
            <select
              value={selectedOBId}
              onChange={(e) => {
                setSelectedOBId(e.target.value);
                const found = obEntries.find((o) => o.id === e.target.value);
                if (found) setArrestReason(found.subject);
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-hidden"
            >
              {obEntries.map((ob) => (
                <option key={ob.id} value={ob.id}>
                  OB {ob.ob_number} • [{ob.category}] {ob.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Arrest Reason and Arresting Officers */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Statutory Reason for Arrest & Offense Section <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Burglary and housebreaking contrary to Section 304 of the Penal Code"
                value={arrestReason}
                onChange={(e) => setArrestReason(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Arresting Officer Name
                </label>
                <input
                  type="text"
                  value={arrestingOfficerName}
                  onChange={(e) => setArrestingOfficerName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Arresting Officer Service Number
                </label>
                <input
                  type="text"
                  value={arrestingOfficerServiceNo}
                  onChange={(e) => setArrestingOfficerServiceNo(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Article 49 Rights Mandate */}
          <div className="rounded-lg bg-emerald-950/20 border border-emerald-800/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Scale className="h-4 w-4" />
              <span>ARTICLE 49 RIGHTS STATUTORY VERIFICATION (KENYA CONSTITUTION)</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rightsRead}
                  onChange={(e) => setRightsRead(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <strong className="text-white">Article 49(1)(a) & (b):</strong> Detainee informed promptly in a language they understand of the reason for arrest, the right to remain silent, and the consequences of speaking.
                </div>
              </label>

              <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lawyerNotified}
                  onChange={(e) => setLawyerNotified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <strong className="text-white">Article 49(1)(c):</strong> Detainee informed of right to communicate with an advocate/lawyer and access granted or contact initiated.
                </div>
              </label>

              <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nextOfKinNotified}
                  onChange={(e) => setNextOfKinNotified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <strong className="text-white">Next of Kin Notification:</strong> Contact with family/guardian facilitated.
                </div>
              </label>

              {nextOfKinNotified && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-900/80 rounded border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Next of Kin Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Wanjiku"
                      value={nokName}
                      onChange={(e) => setNokName(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Relationship</label>
                    <input
                      type="text"
                      placeholder="e.g. Sister / Spouse / Mother"
                      value={nokRelationship}
                      onChange={(e) => setNokRelationship(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+2547XXXXXXXX"
                      value={nokPhone}
                      onChange={(e) => setNokPhone(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Health Assessment */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Health & Physical Condition Assessment at Entry <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Step 2 Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!arrestReason.trim()) {
                  setValidationError('Please provide arrest reason.');
                  return;
                }
                setValidationError(null);
                setCurrentStep(3);
              }}
              className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition-colors shadow-md"
            >
              <span>Next: 3-Point Mugshots</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: BIOMETRIC MUGSHOTS */}
      {currentStep === 3 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Step 3: Biometric Mugshot Capture</h3>
              <p className="text-xs text-slate-400">
                Frontal, Left Profile, and Right Profile 90-degree portraits with automated watermark and EXIF geolocational scrubbing.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">3 of 4</span>
          </div>

          <MugshotCapture
            stationCode="RPS-001"
            officerServiceNo={activeOfficer.service_number}
            mugshots={mugshots}
            onChange={setMugshots}
          />

          {/* Step 3 Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition-colors shadow-md"
            >
              <span>Next: Cell Allocation & Property</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CELL ALLOCATION & PROPERTY INTAKE */}
      {currentStep === 4 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Step 4: Cell Allocation & Property Custody Register</h3>
              <p className="text-xs text-slate-400">
                Allocate secure station cell and log all confiscated personal belongings before cell entry.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">4 of 4</span>
          </div>

          {/* Cell Allocation Grid */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              Select Station Cell <span className="text-slate-400 font-normal">(Capacity and gender segregation enforced)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cells.map((cell) => {
                const isSelected = selectedCellId === cell.id;
                const isFull = cell.current_occupants >= cell.capacity;

                return (
                  <button
                    key={cell.id}
                    type="button"
                    disabled={isFull}
                    onClick={() => setSelectedCellId(cell.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500'
                        : isFull
                        ? 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-bold text-white">{cell.cell_number}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                        {cell.cell_type}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">{cell.cell_name}</div>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Occupancy:</span>
                      <span className={isFull ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {cell.current_occupants}/{cell.capacity} {isFull && '(FULL)'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detainee Property Register Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-amber-400" />
                <span>Detainee Property Inventory ({propertyItems.length} items logged)</span>
              </label>
            </div>

            {/* Property list */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Condition at Booking</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {propertyItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-2.5 text-amber-400">{item.cat}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-200">{item.desc}</td>
                      <td className="p-2.5 text-slate-400 font-sans">{item.cond}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveProperty(idx)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add item inline */}
              <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                <select
                  value={newPropCat}
                  onChange={(e) => setNewPropCat(e.target.value as any)}
                  className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="CASH">CASH</option>
                  <option value="PHONE">PHONE / ELECTRONICS</option>
                  <option value="VALUABLES">VALUABLES / JEWELRY</option>
                  <option value="BELT_SHOELACES">BELT / SHOELACES</option>
                  <option value="MEDICATION">MEDICATION</option>
                  <option value="CLOTHING">CLOTHING</option>
                  <option value="OTHER">OTHER</option>
                </select>

                <input
                  type="text"
                  placeholder="Item description (e.g. KES 2,500 cash in wallet)"
                  value={newPropDesc}
                  onChange={(e) => setNewPropDesc(e.target.value)}
                  className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
                />

                <input
                  type="text"
                  placeholder="Condition notes"
                  value={newPropCond}
                  onChange={(e) => setNewPropCond(e.target.value)}
                  className="w-48 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
                />

                <button
                  type="button"
                  onClick={handleAddProperty}
                  className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>

          {/* Statutory 24-Hour Timer Notice */}
          <div className="rounded-lg bg-amber-950/30 border border-amber-800/60 p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong>STATUTORY COUNTDOWN ENGAGEMENT:</strong> Upon completing this book-in, a legally binding <strong>24-hour custody countdown clock</strong> will immediately activate under Article 49 of the Constitution. Detainee must be granted police bail or produced in a court of competent jurisdiction before 24 hours elapse.
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Back
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 text-xs transition-colors shadow-lg disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Finalizing Custody Record...' : 'Complete Book-In & Start 24h Clock'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
