import React, { useState } from 'react'
import { Terminal, Shield, Sparkles, ChevronDown, ChevronUp, RefreshCw, Layers } from 'lucide-react'

export default function VisualAuditTrail({
  logs,
  onRefresh,
  isLoading
}) {
  const [expandedId, setExpandedId] = useState(null)

  const getTagColor = (tag) => {
    if (tag.includes('AUTONOMOUS')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    if (tag.includes('ESCALATION') || tag.includes('ERROR') || tag.includes('ALERT')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    if (tag.includes('RAZORPAY')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    if (tag.includes('UAP') || tag.includes('CEILING')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    if (tag.includes('STOCK')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    if (tag.includes('SIGNATURE') || tag.includes('SETTLEMENT')) return 'bg-teal-500/15 text-teal-400 border-teal-500/30'
    if (tag.includes('IDEMPOTENCY')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    return 'bg-slate-700/30 text-slate-300 border-slate-700'
  }

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-2xl flex flex-col h-full min-h-[580px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Live Visual Audit Trail</h3>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-400">STREAMING</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Chronological Security & Financial Operations Log</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Terminal Content Area */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-1">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6 text-slate-500 text-[11px]">
            No audit events recorded yet. Perform actions to see gateway decisions.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedId === log.id
            let parsedMeta = null
            if (log.metadata_json) {
              try {
                parsedMeta = JSON.parse(log.metadata_json)
              } catch (e) {
                parsedMeta = null
              }
            }

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-[#090d14] border border-slate-800/90 hover:border-slate-700 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTagColor(log.tag)}`}>
                    {log.tag}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {log.timestamp ? log.timestamp.split(' ')[1] || log.timestamp : ''}
                  </span>
                </div>

                <p className="text-slate-300 text-[11px] font-sans leading-snug">
                  {log.message}
                </p>

                {parsedMeta && Object.keys(parsedMeta).length > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="text-[10px] text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      <span>{isExpanded ? 'Hide Payload' : 'View Gateway Metadata'}</span>
                      {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>

                    {isExpanded && (
                      <pre className="mt-1.5 p-2 rounded-lg bg-[#06080e] border border-slate-800 text-[10px] text-slate-400 overflow-x-auto">
                        {JSON.stringify(parsedMeta, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Terminal Footer Indicator */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>SQLite WAL Ledger: agentic_commerce.db</span>
        <span>Auto-Sync: 1.5s</span>
      </div>
    </div>
  )
}
