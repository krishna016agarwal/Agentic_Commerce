import React, { useState } from 'react'
import { Database, Shield, Zap, AlertTriangle, Key, Layers, ArrowUpRight, CheckCircle2 } from 'lucide-react'

export default function InventoryLedger({
  products,
  user,
  onUpdateLimit,
  onRunTestScenario,
  geminiKey,
  setGeminiKey,
  razorpayKeyId,
  setRazorpayKeyId,
  razorpayKeySecret,
  setRazorpayKeySecret,
  isRefreshing
}) {
  const [sliderValue, setSliderValue] = useState(user ? user.daily_spend_limit / 100 : 50000)
  const [activeTab, setActiveTab] = useState('limits') // 'limits' | 'database' | 'keys'

  const currentLimit = user ? user.daily_spend_limit / 100 : 50000
  const accumulated = user ? user.daily_spend_accumulated / 100 : 0
  const remaining = Math.max(0, currentLimit - accumulated)
  const percentUsed = currentLimit > 0 ? Math.min(100, (accumulated / currentLimit) * 100) : 0

  const handleSliderChange = (e) => {
    const val = Number(e.target.value)
    setSliderValue(val)
  }

  const handleSliderCommit = () => {
    onUpdateLimit(sliderValue * 100) // Convert to paisa
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Policy & Safety Gateway Card */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">UAP Policy Engine</h2>
              <p className="text-[11px] text-slate-400">Deterministic Safety Ceiling</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ENFORCED
          </span>
        </div>

        {/* Daily Limit Slider */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Daily Spend Ceiling:</span>
            <span className="text-sm font-mono font-bold text-amber-300">
              ₹{sliderValue.toLocaleString('en-IN')}
            </span>
          </div>

          <input
            type="range"
            min="500"
            max="100000"
            step="500"
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>₹500 (Strict)</span>
            <span>₹50,000 (Standard)</span>
            <span>₹1,00,000 (VIP)</span>
          </div>

          {/* Spend progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Spent Today: ₹{accumulated.toLocaleString('en-IN')}</span>
              <span className="text-emerald-400 font-medium">Remaining: ₹{remaining.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={`h-full transition-all duration-500 ${
                  percentUsed > 90
                    ? 'bg-rose-500'
                    : percentUsed > 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Test Trigger Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={() => onRunTestScenario('under_limit')}
            className="flex flex-col items-start p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-left transition-all group"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mb-0.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Test Autonomous</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Under-limit item (₹1,500) • Auto-settles
            </span>
          </button>

          <button
            onClick={() => onRunTestScenario('over_limit')}
            className="flex flex-col items-start p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-left transition-all group"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 mb-0.5">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Test Escalation</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Over-limit item (₹45k) • Opens Modal
            </span>
          </button>
        </div>
      </div>

      {/* Live Inventory Ledger Card */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl flex-1 flex flex-col min-h-[320px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Live Inventory Ledger</h2>
              <p className="text-[11px] text-slate-400">SQLite WAL Concurrency Locks</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {products.length} Products
          </span>
        </div>

        {/* Database Table visualization */}
        <div className="mt-3 flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-2">
          {products.map((item) => (
            <div
              key={item.product_id}
              className="p-2.5 rounded-xl bg-[#12161f] border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between text-xs"
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-200 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span className="text-amber-400/90 font-bold">
                    ₹{(item.price_paisa / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    item.stock_qty > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {item.stock_qty > 0 ? `Stock: ${item.stock_qty}` : '0 (Sold Out)'}
                </span>
                {item.badge && (
                  <span className="text-[9px] text-slate-400 font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Key Credentials Status Card */}
      <div className="glass-panel rounded-2xl p-3 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            Gateway Credentials
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">CONNECTED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-[#12161f] p-1.5 rounded border border-slate-800 truncate">
            <span className="text-slate-500 block text-[9px]">RAZORPAY ID:</span>
            <span className="text-slate-300">{razorpayKeyId ? `${razorpayKeyId.slice(0, 10)}...` : 'rzp_test_...'}</span>
          </div>
          <div className="bg-[#12161f] p-1.5 rounded border border-slate-800 truncate">
            <span className="text-slate-500 block text-[9px]">GEMINI MODEL:</span>
            <span className="text-slate-300">gemini-1.5-flash</span>
          </div>
        </div>
      </div>
    </div>
  )
}
