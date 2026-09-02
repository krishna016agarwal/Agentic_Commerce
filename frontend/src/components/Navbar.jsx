import React from 'react'
import { ShoppingBag, Sparkles, Sliders, RefreshCw, MessageCircle, Package } from 'lucide-react'

export default function Navbar({
  user,
  cartCount,
  onOpenCart,
  onResetDb,
  onToggleSettings,
  onToggleChat,
  isChatOpen,
  onToggleOrders,
  activeView
}) {
  const remainingInr = user
    ? ((user.daily_spend_limit - user.daily_spend_accumulated) / 100).toLocaleString('en-IN')
    : '0'
  const limitInr = user ? (user.daily_spend_limit / 100).toLocaleString('en-IN') : '0'

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0b0f17]/90 border-b border-white/10">
      {/* Luxury Announcement Bar */}
      <div className="bg-gradient-to-r from-[#0c2340] via-[#1a365d] to-[#0c2340] py-1.5 px-4 text-xs font-medium text-slate-200 border-b border-blue-500/20 text-center flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-blue-400/30">
          <Sparkles className="w-3 h-3 text-amber-300" />
          RAZORPAY M2M AGENTIC COMMERCE
        </span>
        <span className="hidden md:inline text-slate-300">
          Autonomous Settlement for Under-Limit • Instant Human Escalation via Razorpay Modal for Over-Limit
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#c5a880] to-[#dfc79b] p-0.5 flex items-center justify-center shadow-lg shadow-amber-900/20">
            <div className="w-full h-full rounded-full bg-[#0e1117] flex items-center justify-center text-[#dfc79b] font-serif font-bold text-lg">
              Ω
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif tracking-widest text-lg font-bold text-slate-100 uppercase">
                MODESTWEAR <span className="font-sans font-normal text-xs text-amber-400/90">&</span> ATELIER
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                AGENT LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans tracking-wide">
              Deterministic Safety Gateway • Razorpay Testnet
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Autonomous Budget Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#161b22] border border-slate-700/60 rounded-full px-3 py-1.5 text-xs shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Budget:</span>
            <span className="font-mono font-bold text-emerald-400">₹{remainingInr}</span>
            <span className="text-slate-500 text-[10px]">/ ₹{limitInr}</span>
          </div>

          {/* My Orders Button */}
          <button
            id="btn-my-orders"
            onClick={onToggleOrders}
            title="My Orders"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              activeView === 'orders'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-900/20'
                : 'bg-[#161b22] hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden md:inline">My Orders</span>
          </button>

          {/* Reset DB */}
          <button
            onClick={onResetDb}
            title="Reset Database & Stock"
            className="p-2 rounded-lg bg-[#161b22] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onToggleSettings}
            title="Configure API Keys & Safety Ceilings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Safety Controls</span>
          </button>

          {/* 💬 Chat with Agent Button */}
          <button
            id="btn-toggle-chat"
            onClick={onToggleChat}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-md hover:scale-105 ${
              isChatOpen
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-900/30 ring-2 ring-blue-500/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-900/30'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Chat with Agent</span>
          </button>

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-900/30 transition-all hover:scale-105"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="bg-white text-amber-900 text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
