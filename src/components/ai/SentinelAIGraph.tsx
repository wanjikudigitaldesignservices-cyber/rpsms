import React, { useState } from 'react';
import {
  Share2,
  Search,
  ExternalLink,
  Users,
  Smartphone,
  Truck,
  FileText,
  Crosshair,
  Sparkles,
  Info,
} from 'lucide-react';
import type { CaseRecord, OBEntry, Officer, SyndicateCluster, EntityLinkNode } from '../../types';

interface SentinelAIGraphProps {
  cases: CaseRecord[];
  obEntries: OBEntry[];
  currentOfficer: Officer;
  onNavigateToCase?: (caseId: string) => void;
}

const SEED_CLUSTERS: SyndicateCluster[] = [
  {
    id: 'syn-01',
    syndicateName: 'Kawangware Commercial Burglary Syndicate',
    modusOperandi: 'Overnight commercial go-down break-ins using hydraulic bolt-cutters and master lock-picks; disabling CCTV thumb drives',
    primaryArea: 'Industrial Area & Westlands Commercial Zones',
    casesCount: 3,
    linkedSuspectsCount: 3,
    confidenceScore: 89,
    threatLevel: 'TIER_1_CRITICAL',
    nodes: [
      { id: 'n-s1', label: 'Martin Kariuki Ndung\'u', type: 'SUSPECT', riskLevel: 'CRITICAL', metadata: { id_no: '28491022', alias: 'Njoro', role: 'Primary Breacher' } },
      { id: 'n-s2', label: 'Peter Gitau M.', type: 'SUSPECT', riskLevel: 'ELEVATED', metadata: { phone: '+254722889900', alias: 'Surety / Fence' } },
      { id: 'n-c1', label: 'RPS-001/CR/2026/0014', type: 'CASE', metadata: { offense: 'Burglary Sec 304', date: '27/10/2026' } },
      { id: 'n-c2', label: 'RPS-001/CR/2026/0008', type: 'CASE', metadata: { offense: 'Storehouse Breaking', date: '18/10/2026' } },
      { id: 'n-p1', label: '+254722889900', type: 'PHONE', metadata: { carrier: 'Safaricom', towers: 'Kawangware / Kangemi' } },
      { id: 'n-e1', label: 'Master Lock-Pick Set', type: 'EXHIBIT', metadata: { exhibit_no: 'RPS-001/EX/2026/0081' } },
      { id: 'n-v1', label: 'KCS 491L (White Hiace)', type: 'VEHICLE', metadata: { status: 'Suspected Getaway Van' } },
    ],
    edges: [
      { id: 'e1', source: 'n-s1', target: 'n-c1', relationship: 'Arrested Suspect', confidence: 0.98 },
      { id: 'e2', source: 'n-s1', target: 'n-e1', relationship: 'Recovered From Jacket', confidence: 0.99 },
      { id: 'e3', source: 'n-s1', target: 'n-p1', relationship: 'Frequent Calls (14 in 48h)', confidence: 0.92 },
      { id: 'e4', source: 'n-p1', target: 'n-s2', relationship: 'Registered Subscriber', confidence: 0.95 },
      { id: 'e5', source: 'n-s2', target: 'n-v1', relationship: 'Registered Owner on NTSA', confidence: 0.91 },
      { id: 'e6', source: 'n-v1', target: 'n-c2', relationship: 'CCTV Plate Match (87%)', confidence: 0.87 },
      { id: 'e7', source: 'n-c1', target: 'n-c2', relationship: 'Identical Modus Operandi', confidence: 0.89 },
    ],
  },
  {
    id: 'syn-02',
    syndicateName: 'Central Highway Cargo & Fuel Diversion Ring',
    modusOperandi: 'Tampering with cargo seals and freight diversion at highway stopovers; fake invoice delivery papers',
    primaryArea: 'Northern Bypass & Rockport Freight Terminal',
    casesCount: 2,
    linkedSuspectsCount: 2,
    confidenceScore: 94,
    threatLevel: 'TIER_2_ELEVATED',
    nodes: [
      { id: 'n-s3', label: 'James Waweru Njoroge', type: 'SUSPECT', riskLevel: 'ELEVATED', metadata: { alias: 'Wawa', role: 'Freight Driver' } },
      { id: 'n-c3', label: 'RPS-001/CR/2026/0015', type: 'CASE', metadata: { offense: 'Robbery with Violence Sec 296(2)' } },
      { id: 'n-e2', label: 'Imitation Ceska Pistol', type: 'EXHIBIT', metadata: { exhibit_no: 'RPS-001/EX/2026/0083' } },
      { id: 'n-l1', label: 'Industrial Area Go-downs', type: 'LOCATION', metadata: { zone: 'Sector 4' } },
    ],
    edges: [
      { id: 'e8', source: 'n-s3', target: 'n-c3', relationship: 'Principal Suspect', confidence: 0.96 },
      { id: 'e9', source: 'n-s3', target: 'n-e2', relationship: 'Possession at Scene', confidence: 0.98 },
      { id: 'e10', source: 'n-s3', target: 'n-l1', relationship: 'Surveillance Safehouse', confidence: 0.88 },
    ],
  },
];

export const SentinelAIGraph: React.FC<SentinelAIGraphProps> = ({
  cases: _cases,
  obEntries: _obEntries,
  currentOfficer,
  onNavigateToCase,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState(SEED_CLUSTERS[0].id);
  const [selectedNode, setSelectedNode] = useState<EntityLinkNode | null>(
    SEED_CLUSTERS[0].nodes[0]
  );
  const [searchQuery, setSearchQuery] = useState('');

  const cluster = SEED_CLUSTERS.find((c) => c.id === selectedClusterId) || SEED_CLUSTERS[0];

  const filteredNodes = cluster.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNodeIcon = (type: EntityLinkNode['type']) => {
    switch (type) {
      case 'SUSPECT':
        return Users;
      case 'PHONE':
        return Smartphone;
      case 'VEHICLE':
        return Truck;
      case 'EXHIBIT':
        return Crosshair;
      case 'LOCATION':
        return Info;
      case 'CASE':
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Palantir Style Header & HITL Mandate */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              SENTINEL // LINK INTELLIGENCE
            </span>
            <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px] font-mono">
              CORRELATION ENGINE
            </span>
          </div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight mt-0.5">
            Cross-Case Entity Linkage & Syndicate Detection
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Automated correlation across Occurrence Book entries, suspect biometrics, telecoms, and ballistic exhibits.
          </p>
        </div>

        {/* Human-in-the-loop Mandatory Certification Badge */}
        <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] font-mono space-y-1 shrink-0 max-w-xs">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>HUMAN-IN-THE-LOOP REQUIRED</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">
            AI suggestions do not constitute legal proof. Certified by officer: <strong>{currentOfficer.service_number}</strong>.
          </p>
        </div>
      </div>

      {/* Cluster Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SEED_CLUSTERS.map((cl) => {
          const isSelected = cl.id === selectedClusterId;
          return (
            <div
              key={cl.id}
              onClick={() => {
                setSelectedClusterId(cl.id);
                setSelectedNode(cl.nodes[0]);
              }}
              className={`p-3.5 rounded-md border cursor-pointer transition text-left space-y-2 ${
                isSelected
                  ? 'bg-zinc-900/90 border-zinc-600 text-zinc-100 shadow-md'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  CLUSTER ID: {cl.id}
                </span>
                <span className="font-mono text-xs text-emerald-400 font-semibold">
                  {cl.confidenceScore}% Correlation
                </span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-100">{cl.syndicateName}</h4>
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {cl.modusOperandi}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-zinc-500">
                <span>{cl.casesCount} Linked Cases</span>
                <span>•</span>
                <span>{cl.linkedSuspectsCount} Suspects</span>
                <span>•</span>
                <span className="text-zinc-400">{cl.primaryArea}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Graph Exploration Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Interactive Node Matrix / Link Topology */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800/80 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
                Entity Topology: {cluster.syndicateName}
              </h3>
            </div>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter nodes..."
                className="w-full pl-8 pr-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
          </div>

          {/* Nodes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredNodes.map((node) => {
              const Icon = getNodeIcon(node.type);
              const isNodeSelected = selectedNode?.id === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-md border cursor-pointer transition text-left flex items-start justify-between gap-2.5 ${
                    isNodeSelected
                      ? 'bg-zinc-900 border-zinc-500 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded border shrink-0 ${
                        node.riskLevel === 'CRITICAL'
                          ? 'bg-red-950/40 border-red-800 text-red-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {node.type}
                        </span>
                        {node.riskLevel === 'CRITICAL' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-zinc-100 truncate mt-0.5">
                        {node.label}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                        {Object.entries(node.metadata)[0]
                          ? `${Object.entries(node.metadata)[0][0]}: ${Object.entries(node.metadata)[0][1]}`
                          : 'Linked Entity'}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[9px] text-zinc-600 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800 shrink-0">
                    {node.id}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Cluster Relationship Edges */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Verified Links & Cross-Case Correlations ({cluster.edges.length})
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {cluster.edges.map((edge) => {
                const srcNode = cluster.nodes.find((n) => n.id === edge.source);
                const tgtNode = cluster.nodes.find((n) => n.id === edge.target);

                return (
                  <div
                    key={edge.id}
                    className="p-2 bg-zinc-900/60 border border-zinc-800/80 rounded flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-medium text-zinc-200 truncate">
                        {srcNode?.label || edge.source}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800">
                        {edge.relationship}
                      </span>
                      <span className="font-medium text-zinc-200 truncate">
                        {tgtNode?.label || edge.target}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold shrink-0 ml-2">
                      {Math.round(edge.confidence * 100)}% Match
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Selected Node Deep Dossier */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              SELECTED ENTITY DOSSIER
            </span>
            {selectedNode && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                {selectedNode.type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-100">{selectedNode.label}</h4>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">UID: {selectedNode.id}</p>
              </div>

              {/* Metadata Attributes Table */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-3 space-y-2 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                  Attribute Ledger
                </span>
                {Object.entries(selectedNode.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-0.5">
                    <span className="font-mono text-[11px] text-zinc-400 uppercase">{k}:</span>
                    <strong className="text-zinc-200 font-mono text-right">{v}</strong>
                  </div>
                ))}
              </div>

              {/* Related Connected Nodes */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                  Connected Network Ties
                </span>
                <div className="space-y-1.5">
                  {cluster.edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e) => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const other = cluster.nodes.find((n) => n.id === otherId);

                      return (
                        <div
                          key={e.id}
                          className="p-2 bg-zinc-900/40 border border-zinc-800 rounded text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="text-zinc-200 font-medium">{other?.label}</p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {e.relationship}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {Math.round(e.confidence * 100)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action if case node */}
              {selectedNode.type === 'CASE' && onNavigateToCase && (
                <button
                  onClick={() => onNavigateToCase(selectedNode.label)}
                  className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded-md shadow transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Case File Dossier
                </button>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">
              Select an entity node to inspect its cross-case connections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
