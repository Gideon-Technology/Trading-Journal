'use client';

import { useState, useMemo } from 'react';
import { useJournalStore } from '../../lib/store';
import type { AuditSeverity } from '@forex-journal/shared';

const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  INFO: 'text-blue-400 bg-blue-500/10',
  WARNING: 'text-yellow-400 bg-yellow-500/10',
  ERROR: 'text-orange-400 bg-orange-500/10',
  CRITICAL: 'text-red-400 bg-red-500/10',
};

export default function AuditLogPage() {
  const { auditLogs } = useJournalStore();
  const [severity, setSeverity] = useState<'ALL' | AuditSeverity>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...auditLogs];
    if (severity !== 'ALL') list = list.filter(l => l.severity === severity);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => l.message.toLowerCase().includes(q) || l.action.toLowerCase().includes(q));
    }
    return list;
  }, [auditLogs, severity, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Audit Log</h1>
      <p className="text-zinc-400 text-sm mb-6">{auditLogs.length} events recorded</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              severity === s ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {s}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p>No audit events yet.</p>
          <p className="text-sm mt-1">Events are recorded automatically as you use the automation features.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(log => (
            <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-start gap-4">
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold shrink-0 ${SEVERITY_STYLES[log.severity]}`}>
                {log.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{log.message}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{log.action} {log.entityType ? `· ${log.entityType}` : ''}</p>
              </div>
              <span className="text-zinc-600 text-xs shrink-0 font-mono">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
