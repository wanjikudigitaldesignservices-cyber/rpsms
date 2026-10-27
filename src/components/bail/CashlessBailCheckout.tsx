import React, { useState } from 'react';
import type { BailRecord, CashlessPayment, CustodyRecord, Officer } from '../../types';
import {
  CreditCard,
  AlertTriangle,
  Search,
  CheckCircle2,
  Printer,
  Smartphone,
  Send,
  Loader2,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';

interface CashlessBailCheckoutProps {
  bailRecords: BailRecord[];
  payments: CashlessPayment[];
  custodyRecords: CustodyRecord[];
  currentOfficer: Officer;
  onProcessPayment: (payment: CashlessPayment, updatedBail: BailRecord) => void;
  onRequestWaiver: (bailId: string, reason: string) => void;
  onCreateBailRecord: (newBail: BailRecord) => void;
}

export const CashlessBailCheckout: React.FC<CashlessBailCheckoutProps> = ({
  bailRecords,
  payments,
  custodyRecords,
  currentOfficer,
  onProcessPayment,
  onRequestWaiver,
  onCreateBailRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Checkout modal state
  const [checkoutBail, setCheckoutBail] = useState<BailRecord | null>(null);
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('+2547');
  const [gateway, setGateway] = useState<'INTASEND' | 'MPESA_DIRECT'>('INTASEND');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<CashlessPayment | null>(null);

  // Waiver modal state
  const [waiverBail, setWaiverBail] = useState<BailRecord | null>(null);
  const [waiverReason, setWaiverReason] = useState('');

  // New Bail Record modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustodyId, setSelectedCustodyId] = useState(custodyRecords[0]?.id || '');
  const [bailAmount, setBailAmount] = useState<number>(5000);
  const [bailType, setBailType] = useState<'POLICE_BAIL' | 'COURT_BAIL' | 'BOND'>('POLICE_BAIL');
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(false);

  // Receipt modal state
  const [viewReceipt, setViewReceipt] = useState<{
    bail: BailRecord;
    payment?: CashlessPayment;
  } | null>(null);

  // Filtered bail records
  const filteredBail = bailRecords.filter((b) => {
    const matchesSearch =
      b.detainee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.ob_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.receipt_number && b.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBail || !payerName.trim() || payerPhone.length < 10) return;

    setIsProcessing(true);

    // Simulate STK push and IntaSend payment webhook confirmation
    setTimeout(() => {
      const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
      const mpesaCode = `SLK${Math.floor(Math.random() * 9000000) + 1000000}`;
      const txnRef = `INTA-RPS-2026-${randomSuffix}`;
      const receiptNo = `RPS-BAIL-2026-${Math.floor(Math.random() * 900) + 100}`;
      const idempotencyKey = `idemp-${checkoutBail.id}-${Date.now()}`;

      const newPayment: CashlessPayment = {
        id: `pay-${Date.now()}`,
        bail_record_id: checkoutBail.id,
        station_id: checkoutBail.station_id,
        amount: checkoutBail.amount,
        payer_phone: payerPhone.trim(),
        payer_name: payerName.trim(),
        gateway,
        transaction_reference: txnRef,
        mpesa_receipt_number: mpesaCode,
        idempotency_key: idempotencyKey,
        payment_status: 'COMPLETED',
        official_account_dest: `PAYBILL-522123 (Account: OB ${checkoutBail.ob_number})`,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const updatedBail: BailRecord = {
        ...checkoutBail,
        status: 'PAID',
        receipt_number: receiptNo,
        paid_at: new Date().toISOString(),
      };

      onProcessPayment(newPayment, updatedBail);
      setIsProcessing(false);
      setPaymentSuccess(newPayment);
    }, 1800);
  };

  const handleWaiverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiverBail || !waiverReason.trim()) return;

    onRequestWaiver(waiverBail.id, waiverReason.trim());
    setWaiverBail(null);
    setWaiverReason('');
  };

  const handleCreateBailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const custody = custodyRecords.find((c) => c.id === selectedCustodyId);
    if (!custody || !noticeAcknowledged || bailAmount <= 0) return;

    const newRecord: BailRecord = {
      id: `bail-${Date.now()}`,
      custody_record_id: custody.id,
      station_id: custody.station_id,
      detainee_name: custody.person.full_name,
      ob_number: custody.ob_number,
      bail_type: bailType,
      amount: Number(bailAmount),
      is_free_bail_notice_acknowledged: true,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    onCreateBailRecord(newRecord);
    setIsCreateOpen(false);
    setNoticeAcknowledged(false);
  };

  return (
    <div className="space-y-6">
      {/* Statutory Zero-Desk-Cash Warning Banner */}
      <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-2 border-red-700/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded">
                  Anti-Corruption Notice
                </span>
                <span className="text-xs text-red-300 font-semibold">
                  Kenya Bail & Bond Policy Guidelines & Article 49(1)(h)
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1 tracking-tight">
                STRICT ZERO-CASH POLICY AT POLICE DESK
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Applying for police cash bail is <strong>FREE</strong>. Absolutely no officer is permitted to solicit or receive physical currency. All approved cash bails are paid directly via Government Paybill <strong>522123</strong> (IntaSend/M-Pesa) using the Occurrence Book (OB) number as account identifier.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0 text-center md:text-right w-full md:w-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Official Station Paybill
            </p>
            <p className="text-xl font-mono font-black text-emerald-400">
              522123
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Account: Detainee OB #
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search detainee, OB #, receipt..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Payment</option>
            <option value="PAID">Paid (Cashless)</option>
            <option value="WAIVER_REQUESTED">Waiver Under Review</option>
            <option value="WAIVED">Bail Waived (Indigent)</option>
          </select>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          Set Cash Bail Terms
        </button>
      </div>

      {/* Bail Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBail.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No bail records match your search query.
          </div>
        ) : (
          filteredBail.map((bail) => {
            const linkedPayment = payments.find((p) => p.bail_record_id === bail.id);

            return (
              <div
                key={bail.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                        OB {bail.ob_number}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1.5 leading-snug">
                        {bail.detainee_name}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        bail.status === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : bail.status === 'PENDING'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : bail.status === 'WAIVER_REQUESTED'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {bail.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Bail Details */}
                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Bail Category:</span>
                      <strong className="text-white">{bail.bail_type}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Assessed Amount:</span>
                      <strong className="text-lg font-mono font-black text-emerald-400">
                        KES {bail.amount.toLocaleString()}
                      </strong>
                    </div>
                    {bail.receipt_number && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-400">Receipt Ref:</span>
                        <span className="font-mono text-cyan-300 font-semibold">{bail.receipt_number}</span>
                      </div>
                    )}
                  </div>

                  {bail.waiver_reason && (
                    <div className="mt-2 p-2 bg-purple-950/30 border border-purple-900/40 rounded-lg text-[11px] text-purple-300">
                      <strong>Waiver Grounds:</strong> {bail.waiver_reason}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  {bail.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => {
                          setCheckoutBail(bail);
                          setPayerName('');
                          setPayerPhone('+2547');
                          setPaymentSuccess(null);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-1.5 transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Cashless Checkout
                      </button>

                      <button
                        onClick={() => setWaiverBail(bail)}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-purple-950/50 text-slate-300 hover:text-purple-300 border border-slate-700 hover:border-purple-800 rounded-xl text-xs font-semibold transition"
                        title="File Indigent Detainee Waiver Request"
                      >
                        Waiver
                      </button>
                    </>
                  )}

                  {bail.status === 'PAID' && (
                    <button
                      onClick={() => setViewReceipt({ bail, payment: linkedPayment })}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      View Official Electronic Receipt
                    </button>
                  )}

                  {bail.status === 'WAIVER_REQUESTED' && (
                    <div className="w-full py-2 bg-purple-950/40 border border-purple-800/40 text-purple-300 text-center rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Routing to OCS for Four-Eyes Waiver Approval
                    </div>
                  )}

                  {bail.status === 'WAIVED' && (
                    <div className="w-full py-2 bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-center rounded-xl text-xs font-semibold">
                      Bail Formally Waived by OCS
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cashless Checkout STK Push Modal */}
      {checkoutBail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Cashless Bail Collection
                </h3>
              </div>
              <button
                onClick={() => setCheckoutBail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">Payment Verified</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cashless bail of <strong>KES {paymentSuccess.amount.toLocaleString()}</strong> has been credited to Government Paybill <strong>522123</strong>.
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">M-Pesa Receipt:</span>
                    <span className="text-emerald-400 font-bold">{paymentSuccess.mpesa_receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IntaSend Ref:</span>
                    <span className="text-white">{paymentSuccess.transaction_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payer:</span>
                    <span className="text-slate-200">{paymentSuccess.payer_name}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setViewReceipt({ bail: checkoutBail, payment: paymentSuccess });
                      setCheckoutBail(null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Print Bail Receipt
                  </button>
                  <button
                    onClick={() => setCheckoutBail(null)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
                {/* Amount card */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cash Bail Assessed for {checkoutBail.detainee_name}
                  </span>
                  <span className="text-2xl font-mono font-black text-emerald-400 block mt-1">
                    KES {checkoutBail.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    Account: OB {checkoutBail.ob_number} • Destination: Paybill 522123
                  </span>
                </div>

                {/* Gateway selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Payment Gateway
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGateway('INTASEND')}
                      className={`p-3 rounded-xl border text-left transition ${
                        gateway === 'INTASEND'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">IntaSend M-Pesa</span>
                      <span className="text-[10px] opacity-75">Instant STK Push</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGateway('MPESA_DIRECT')}
                      className={`p-3 rounded-xl border text-left transition ${
                        gateway === 'MPESA_DIRECT'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Direct Paybill</span>
                      <span className="text-[10px] opacity-75">C2B Push Notification</span>
                    </button>
                  </div>
                </div>

                {/* Payer Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Payer / Depositor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Samuel M. Mwangi (Guarantor)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    M-Pesa Phone Number (+254...) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCheckoutBail(null)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Triggering STK Push...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Initiate Cashless STK Push
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bail Waiver Request Modal */}
      {waiverBail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Indigent Bail Waiver Request
                </h3>
              </div>
              <button
                onClick={() => setWaiverBail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWaiverSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-purple-950/40 border border-purple-900/60 text-purple-300 rounded-xl text-xs space-y-1">
                <p className="font-bold">CONSTITUTIONAL RIGHT TO REASONABLE BAIL:</p>
                <p className="text-[11px] text-purple-300/80">
                  Under Article 49(1)(h) of the Kenya Constitution and National Bail & Bond Policy Guidelines, inability to pay cash bail must not result in arbitrary prolonged detention. The OCS may waive bail on recognizance.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Grounds for Indigent Waiver *
                </label>
                <textarea
                  rows={4}
                  required
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  placeholder="e.g. Detainee is a destitute street vendor without close kin, suffering from chronic asthma requiring urgent medical care."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWaiverBail(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg shadow-purple-900/30 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit for OCS Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Cash Bail Terms Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Set Police Cash Bail Terms
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBailSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Detainee in Custody *
                </label>
                <select
                  value={selectedCustodyId}
                  onChange={(e) => setSelectedCustodyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {custodyRecords.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.person.full_name} (OB {c.ob_number} • Cell {c.cell_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Bail Type
                  </label>
                  <select
                    value={bailType}
                    onChange={(e) => setBailType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="POLICE_BAIL">Police Cash Bail</option>
                    <option value="COURT_BAIL">Court Cash Bail</option>
                    <option value="BOND">Personal Recognizance Bond</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Amount (KES) *
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={bailAmount}
                    onChange={(e) => setBailAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Free bail acknowledgment */}
              <label className="flex items-start gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={noticeAcknowledged}
                  onChange={(e) => setNoticeAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  <strong className="text-white block mb-0.5">Statutory Anti-Bribery Certification</strong>
                  I certify that the detainee and their sureties were informed that police bail application is free and that all deposits must route exclusively through cashless government Paybill 522123.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!noticeAcknowledged || bailAmount <= 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 transition disabled:opacity-40"
                >
                  Generate Bail Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Electronic Bail Receipt Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Official Police Cash Bail Receipt
                </h3>
              </div>
              <button
                onClick={() => setViewReceipt(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Body */}
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
                      National Police Service • Kenya
                    </p>
                    <p className="text-sm font-extrabold text-white print:text-black">
                      Rockport Police Station • Station Desk
                    </p>
                    <p className="text-[10px] text-slate-400 print:text-black">
                      Official Electronic Cashless Bail Voucher
                    </p>
                  </div>
                </div>
                <div className="mt-2 inline-block px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 print:border-black print:text-black print:bg-transparent rounded text-xs font-mono font-bold tracking-wider">
                  RECEIPT REF: {viewReceipt.bail.receipt_number || 'RPS-BAIL-VOUCHER'}
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="bg-slate-950/80 print:bg-gray-50 border border-slate-800 print:border-gray-300 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Detainee Name:</span>
                  <strong className="text-white print:text-black">{viewReceipt.bail.detainee_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Occurrence Book Number:</span>
                  <span className="font-mono font-bold text-amber-300 print:text-black">
                    OB {viewReceipt.bail.ob_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Bail Category:</span>
                  <span className="font-semibold text-slate-200 print:text-black">{viewReceipt.bail.bail_type}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 print:border-gray-300">
                  <span className="text-slate-400 print:text-black font-bold uppercase text-[11px]">
                    Amount Paid:
                  </span>
                  <span className="text-xl font-mono font-black text-emerald-400 print:text-black">
                    KES {viewReceipt.bail.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Settlement Information */}
              <div className="border border-slate-800 print:border-gray-300 rounded-xl p-4 text-xs space-y-2 bg-slate-950/40 print:bg-white">
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Payment Gateway:</span>
                  <span className="font-semibold text-white print:text-black">
                    {viewReceipt.payment?.gateway || 'INTASEND M-PESA'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">M-Pesa Trans. ID:</span>
                  <span className="font-mono font-bold text-cyan-300 print:text-black">
                    {viewReceipt.payment?.mpesa_receipt_number || 'SLK2918401'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Payer Details:</span>
                  <span className="text-slate-200 print:text-black">
                    {viewReceipt.payment?.payer_name || 'Surety / Guarantor'} ({viewReceipt.payment?.payer_phone || '+254722889900'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Account Destination:</span>
                  <span className="font-mono text-emerald-400 print:text-black text-[11px]">
                    PAYBILL 522123 (Treasury Account)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-black">Station Receiving Officer:</span>
                  <span className="text-slate-200 print:text-black">
                    {currentOfficer.rank} {currentOfficer.full_name} ({currentOfficer.service_number})
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 print:border-gray-300 rounded-xl text-[10px] text-slate-400 print:text-black text-center space-y-1">
                <p className="font-bold uppercase tracking-wider text-amber-400 print:text-black">
                  Refund & Discharge Guarantee
                </p>
                <p>
                  This cash bail deposit is fully refundable upon the accused person honoring all police and court appearance summons, or upon formal withdrawal of charges by the ODPP.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60 print:hidden">
              <button
                onClick={() => setViewReceipt(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
