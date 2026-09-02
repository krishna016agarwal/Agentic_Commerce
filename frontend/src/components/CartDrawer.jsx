import React from 'react'
import { X, Trash2, Plus, Minus, ShoppingCart, Tag, Zap, Shield, Sparkles, ChevronRight } from 'lucide-react'

export default function CartDrawer({
  isOpen, onClose, items, onUpdateQty, onRemoveItem,
  onApplyUpsell, upsellOffer, discountCode, setDiscountCode,
  onInitiateCheckout, user, isProcessing
}) {
  const cartTotal = items.reduce((a, it) => a + it.price_paisa * it.qty, 0)
  const discountAmt = 0 // Applied on backend
  const finalTotal = Math.max(0, cartTotal - discountAmt)
  const remainingLimit = user ? Math.max(0, user.daily_spend_limit - user.daily_spend_accumulated) : 5000000
  const isUnderLimit = finalTotal <= remainingLimit
  const cartCount = items.reduce((a, it) => a + it.qty, 0)

  if (!isOpen) return null

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-96 animate-slideInRight"
        style={{ background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" style={{ color: '#f0c04a' }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Cart
              {cartCount > 0 && <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({cartCount} items)</span>}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="text-5xl">🛒</div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Your cart is empty</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add products from the store or ask the AI agent</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product_id} className="flex gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                {item.image_url && (
                  <img src={item.image_url} alt={item.name}
                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </p>
                  <p className="text-xs mt-1 font-bold" style={{ color: '#f0c04a' }}>
                    ₹{(item.price_paisa / 100).toLocaleString('en-IN')}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 rounded-lg" style={{ border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                      <button onClick={() => onUpdateQty(item.product_id, item.qty - 1)} className="p-1.5 hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold px-2" style={{ color: 'var(--text-primary)', minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => onUpdateQty(item.product_id, item.qty + 1)} className="p-1.5 hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => onRemoveItem(item.product_id)} className="p-1.5 rounded-lg transition-colors text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Upsell offer */}
          {upsellOffer && (
            <div className="rounded-xl p-3 animate-bounceIn" style={{ background: 'rgba(240,192,74,0.08)', border: '1px solid rgba(240,192,74,0.25)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#f0c04a' }} />
                <p className="text-xs font-bold" style={{ color: '#f0c04a' }}>Bundle Deal</p>
              </div>
              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{upsellOffer.seller_pitch}</p>
              <button
                onClick={() => onApplyUpsell(upsellOffer)}
                className="btn-gold w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
              >
                <Tag className="w-3 h-3" />
                Add + Apply {upsellOffer.discount_code}
              </button>
            </div>
          )}
        </div>

        {/* Discount code */}
        {items.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Discount code"
                value={discountCode}
                onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                className="input-dark text-xs flex-1"
              />
              <button className="px-3 py-2 rounded-xl text-xs font-semibold btn-ghost">Apply</button>
            </div>
          </div>
        )}

        {/* Summary + Checkout */}
        {items.length > 0 && (
          <div className="px-5 pb-5 space-y-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>₹{(cartTotal / 100).toLocaleString('en-IN')}</span>
              </div>
              {discountCode && (
                <div className="flex justify-between text-emerald-400">
                  <span>{discountCode} applied</span>
                  <span>− applied at checkout</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                <span>Total</span>
                <span style={{ color: '#f0c04a' }}>₹{(cartTotal / 100).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Limit indicator */}
            <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${isUnderLimit ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}
              style={{ border: `1px solid ${isUnderLimit ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
              {isUnderLimit
                ? <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                : <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              }
              <span style={{ color: isUnderLimit ? '#34d399' : '#fbbf24' }}>
                {isUnderLimit
                  ? '⚡ Under limit — AI will settle autonomously'
                  : '🛡️ Over limit — Razorpay popup will open'
                }
              </span>
            </div>

            <button
              onClick={onInitiateCheckout}
              disabled={isProcessing}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''} btn-gold`}
            >
              {isProcessing
                ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin-slow" />Processing...</>
                : <>{isUnderLimit ? <Zap className="w-4 h-4" /> : <Shield className="w-4 h-4" />} Checkout</>
              }
            </button>
          </div>
        )}
      </div>
    </>
  )
}
