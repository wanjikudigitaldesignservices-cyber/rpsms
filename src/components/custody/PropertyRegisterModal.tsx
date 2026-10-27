import { useState } from 'react';
import { Package, X, Plus, Check } from 'lucide-react';
import type { PropertyItem, CustodyRecord, Officer } from '@/types';

interface PropertyRegisterModalProps {
  custodyRecord: CustodyRecord;
  propertyItems: PropertyItem[];
  activeOfficer: Officer;
  onClose: () => void;
  onAddPropertyItem: (newItem: PropertyItem) => void;
  onReturnPropertyItem: (itemId: string, unreturnedReason?: string) => void;
}

export function PropertyRegisterModal({
  custodyRecord,
  propertyItems,
  activeOfficer,
  onClose,
  onAddPropertyItem,
  onReturnPropertyItem,
}: PropertyRegisterModalProps) {
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<PropertyItem['category']>('CASH');
  const [condition, setCondition] = useState('Good condition, verified');
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const itemsForRecord = propertyItems.filter(
    (p) => p.custody_record_id === custodyRecord.id
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    const newItem: PropertyItem = {
      id: crypto.randomUUID(),
      custody_record_id: custodyRecord.id,
      item_description: desc.trim(),
      category,
      quantity: Number(qty) || 1,
      condition_at_booking: condition.trim(),
      booked_by_service_no: activeOfficer.service_number,
      status: 'HELD',
      prisoner_signature_captured: true,
      created_at: new Date().toISOString(),
    };

    onAddPropertyItem(newItem);
    setDesc('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Detainee Property Register</span>
                <span className="text-xs font-mono bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded">
                  {itemsForRecord.length} Items Logged
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Detainee: <strong className="text-slate-200">{custodyRecord.person.full_name}</strong> • Cell: {custodyRecord.cell_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Chain of custody for confiscated personal effects, cash, and valuables.
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{isAdding ? 'Cancel' : 'Add Property Item'}</span>
          </button>
        </div>

        {/* Add form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="CASH">CASH</option>
                  <option value="PHONE">PHONE / ELECTRONICS</option>
                  <option value="VALUABLES">VALUABLES / JEWELRY</option>
                  <option value="BELT_SHOELACES">BELT / SHOELACES</option>
                  <option value="MEDICATION">MEDICATION</option>
                  <option value="CLOTHING">CLOTHING</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KES 5,000 cash (5x 1000 notes)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Condition at Booking</label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 text-xs"
              >
                <Check className="h-4 w-4" />
                <span>Save to Property Safe</span>
              </button>
            </div>
          </form>
        )}

        {/* Property List Table */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
          {itemsForRecord.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No personal property currently registered for this detainee.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Condition</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {itemsForRecord.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="p-3 text-amber-400 font-bold">{item.category}</td>
                    <td className="p-3 text-slate-200 font-sans font-medium">{item.item_description}</td>
                    <td className="p-3 text-slate-400 font-sans">{item.condition_at_booking}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'HELD'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {item.status === 'HELD' ? (
                        <button
                          type="button"
                          onClick={() => onReturnPropertyItem(item.id)}
                          className="rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                        >
                          Mark Returned
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Returned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Close Register
          </button>
        </div>
      </div>
    </div>
  );
}
