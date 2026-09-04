import React, { useState } from 'react'
import {
  Search, ShoppingCart, MessageCircle, Package, Sliders,
  Terminal, X, ChevronDown, Sparkles
} from 'lucide-react'

export default function Navbar({
  cartCount = 0,
  onOpenCart,
  onToggleSettings,
  onToggleChat,
  isChatOpen,
  onToggleOrders,
  activeView,
  searchQuery = '',
  onSearchChange,
  onToggleLogs,
  user
}) {
  const [showPromoBanner, setShowPromoBanner] = useState(true)

  const remainingBudgetINR = user
    ? Math.max(0, Math.round((user.daily_spend_limit - user.daily_spend_accumulated) / 100)).toLocaleString('en-IN')
    : '50,000'

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 shadow-xs transition-all">
      {/* ── 1. Top Black Promo Announcement Bar (Exact from Screenshot 4) ── */}
      {showPromoBanner && (
        <div className="bg-black text-white text-[11px] sm:text-xs py-2 px-4 flex items-center justify-between relative">
          <div className="flex-1 text-center font-sans tracking-tight">
            <span>Sign up and get 20% off to your first order. </span>
            <a
              href="#catalog"
              className="font-semibold underline hover:text-gray-300 transition-colors ml-1 cursor-pointer"
            >
              Sign Up Now
            </a>
          </div>
          <button
            onClick={() => setShowPromoBanner(false)}
            title="Dismiss Announcement"
            className="text-gray-400 hover:text-white transition-colors ml-2 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Main Navigation Bar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6 lg:gap-8 flex-shrink-0">
          <button
            onClick={() => {
              if (activeView !== 'store') onToggleOrders()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="text-2xl sm:text-3xl font-black tracking-tighter text-black font-heading hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            SHOP.CO
          </button>
        </div>

        {/* Right: Integrated Functional Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Autonomous Budget indicator pill */}
          <div
            title="Current UAP Daily Autonomous Budget"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-500 font-normal">Budget:</span>
            <span className="font-mono font-bold text-emerald-700">₹{remainingBudgetINR}</span>
          </div>

          {/* 📦 My Orders Button */}
          <button
            id="btn-my-orders"
            onClick={onToggleOrders}
            title="View Order History & Razorpay Receipts"
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeView === 'orders'
                ? 'bg-black text-white shadow-sm ring-2 ring-black/20'
                : 'bg-[#F0F0F0] text-gray-800 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">📦 Orders</span>
          </button>

          {/* ⚙️ Settings & Daily Limit Button */}
          <button
            id="btn-settings"
            onClick={onToggleSettings}
            title="Configure Dynamic Spending Limit and Safety Policies"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-[#F0F0F0] hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">⚙️ Settings</span>
          </button>

          {/* 📜 Developer Logs Console Button */}
          <button
            id="btn-dev-logs"
            onClick={onToggleLogs}
            title="Open Developer Systems Console Overlay (Audit Trail)"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-[#F0F0F0] hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden md:inline">📜 Logs</span>
          </button>

          {/* 💬 Chat with Agent CTA Button */}
          <button
            id="btn-toggle-chat"
            onClick={onToggleChat}
            title="Open AI Shopping Concierge Drawer"
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-extrabold transition-all shadow-sm cursor-pointer ${
              isChatOpen
                ? 'bg-black text-white ring-2 ring-black/40 scale-98'
                : 'bg-black text-white hover:bg-neutral-800 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span>💬 Chat with Agent</span>
          </button>

          {/* 🛒 Cart Button */}
          <button
            id="btn-open-cart"
            onClick={onOpenCart}
            title="View Cart"
            className="relative p-2.5 sm:p-3 rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-black"
          >
            <ShoppingCart className="w-5 h-5 text-gray-900" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
