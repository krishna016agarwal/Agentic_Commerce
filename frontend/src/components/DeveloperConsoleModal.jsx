import React, { useState } from 'react'
import { Terminal, Shield, Sparkles, RefreshCw, X, ChevronDown, ChevronUp, Filter, CheckCircle2, AlertTriangle, Zap, Lock } from 'lucide-react'

export default function DeveloperConsoleModal({
  isOpen,
  onClose,
  logs = [],
  onRefresh,
  isLoading
}) {
  const [filterTag, setFilterTag] = useState('ALL')
  const [expandedId, setExpandedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const getTagBadge = (tag = '') => {
    const t = tag.toUpperCase()
    if (t.includes('AUTONOMOUS')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    }
    if (t.includes('ESCALATION') || t.includes('ERROR') || t.includes('ALERT') || t.includes('OVER_LIMIT')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    }
    if (t.includes('RAZORPAY')) {
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    }
    if (t.includes('UAP') || t.includes('LIMIT') || t.includes('CEILING')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    }
    if (t.includes('STOCK') || t.includes('INVENTORY') || t.includes('LOCK')) {
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    }
    if (t.includes('IDEMPOTENCY')) {
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    }
    if (t.includes('PRODUCT') || t.includes('EXPLAIN') || t.includes('CATALOG')) {
      return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    }
    if (t.includes('UPSELL')) {
      return 'bg-pink-500/15 text-pink-400 border-pink-500/30'
    }
    if (t.includes('SWEEPER')) {
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    }
    if (t.includes('SIGNATURE') || t.includes('SETTLEMENT') || t.includes('SECURITY')) {
      return 'bg-teal-500/15 text-teal-400 border-teal-500/30'
    }
    return 'bg-slate-800 text-slate-300 border-slate-700'
  }

  const tags = ['ALL', 'UAP', 'IDEMPOTENCY', 'SWEEPER', 'STOCK', 'UPSELL', 'AUTONOMOUS', 'ESCALATION', 'RAZORPAY']

  const filteredLogs = logs.filter(log => {
    const matchesTag = filterTag === 'ALL' || (log.tag && log.tag.toUpperCase().includes(filterTag))
    const matchesQuery = searchQuery === '' ||
      (log.message && log.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.tag && log.tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesTag && matchesQuery
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn font-mono">
      <div className="w-full max-w-5xl h-[85vh] flex flex-col bg-[#0b0e14] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        {/* Top Terminal Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0e121a] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
                  Developer Systems Console Overlay
                </h3>
                <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Stream
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Audit Trail • SQLite WAL Lock Verifications • Razorpay API Signatures • Dynamic UAP Policy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh logs from /api/audit-trail"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-[#121620] flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
            {tags.map(t => (
              <button
                key={t}
                onClick={() => setFilterTag(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterTag === t
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#090d14] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Log Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 min-h-0 bg-[#080b10]">
          {filteredLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
              <Lock className="w-8 h-8 text-slate-600 mb-1" />
              <p className="text-xs font-semibold">No audit events match your filter.</p>
              <p className="text-[11px]">Perform an action in the store or chat to trigger gateway checks.</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isExpanded = expandedId === log.id
              let parsedMeta = null
              if (log.metadata_json) {
                try {
                  parsedMeta = JSON.parse(log.metadata_json)
                } catch {
                  parsedMeta = null
                }
              }

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[#0d1117] border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTagBadge(log.tag)}`}>
                        {log.tag}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        ID: #{log.id}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="text-slate-200 font-sans text-xs sm:text-sm leading-relaxed">
                    {log.message}
                  </p>

                  {parsedMeta && Object.keys(parsedMeta).length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="text-[10px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <span>{isExpanded ? '[-] Hide System Payload' : '[+] View Cryptographic Payload & Token'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-xl bg-[#06080e] border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
                          <pre>{JSON.stringify(parsedMeta, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0e121a] flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span>
            Displaying {filteredLogs.length} verified operations • Backend: FastAPI / SQLite WAL
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Overlay
          </button>
        </div>
      </div>
    </div>
  )
}
