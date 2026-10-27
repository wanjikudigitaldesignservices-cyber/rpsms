import React, { useState } from 'react';
import type { ArmoryWeapon, FuelLog, Officer, PatrolVehicle } from '../../types';
import {
  Crosshair,
  Truck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Gauge,
  Fuel,
  Search,
  X,
  FileWarning,
} from 'lucide-react';

interface ArmoryAndVehiclesProps {
  weapons: ArmoryWeapon[];
  vehicles: PatrolVehicle[];
  fuelLogs: FuelLog[];
  activeOfficers: Officer[];
  currentOfficer: Officer;
  onIssueWeapon: (
    weaponId: string,
    officerId: string,
    officerName: string,
    serviceNo: string,
    rounds: number
  ) => void;
  onReturnWeapon: (
    weaponId: string,
    returnedRounds: number,
    justification?: string
  ) => void;
  onLogFuel: (newLog: FuelLog, updatedMileage: number) => void;
  onUpdateVehicleStatus: (vehicleId: string, status: PatrolVehicle['status']) => void;
}

export const ArmoryAndVehicles: React.FC<ArmoryAndVehiclesProps> = ({
  weapons,
  vehicles,
  fuelLogs,
  activeOfficers,
  currentOfficer,
  onIssueWeapon,
  onReturnWeapon,
  onLogFuel,
  onUpdateVehicleStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'ARMORY' | 'FLEET'>('ARMORY');
  const [searchTerm, setSearchTerm] = useState('');

  // Weapon Issue modal state
  const [issueWeapon, setIssueWeapon] = useState<ArmoryWeapon | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState(activeOfficers[0]?.id || '');
  const [roundsToIssue, setRoundsToIssue] = useState<number>(15);

  // Weapon Return modal state
  const [returnWeapon, setReturnWeapon] = useState<ArmoryWeapon | null>(null);
  const [roundsReturned, setRoundsReturned] = useState<number>(0);
  const [deficitJustification, setDeficitJustification] = useState('');

  // Fuel log modal state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [fuelLitres, setFuelLitres] = useState<number>(50);
  const [fuelCost, setFuelCost] = useState<number>(10000);
  const [newMileage, setNewMileage] = useState<number>(142600);
  const [stationName, setStationName] = useState('National Oil Rockport Central');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Discrepancy counts
  const armoryDiscrepancies = weapons.filter((w) => w.discrepancy_flagged).length;
  const issuedWeaponsCount = weapons.filter((w) => w.status === 'ISSUED').length;
  const vehiclesOnPatrol = vehicles.filter((v) => v.status === 'PATROL').length;

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueWeapon) return;

    const officer = activeOfficers.find((o) => o.id === selectedOfficerId);
    if (!officer) return;

    onIssueWeapon(
      issueWeapon.id,
      officer.id,
      `${officer.rank} ${officer.full_name}`,
      officer.service_number,
      roundsToIssue
    );
    setIssueWeapon(null);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnWeapon) return;

    onReturnWeapon(
      returnWeapon.id,
      roundsReturned,
      deficitJustification.trim() || undefined
    );
    setReturnWeapon(null);
    setRoundsReturned(0);
    setDeficitJustification('');
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle || !receiptNumber.trim()) return;

    // Detect abnormal mileage (e.g. mileage didn't increase or jump is negative)
    const anomaly = newMileage <= vehicle.current_mileage;

    const log: FuelLog = {
      id: `fuel-${Date.now()}`,
      vehicle_id: vehicle.id,
      vehicle_reg: vehicle.registration_number,
      officer_service_no: currentOfficer.service_number,
      fuel_litres: Number(fuelLitres),
      cost_kes: Number(fuelCost),
      mileage_at_fueling: Number(newMileage),
      fuel_station: stationName.trim(),
      receipt_number: receiptNumber.trim(),
      consumption_anomaly_flagged: anomaly,
      logged_at: new Date().toISOString(),
    };

    onLogFuel(log, Number(newMileage));
    setIsFuelModalOpen(false);
    setReceiptNumber('');
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('ARMORY')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'ARMORY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            Station Armory & Arms Register
            {armoryDiscrepancies > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] rounded-full animate-bounce">
                {armoryDiscrepancies}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('FLEET')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'FLEET'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            Patrol Fleet & Fuel Logistics
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'ARMORY' ? 'Search serial, type...' : 'Search reg, model...'}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* =====================================================================
          TAB 1: STATION ARMORY
          ===================================================================== */}
      {activeTab === 'ARMORY' && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Firearms In Inventory
                </p>
                <p className="text-2xl font-black text-white mt-1">{weapons.length}</p>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl">
                <Crosshair className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Currently Issued on Shift
                </p>
                <p className="text-2xl font-black text-amber-400 mt-1">{issuedWeaponsCount}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Gauge className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ammunition Deficit Alerts
                </p>
                <p className={`text-2xl font-black mt-1 ${armoryDiscrepancies > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {armoryDiscrepancies}
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${armoryDiscrepancies > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-slate-800 border-slate-700'}`}>
                <ShieldAlert className={`w-6 h-6 ${armoryDiscrepancies > 0 ? 'text-red-400' : 'text-slate-400'}`} />
              </div>
            </div>
          </div>

          {/* Critical Ammunition Reconciliation Warning */}
          {armoryDiscrepancies > 0 && (
            <div className="p-4 bg-red-950/80 border-2 border-red-600 rounded-xl text-red-200 text-xs flex items-start gap-3 shadow-xl">
              <FileWarning className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-sm font-black uppercase tracking-wider">
                  Critical Armory Anomaly: Unreconciled Fired Ammunition
                </strong>
                <p className="mt-0.5 leading-relaxed text-red-200/90">
                  One or more firearms have returned with missing live rounds without an attached official Fired Rounds Incident Report. Under National Police Service Standing Orders Chapter 42, an immediate disciplinary inquest has been logged.
                </p>
              </div>
            </div>
          )}

          {/* Weapons Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Weapon Type & Caliber</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issued Officer</th>
                    <th className="px-4 py-3">Rounds (Iss / Ret)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {weapons
                    .filter(
                      (w) =>
                        w.weapon_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        w.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (w.issued_to_officer_name &&
                          w.issued_to_officer_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((weapon) => (
                      <tr key={weapon.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5 font-bold text-white text-xs">
                          {weapon.weapon_type}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-amber-300">
                          {weapon.serial_number}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {weapon.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              weapon.status === 'IN_ARMORY'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : weapon.status === 'ISSUED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {weapon.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300">
                          {weapon.issued_to_officer_name ? (
                            <div>
                              <p className="font-semibold text-white">{weapon.issued_to_officer_name}</p>
                              <span className="text-[10px] font-mono text-slate-400">
                                {weapon.issued_to_service_no}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">In Safe Storage</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs">
                          {weapon.status === 'ISSUED' ? (
                            <span className="text-amber-400 font-bold">
                              {weapon.issued_rounds} Live Rounds
                            </span>
                          ) : weapon.discrepancy_flagged ? (
                            <span className="text-red-400 font-bold">
                              {weapon.issued_rounds} iss / {weapon.returned_rounds} ret (DEFICIT)
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Cap: {weapon.rounds_capacity} rounds
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {weapon.status === 'IN_ARMORY' ? (
                            <button
                              onClick={() => {
                                setIssueWeapon(weapon);
                                setRoundsToIssue(weapon.rounds_capacity);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition flex items-center gap-1.5 ml-auto"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                              Issue for Shift
                            </button>
                          ) : weapon.status === 'ISSUED' ? (
                            <button
                              onClick={() => {
                                setReturnWeapon(weapon);
                                setRoundsReturned(weapon.issued_rounds);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition flex items-center gap-1.5 ml-auto"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Return & Reconcile
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PATROL FLEET & FUEL LOGISTICS
          ===================================================================== */}
      {activeTab === 'FLEET' && (
        <div className="space-y-5">
          {/* Control Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Station Patrol Fleet ({vehicles.length} Vehicles)
              </h3>
              {vehiclesOnPatrol > 0 && (
                <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-800 text-amber-300 rounded text-xs font-semibold">
                  {vehiclesOnPatrol} On Patrol
                </span>
              )}
            </div>
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition"
            >
              <Fuel className="w-4 h-4" />
              Log Fuel & Patrol Odometer
            </button>
          </div>

          {/* Vehicles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((veh) => (
              <div
                key={veh.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-base font-black text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                      {veh.registration_number}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2 leading-snug">
                      {veh.vehicle_model}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      veh.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : veh.status === 'PATROL'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}
                  >
                    {veh.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Classification:</span>
                    <strong className="text-slate-200">{veh.vehicle_type.replace(/_/g, ' ')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Odometer Reading:</span>
                    <strong className="font-mono text-white">{veh.current_mileage.toLocaleString()} KM</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fuel Requirement:</span>
                    <strong className="text-emerald-400">{veh.fuel_type}</strong>
                  </div>
                </div>

                {/* Status Toggle buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onUpdateVehicleStatus(veh.id, 'PATROL')}
                    disabled={veh.status === 'PATROL'}
                    className="flex-1 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/50 rounded-lg text-xs font-bold transition disabled:opacity-30"
                  >
                    Dispatch Patrol
                  </button>
                  <button
                    onClick={() => onUpdateVehicleStatus(veh.id, 'ACTIVE')}
                    disabled={veh.status === 'ACTIVE'}
                    className="flex-1 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 rounded-lg text-xs font-bold transition disabled:opacity-30"
                  >
                    At Station
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Fuel Consumption Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-6">
            <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Official Fuel Register & Consumption Ledger
              </h4>
              <span className="text-[11px] text-slate-400">National Police Service Logistics</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Date & Time</th>
                    <th className="px-4 py-2.5">Vehicle Reg</th>
                    <th className="px-4 py-2.5">Litres</th>
                    <th className="px-4 py-2.5">Cost (KES)</th>
                    <th className="px-4 py-2.5">Odometer (KM)</th>
                    <th className="px-4 py-2.5">Station & Receipt</th>
                    <th className="px-4 py-2.5">Logging Officer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {fuelLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-2.5 font-mono text-slate-400">
                        {new Date(log.logged_at).toLocaleString('en-KE')}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-amber-300">
                        {log.vehicle_reg}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-white">
                        {log.fuel_litres} L
                      </td>
                      <td className="px-4 py-2.5 font-mono text-emerald-400">
                        KES {log.cost_kes.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">
                        {log.mileage_at_fueling.toLocaleString()} KM
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        <p className="font-medium">{log.fuel_station}</p>
                        <span className="text-[10px] font-mono text-slate-500">
                          Rec: {log.receipt_number}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">
                        {log.officer_service_no}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALS
          ===================================================================== */}

      {/* Issue Weapon Modal */}
      {issueWeapon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Issue Firearm to Shift Officer
                </h3>
              </div>
              <button
                onClick={() => setIssueWeapon(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="font-mono text-amber-300 font-bold block">
                  {issueWeapon.weapon_type} (S/N: {issueWeapon.serial_number})
                </span>
                <span className="text-slate-400 block">
                  Magazine Capacity: {issueWeapon.rounds_capacity} rounds
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Receiving Duty Officer *
                </label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {activeOfficers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.rank} {o.full_name} ({o.service_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Live Ammunition Rounds Issued *
                </label>
                <input
                  type="number"
                  min={1}
                  max={issueWeapon.rounds_capacity}
                  value={roundsToIssue}
                  onChange={(e) => setRoundsToIssue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIssueWeapon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Sign Out Firearm & Rounds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Weapon & Round Reconciliation Modal */}
      {returnWeapon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Armory Return & Reconciliation
                </h3>
              </div>
              <button
                onClick={() => setReturnWeapon(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-mono text-amber-300 font-bold">{returnWeapon.weapon_type}</span>
                  <span className="text-slate-400 font-mono">S/N: {returnWeapon.serial_number}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300">
                  <span>Officer: <strong>{returnWeapon.issued_to_officer_name}</strong></span>
                  <span className="text-amber-400 font-mono">Issued: {returnWeapon.issued_rounds} rds</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Live Rounds Returned to Armory *
                </label>
                <input
                  type="number"
                  min={0}
                  max={returnWeapon.issued_rounds}
                  value={roundsReturned}
                  onChange={(e) => setRoundsReturned(Number(e.target.value))}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none ${
                    roundsReturned < returnWeapon.issued_rounds
                      ? 'border-red-600 text-red-400'
                      : 'border-slate-700 text-emerald-400 focus:border-emerald-500'
                  }`}
                />
              </div>

              {/* Deficit Warning & Justification */}
              {roundsReturned < returnWeapon.issued_rounds && (
                <div className="p-3.5 bg-red-950/60 border border-red-700 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>DEFICIT: {returnWeapon.issued_rounds - roundsReturned} ROUNDS MISSING</span>
                  </div>
                  <p className="text-[11px] text-red-300/90 leading-tight">
                    Fired rounds must be justified under Kenya Police Standing Orders with a sworn spent-ammunition statement.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-red-300 uppercase tracking-wider mb-1">
                      Fired Ammunition Incident Reference *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={deficitJustification}
                      onChange={(e) => setDeficitJustification(e.target.value)}
                      placeholder="e.g. Expended 2 rounds warning shots during armed burglary pursuit under OB 14/27/10/2026. Spent cartridges retrieved and marked."
                      className="w-full bg-slate-950 border border-red-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnWeapon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-lg shadow-amber-900/30 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Complete Armory Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Fuel Entry Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Log Fuel & Odometer Entry
                </h3>
              </div>
              <button
                onClick={() => setIsFuelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFuelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Vehicle *
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.vehicle_model} ({v.current_mileage.toLocaleString()} KM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Fuel (Litres) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    required
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Total Cost (KES) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    required
                    value={fuelCost}
                    onChange={(e) => setFuelCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Current Odometer Reading (KM) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newMileage}
                  onChange={(e) => setNewMileage(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Fuel Station Name
                </label>
                <input
                  type="text"
                  required
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Official NOC / Station Receipt # *
                </label>
                <input
                  type="text"
                  required
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g. NOC-2026-9921"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
                >
                  <Fuel className="w-3.5 h-3.5" />
                  Log Consumption Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
