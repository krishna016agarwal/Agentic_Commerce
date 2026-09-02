import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Send, ShoppingCart, Sparkles, Zap, ShieldCheck, RefreshCw,
  CheckCircle2, CreditCard
} from 'lucide-react'

// ── Interactive Product Card inside Chat Bubble ───────────────────────────────
function ChatProductCard({ product, onAddToCart }) {
  const priceINR = (product.price_paisa / 100).toLocaleString('en-IN')
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    if (!product.in_stock) return
    onAddToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col bg-[#121620] border border-slate-700/80 hover:border-amber-500/50 transition-all shadow-lg hover:shadow-amber-900/20 hover:scale-[1.01] group"
    >
      <div className="w-full h-40 flex-shrink-0 bg-[#090d14] flex items-center justify-center p-3 border-b border-slate-800">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = '/assets/omega-watch.png' }}
        />
      </div>

      <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {product.category}
            </span>
            {product.in_stock ? (
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                Stock: {product.stock_qty}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-rose-400 font-semibold">
                Sold Out
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2">
            {product.name}
          </p>
          <p className="text-sm font-mono font-bold text-amber-400 mt-1.5">
            {String.fromCharCode(8377)}{priceINR}
          </p>
        </div>

        <button
          onClick={handleAdd}
          disabled={!product.in_stock}
          className={`mt-3 text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 justify-center transition-all ${
            added
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : product.in_stock
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {added ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{product.in_stock ? 'Add to Cart' : 'Out of Stock'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Format text with bold **markers** ────────────────────────────────────────
function FormattedText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-amber-300 font-semibold">{part.slice(2, -2)}</strong>
        }
        return part
      })}
    </span>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onAddToCart, onRetryPayment }) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 animate-fadeIn">
        <div className="max-w-[85%]">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl rounded-br-sm text-xs sm:text-sm shadow-md leading-relaxed">
            {msg.text}
          </div>
          <p className="text-right text-[10px] text-slate-500 mt-1 font-mono">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 animate-fadeIn">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-sm flex-shrink-0 shadow-md mt-0.5">
        {String.fromCharCode(937)}
      </div>

      <div className="flex flex-col gap-2.5 flex-1 min-w-0 max-w-3xl">
        {msg.text && (
          <div className="bg-[#141923] border border-slate-800 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200 leading-relaxed shadow-md">
            <p className="whitespace-pre-wrap"><FormattedText text={msg.text} /></p>
          </div>
        )}

        {msg.products && msg.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
            {msg.products.map(p => (
              <ChatProductCard key={p.product_id} product={p} onAddToCart={onAddToCart} />
            ))}
          </div>
        )}

        {msg.checkoutResult && msg.checkoutResult.flow === 'AUTONOMOUS' && (
          <div className="rounded-2xl p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Order Booked Autonomously!</span>
            </div>
            <p className="text-xs text-slate-300">
              Your purchase has been settled in the background with zero manual intervention.
            </p>
            <div className="p-2 rounded-xl bg-[#090d14] border border-emerald-500/20 font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Transaction ID:</span>
                <span className="text-slate-200 font-bold">{msg.checkoutResult.transaction_id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount Settled:</span>
                <span className="text-emerald-400 font-bold">
                  {String.fromCharCode(8377)}{((msg.checkoutResult.amount_paisa || 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {msg.checkoutResult && msg.checkoutResult.flow === 'HUMAN_OVERRIDE' && (
          <div className="rounded-2xl p-4 bg-amber-950/40 border border-amber-500/40 text-amber-100 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Escalating to Human for Manual Approval</span>
            </div>
            <p className="text-xs text-slate-300">
              This order exceeds your daily autonomous spending limit. Launching Razorpay payment window.
            </p>
            {onRetryPayment && (
              <button
                onClick={() => onRetryPayment(msg.checkoutResult)}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:from-amber-500 hover:to-amber-600"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Re-open Razorpay Payment Window</span>
              </button>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-500 font-mono">{time} • Atelier Shopping Assistant</p>
      </div>
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 animate-fadeIn">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xs flex-shrink-0 shadow-md">
        {String.fromCharCode(937)}
      </div>
      <div className="bg-[#141923] border border-slate-800 p-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-md">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  "Explain the Omega watch",
  "Add Omega watch to cart",
  "Remove Omega watch from cart",
  "I want to buy a laptop",
  "Show luxury watches",
  "placed the order"
]

const GREETING_MSG = `Hi! I am your AI Shopping Concierge for Atelier.

I know every product in our luxury catalog and can:
- Show products: just ask "show watches" or "I want a laptop"
- Explain items: "tell me about the Omega watch"
- Add to cart: "add the Omega watch to cart" or "add this to cart"
- Remove from cart: "remove the Omega watch from cart"
- Place orders: "place the order" or "make payment"
- Answer questions about specs, pricing, and availability

What can I help you discover today?`

// ── Main Sliding ChatPanel Component ─────────────────────────────────────────
export default function ChatPanel({
  isOpen,
  onClose,
  cart,
  discountCode,
  onAddToCart,
  onRemoveFromCart,
  user,
  geminiKey,
  razorpayKeyId,
  razorpayKeySecret,
  onOrderPlaced,
  onEscalateToRazorpay,
  onFetchData,
  showToast,
  userRemainingLimit,
  initialQuery,
  onClearInitialQuery
}) {
  // Provide defaults here to avoid undefined issues
  const safeCart = cart || []
  const safeDiscountCode = discountCode || ''
  const safeRazorpayKeyId = razorpayKeyId || 'rzp_test_TWl4eo89k3aLud'
  const safeRazorpayKeySecret = razorpayKeySecret || 'TnA2AVvCQ5Ys6gdmVHHYLJ72'

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Use a ref so sendMessage always reads fresh isTyping without stale closures
  const isTypingRef = useRef(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)
  const initialQueryFiredRef = useRef(false)

  // Helper to set both state and ref
  const setTypingState = useCallback((val) => {
    isTypingRef.current = val
    setIsTyping(val)
  }, [])

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Show greeting on first open
  useEffect(() => {
    if (isOpen && !initialized) {
      setInitialized(true)
      setMessages([{
        id: Date.now(),
        role: 'ai',
        text: GREETING_MSG,
        products: [],
        ts: new Date().toISOString()
      }])
    }
  }, [isOpen, initialized])

  // ── Core network call ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text, cartSnapshot) => {
    if (!text || !text.trim()) return
    // Guard: do not send while already waiting for a response
    if (isTypingRef.current) return

    const trimmed = text.trim()
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      text: trimmed,
      products: [],
      ts: new Date().toISOString()
    }])
    setTypingState(true)

    try {
      const body = {
        user_id: (user && user.user_id) ? user.user_id : 'user_01',
        message: trimmed,
        gemini_api_key: geminiKey || null,
        cart: (cartSnapshot || []).map(it => ({
          product_id: it.product_id,
          qty: it.qty,
          price_paisa: it.price_paisa,
          name: it.name || '',
          image_url: it.image_url || ''
        })),
        discount_code: safeDiscountCode || null,
        razorpay_key_id: safeRazorpayKeyId,
        razorpay_key_secret: safeRazorpayKeySecret
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      let data
      if (!res.ok) {
        let detail = 'Shopping assistant is temporarily unavailable.'
        try { detail = (await res.json()).detail || detail } catch (_) {}
        throw new Error(detail)
      }
      data = await res.json()

      setTypingState(false)

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: data.message || 'I did not get a response. Please try again.',
        products: data.recommended_products || [],
        checkoutResult: data.checkout_result || null,
        ts: new Date().toISOString()
      }])

      // ── Cart Action: Add / Remove via chat command ──────────────────────────
      if (data.cart_action && data.cart_action.action) {
        const { action, product } = data.cart_action
        if (action === 'ADD' && product && onAddToCart) {
          onAddToCart(product)
          if (showToast) showToast('success', '🛒 Added to Cart', `${product.name} has been added to your cart.`)
        } else if (action === 'REMOVE' && data.cart_action.product_id && onRemoveFromCart) {
          onRemoveFromCart(data.cart_action.product_id)
          if (showToast) showToast('info', '🗑️ Removed from Cart', product ? `${product.name} has been removed.` : 'Item removed from cart.')
        }
      }

      // Autonomous order completed
      if (data.checkout_result && data.checkout_result.flow === 'AUTONOMOUS' && data.checkout_result.status === 'SUCCESS') {
        if (onOrderPlaced) onOrderPlaced(data.checkout_result.transaction_id, 'AUTONOMOUS')
        if (onFetchData) onFetchData()
      }

      // Human escalation required
      if (data.checkout_result && data.checkout_result.flow === 'HUMAN_OVERRIDE') {
        if (onEscalateToRazorpay) {
          onEscalateToRazorpay(data.checkout_result)
        }
      }

    } catch (err) {
      setTypingState(false)
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ai',
        text: 'Sorry, I ran into an issue: ' + err.message + '. Please try again.',
        products: [],
        ts: new Date().toISOString()
      }])
    }
  }, [user, geminiKey, safeDiscountCode, safeRazorpayKeyId, safeRazorpayKeySecret, onOrderPlaced, onEscalateToRazorpay, onFetchData, setTypingState])

  // ── Handle initial query from storefront ──────────────────────────────────
  useEffect(() => {
    if (isOpen && initialQuery && initialized && !initialQueryFiredRef.current) {
      initialQueryFiredRef.current = true
      if (onClearInitialQuery) onClearInitialQuery()
      // Delay slightly so greeting renders first
      const t = setTimeout(() => sendMessage(initialQuery, safeCart), 150)
      return () => clearTimeout(t)
    }
  }, [isOpen, initialQuery, initialized, safeCart, sendMessage, onClearInitialQuery])

  // Reset fired flag when a fresh initialQuery comes in
  useEffect(() => {
    if (initialQuery) {
      initialQueryFiredRef.current = false
    }
  }, [initialQuery])

  // ── Handle send from UI ────────────────────────────────────────────────────
  const handleSend = useCallback((customText) => {
    const text = (customText !== undefined && customText !== null) ? customText : input
    if (!text || !text.trim()) return
    // Clear input field only when sending user-typed text
    if (customText === undefined || customText === null) setInput('')
    sendMessage(text, safeCart)
  }, [input, safeCart, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    try { await fetch('/api/memory/clear?user_id=user_01', { method: 'DELETE' }) } catch (_) {}
    setTypingState(false)
    setMessages([{
      id: Date.now(),
      role: 'ai',
      text: 'Chat memory cleared! How can I help you discover our luxury catalog today?',
      products: [],
      ts: new Date().toISOString()
    }])
  }

  // ── Razorpay manual checkout ───────────────────────────────────────────────
  const triggerRazorpayCheckout = useCallback((checkoutData) => {
    if (typeof window.Razorpay === 'undefined') {
      if (showToast) showToast('error', 'Razorpay Not Loaded', 'Please check your internet connection.')
      return
    }
    const rzp = new window.Razorpay({
      key: checkoutData.razorpay_key_id || safeRazorpayKeyId,
      amount: checkoutData.amount_paisa || checkoutData.final_amount_paisa,
      currency: 'INR',
      name: 'Atelier Luxury Commerce',
      description: 'Manual Authorization for ' + checkoutData.transaction_id,
      image: '/assets/omega-watch.png',
      order_id: checkoutData.razorpay_order_id,
      handler: async (response) => {
        try {
          const confirmRes = await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_id: checkoutData.transaction_id,
              token: checkoutData.token,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              razorpay_key_secret: safeRazorpayKeySecret
            })
          })
          if (!confirmRes.ok) {
            const err = await confirmRes.json()
            throw new Error(err.detail || 'Payment verification failed.')
          }
          if (onOrderPlaced) onOrderPlaced(checkoutData.transaction_id, 'HUMAN_OVERRIDE')
          if (onFetchData) onFetchData()
          setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'ai',
            text: 'Payment verified! Order booked. Your order is logged in My Orders. (Payment ID: ' + response.razorpay_payment_id + ')',
            products: [],
            checkoutResult: { flow: 'AUTONOMOUS', transaction_id: checkoutData.transaction_id, amount_paisa: checkoutData.amount_paisa || checkoutData.final_amount_paisa },
            ts: new Date().toISOString()
          }])
        } catch (err) {
          if (showToast) showToast('error', 'Verification Failed', err.message)
        }
      },
      prefill: { name: (user && user.name) || 'Sri Krishna', email: 'shopper@atelier.ai', contact: '9999999999' },
      theme: { color: '#c5a880' },
      modal: { ondismiss: () => { if (showToast) showToast('info', 'Payment Dismissed', 'Razorpay checkout was dismissed.') } }
    })
    rzp.on('payment.failed', resp => {
      if (showToast) showToast('error', 'Payment Failed', resp.error.description || 'Payment could not be processed.')
    })
    rzp.open()
  }, [safeRazorpayKeyId, safeRazorpayKeySecret, user, onOrderPlaced, onFetchData, showToast])

  const cartTotal = safeCart.reduce((a, it) => a + it.price_paisa * it.qty, 0)
  const cartCount = safeCart.reduce((a, it) => a + it.qty, 0)

  if (!isOpen) return null

  return (
    <>
      {/* Full-Screen Chat Overlay */}
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0d1117] animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#121620] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#c5a880] to-[#dfc79b] p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full rounded-2xl bg-[#0e1117] flex items-center justify-center text-[#dfc79b] font-serif font-bold text-base">
                {String.fromCharCode(937)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-serif font-bold text-slate-100">Atelier AI Shopping Concierge</h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Catalog-Aware {String.fromCharCode(8226)} Autonomous Settlement {String.fromCharCode(8226)} Razorpay Escalation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleClearChat} title="Reset conversation memory" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Cart Bar */}
        {cartCount > 0 && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs flex-shrink-0">
            <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <span>
                  {cartCount} item{cartCount !== 1 ? 's' : ''} in cart {String.fromCharCode(8226)}{' '}
                  <strong className="text-amber-300 font-mono">{String.fromCharCode(8377)}{(cartTotal / 100).toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <button
                onClick={() => handleSend("place the order")}
                disabled={isTyping}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-[11px] font-bold transition-colors"
              >
                Checkout Now
              </button>
            </div>
          </div>
        )}

        {/* Messages Log */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
            {messages.length === 0 && !isTyping && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-slate-500 text-xs font-mono">
                  <div className="text-4xl mb-3">{String.fromCharCode(937)}</div>
                  <p>Opening your concierge...</p>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onAddToCart={onAddToCart}
                onRetryPayment={triggerRazorpayCheckout}
              />
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Quick Prompt Chips */}
        <div className="border-t border-slate-800/80 flex-shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isTyping}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#161b24] hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0e121a] flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Try: add Dell XPS to cart, explain the Omega watch, place the order..."
                disabled={isTyping}
                className="flex-1 px-5 py-3.5 rounded-2xl bg-[#121620] border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-60"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
              {isTyping ? 'Agent is thinking...' : 'Press Enter to send • Say "add [product] to cart" to shop by voice'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
