import React from 'react'
import { X, Trash2, Plus, Minus, ShoppingBag, Tag, Zap, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react'

export default function CartDrawer({
  isOpen, onClose, items, onUpdateQty, onRemoveItem,
  onApplyUpsell, upsellOffer, discountCode, setDiscountCode,
  onInitiateCheckout, user, isProcessing
}) {
  const cartTotal = items.reduce((a, it) => a + it.price_paisa * it.qty, 0)
  const remainingLimit = user ? Math.max(0, user.daily_spend_limit - user.daily_spend_accumulated) : 5000000
  const isUnderLimit = cartTotal <= remainingLimit
  const cartCount = items.reduce((a, it) => a + it.qty, 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      {/* Cart Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[420px] bg-white text-gray-900 shadow-2xl border-l border-gray-200 animate-slideInRight">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-black" />
            <h2 className="text-lg font-black font-heading tracking-tight text-black">
              YOUR CART
              {cartCount > 0 && <span className="ml-2 text-xs font-semibold text-gray-400">({cartCount})</span>}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">
                🛒
              </div>
              <p className="font-bold text-base text-gray-900 font-heading">Your cart is empty</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Add clothing or accessories from our catalog, or ask our AI concierge to recommend items for you.
              </p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.product_id}
                className="flex gap-3.5 p-3.5 rounded-2xl bg-[#F0F0F0]/50 border border-gray-100 hover:border-gray-200 transition-all"
              >
                <div className="w-16 h-16 rounded-xl bg-[#F0EEED] p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={item.image_url || '/assets/omega-watch.png'}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    onError={e => { e.target.src = '/assets/omega-watch.png' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                    {item.name}
                  </p>
                  <p className="text-xs font-black font-heading text-black mt-1">
                    ₹{(item.price_paisa / 100).toLocaleString('en-IN')}
                  </p>

                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1 rounded-full bg-white border border-gray-200 px-1 py-0.5">
                      <button
                        onClick={() => onUpdateQty(item.product_id, item.qty - 1)}
                        className="p-1 hover:text-black text-gray-400 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-2 text-gray-900 min-w-5 text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.product_id, item.qty + 1)}
                        className="p-1 hover:text-black text-gray-400 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product_id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Upsell Deal Banner */}
          {upsellOffer && (
            <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 text-amber-900 animate-fadeIn space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-extrabold uppercase tracking-wide">Bundle Offer</p>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {upsellOffer.seller_pitch}
              </p>
              <button
                onClick={() => onApplyUpsell(upsellOffer)}
                className="w-full py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Add Deal ({upsellOffer.discount_code})</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/60 space-y-4 flex-shrink-0">
            {/* Promo code input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Add promo code"
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-mono uppercase focus:outline-none focus:border-black"
                />
              </div>
              {discountCode && (
                <button
                  onClick={() => setDiscountCode('')}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Price Row */}
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold font-heading text-black text-sm">
                  ₹{(cartTotal / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span className="text-emerald-600 font-bold">Free</span>
              </div>
            </div>

            {/* Execution Policy Indicator */}
            <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-xs">
              {isUnderLimit ? (
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Autonomous Settle Eligible (₹{(cartTotal / 100).toLocaleString('en-IN')} ≤ limit)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Exceeds limit. Razorpay modal triggers for approval.</span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <button
              onClick={onInitiateCheckout}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-full bg-black text-white hover:bg-neutral-800 font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isProcessing ? 'Processing Transaction...' : isUnderLimit ? 'Authorize Autonomously' : 'Checkout with Razorpay'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
