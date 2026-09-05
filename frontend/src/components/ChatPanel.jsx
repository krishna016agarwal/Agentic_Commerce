import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Send, ShoppingBag, Sparkles, Zap, ShieldCheck, RefreshCw,
  CheckCircle2, CreditCard, ArrowRight, AlertTriangle
} from 'lucide-react'

// ── Interactive Product Card inside Chat Bubble (Requirement 2) ───────────────
function ChatProductCard({ product, onAddToCart, isTyping }) {
  const priceINR = (product.price_paisa / 100).toLocaleString('en-IN')
  const [added, setAdded] = useState(false)

  const isAvailable = product.in_stock !== false && (product.stock_qty === undefined || product.stock_qty > 0)

  const handleAdd = () => {
    if (!isAvailable || isTyping || added) return
    setAdded(true)
    if (onAddToCart) onAddToCart(product)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-black/30 transition-all group">
      {/* Product Image Thumbnail */}
      <div className="w-full h-36 bg-[#F0EEED] flex items-center justify-center p-3 relative">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = '/assets/omega-watch.png' }}
        />
        <span className="absolute top-2 left-2 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/90 text-gray-800 shadow-2xs">
          {product.category}
        </span>
      </div>

      {/* Info & Add to Cart CTA */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
            {product.name}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-sm font-black font-heading text-black">
              ₹{priceINR}
            </p>
            <span className={`text-[10px] font-semibold ${isAvailable ? 'text-emerald-600' : 'text-rose-500'}`}>
              {isAvailable ? `Stock: ${product.stock_qty || 'Available'}` : 'Sold Out'}
            </span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!isAvailable || isTyping}
          className={`mt-3 text-xs font-bold py-2 px-3 rounded-full flex items-center gap-1.5 justify-center transition-all cursor-pointer ${
            added
              ? 'bg-emerald-500 text-white'
              : isAvailable && !isTyping
              ? 'bg-black hover:bg-neutral-800 text-white shadow-xs'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {added ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isAvailable ? 'Add to Cart' : 'Out of Stock'}</span>
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
          return <strong key={i} className="font-bold text-black">{part.slice(2, -2)}</strong>
        }
        return part
      })}
    </span>
  )
}

// ── Chat Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, onAddToCart, onRetryPayment, isTyping }) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 animate-fadeIn">
        <div className="max-w-[85%]">
          <div className="bg-black text-white px-4 py-3 rounded-2xl rounded-tr-xs text-xs sm:text-sm leading-relaxed shadow-xs">
            {msg.text}
          </div>
          <p className="text-right text-[10px] text-gray-400 mt-1 font-mono">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 animate-fadeIn">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs mt-0.5">
        AI
      </div>

      <div className="flex flex-col gap-2.5 flex-1 min-w-0 max-w-[90%]">
        {msg.text && (
          <div className="bg-[#F0F0F0] text-gray-900 p-4 rounded-2xl rounded-tl-xs text-xs sm:text-sm leading-relaxed">
            <p className="whitespace-pre-wrap"><FormattedText text={msg.text} /></p>
          </div>
        )}

        {/* Inline Interactive Product Cards */}
        {msg.products && msg.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-1">
            {msg.products.map(p => (
              <ChatProductCard
                key={p.product_id}
                product={p}
                onAddToCart={onAddToCart}
                isTyping={isTyping}
              />
            ))}
          </div>
        )}

        {/* Autonomous Settlement Status Card */}
        {msg.checkoutResult && msg.checkoutResult.flow === 'AUTONOMOUS' && (
          <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>🎉 Order booked autonomously! Your product is secured.</span>
            </div>
            <p className="text-xs text-emerald-800">
              Your transaction was verified against your UAP limit and processed silently on the backend with zero friction.
            </p>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-[11px] space-y-1 text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-bold text-black">{msg.checkoutResult.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Settled:</span>
                <span className="font-bold text-emerald-600">
                  ₹{((msg.checkoutResult.amount_paisa || msg.checkoutResult.final_amount_paisa || 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Escalated Path Card */}
        {msg.checkoutResult && msg.checkoutResult.flow === 'HUMAN_OVERRIDE' && (
          <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-900 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>⚠️ Daily limit exceeded. Escalating to human approval.</span>
            </div>
            <p className="text-xs text-rose-800">
              This order exceeds your autonomous spend policy. The Razorpay test payment window has been triggered for manual approval.
            </p>
            {onRetryPayment && (
              <button
                onClick={() => onRetryPayment(msg.checkoutResult)}
                className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-neutral-800 cursor-pointer mt-1"
              >
                <CreditCard className="w-3.5 h-3.5 text-white" />
                <span>Re-open Razorpay Payment Window</span>
              </button>
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-400 font-mono">{time} • SHOP.CO Assistant</p>
      </div>
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 animate-fadeIn">
      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
        AI
      </div>
      <div className="bg-[#F0F0F0] p-3.5 rounded-2xl rounded-tl-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 rounded-full bg-black animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  "Explain the Omega watch",
  "Add Omega watch to cart",
  "I want to buy a laptop",
  "Show luxury watches",
  "place the order"
]

const GREETING_MSG = `Hi! I am your AI Shopping Assistant for SHOP.CO.

I know our complete catalog and can assist you with:
• Exploring styles: "Show luxury watches" or "I want a laptop"
• Explaining specs: "Explain the Omega watch"
• Managing cart: "Add Omega watch to cart" or "Remove Omega watch from cart"
• Instant checkout: Just say "place the order" or "make payment"

How can I help you style your collection today?`

// ── Main Sliding ChatPanel Component (Requirement 2) ─────────────────────────
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
  onClearInitialQuery,
  latestConfirmedPayment
}) {
  const safeCart = cart || []
  const safeDiscountCode = discountCode || ''
  const safeRazorpayKeyId = razorpayKeyId || 'rzp_test_TWl4eo89k3aLud'
  const safeRazorpayKeySecret = razorpayKeySecret || 'TnA2AVvCQ5Ys6gdmVHHYLJ72'

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const isTypingRef = useRef(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)
  const initialQueryFiredRef = useRef(false)

  const setTypingState = useCallback((val) => {
    isTypingRef.current = val
    setIsTyping(val)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Append order placed confirmation into chat when Razorpay payment is confirmed
  useEffect(() => {
    if (latestConfirmedPayment && latestConfirmedPayment.timestamp) {
      const amountINR = ((latestConfirmedPayment.amount_paisa || 0) / 100).toLocaleString('en-IN')
      const confirmText = `🎉 Order has been placed successfully! Your payment has been verified via Razorpay.\n\n` +
        `• **Transaction ID:** ${latestConfirmedPayment.transaction_id}\n` +
        `• **Payment ID:** ${latestConfirmedPayment.razorpay_payment_id}\n` +
        `• **Amount Settled:** ₹${amountINR}\n\n` +
        `Your items are confirmed and being prepared for shipment.`

      setMessages(prev => {
        if (prev.some(m => m.confirmedPaymentId === latestConfirmedPayment.razorpay_payment_id)) {
          return prev
        }
        return [...prev, {
          id: Date.now(),
          role: 'ai',
          text: confirmText,
          products: [],
          confirmedPaymentId: latestConfirmedPayment.razorpay_payment_id,
          checkoutResult: {
            flow: 'AUTONOMOUS',
            transaction_id: latestConfirmedPayment.transaction_id,
            amount_paisa: latestConfirmedPayment.amount_paisa
          },
          ts: new Date().toISOString()
        }]
      })
    }
  }, [latestConfirmedPayment])

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Initial greeting
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

  // ── Network request to /api/chat ─────────────────────────────────────────────
  const sendMessage = useCallback(async (text, cartSnapshot) => {
    if (!text || !text.trim()) return
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

      if (!res.ok) {
        let detail = 'Shopping assistant is temporarily unavailable.'
        try { detail = (await res.json()).detail || detail } catch (_) {}
        throw new Error(detail)
      }
      const data = await res.json()

      setTypingState(false)

      // Natural response message
      let replyMessage = data.message || 'I found these options for you.'
      if (data.checkout_result) {
        if (data.checkout_result.flow === 'AUTONOMOUS' && data.checkout_result.status === 'SUCCESS') {
          replyMessage = '🎉 Order booked autonomously! Your product is secured.'
        } else if (data.checkout_result.flow === 'HUMAN_OVERRIDE') {
          replyMessage = '⚠️ Daily limit exceeded. Escalating to human approval.'
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: replyMessage,
        products: data.recommended_products || [],
        checkoutResult: data.checkout_result || null,
        ts: new Date().toISOString()
      }])

      // Cart Action trigger from backend agent
      if (data.cart_action && data.cart_action.action) {
        const { action, product } = data.cart_action
        if (action === 'ADD' && product && onAddToCart) {
          onAddToCart(product)
          if (showToast) showToast('success', '🛒 Added to Cart', `${product.name} added to your cart.`)
        } else if (action === 'REMOVE' && data.cart_action.product_id && onRemoveFromCart) {
          onRemoveFromCart(data.cart_action.product_id)
          if (showToast) showToast('info', '🗑️ Removed from Cart', 'Item removed from your cart.')
        }
      }

      // Autonomous checkout success
      if (data.checkout_result && data.checkout_result.flow === 'AUTONOMOUS' && data.checkout_result.status === 'SUCCESS') {
        if (onOrderPlaced) onOrderPlaced(data.checkout_result.transaction_id, 'AUTONOMOUS')
        if (onFetchData) onFetchData()
      }

      // Human escalation required -> Launch Razorpay test modal
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
  }, [user, geminiKey, safeDiscountCode, safeRazorpayKeyId, safeRazorpayKeySecret, onOrderPlaced, onEscalateToRazorpay, onFetchData, onAddToCart, onRemoveFromCart, showToast, setTypingState])

  // Handle storefront initial query
  useEffect(() => {
    if (isOpen && initialQuery && initialized && !initialQueryFiredRef.current) {
      initialQueryFiredRef.current = true
      if (onClearInitialQuery) onClearInitialQuery()
      const t = setTimeout(() => sendMessage(initialQuery, safeCart), 150)
      return () => clearTimeout(t)
    }
  }, [isOpen, initialQuery, initialized, safeCart, sendMessage, onClearInitialQuery])

  useEffect(() => {
    if (initialQuery) {
      initialQueryFiredRef.current = false
    }
  }, [initialQuery])

  const handleChatAddToCart = useCallback((product) => {
    if (!product || isTypingRef.current) return
    sendMessage(`Add ${product.name} to cart`, safeCart)
  }, [sendMessage, safeCart])

  const handleSend = useCallback((customText) => {
    const text = (customText !== undefined && customText !== null) ? customText : input
    if (!text || !text.trim()) return
    if (customText === undefined || customText === null) setInput('')
    sendMessage(text, safeCart)
  }, [input, safeCart, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = async () => {
    try { await fetch('/api/memory/clear?user_id=user_01', { method: 'DELETE' }) } catch (_) {}
    setTypingState(false)
    setMessages([{
      id: Date.now(),
      role: 'ai',
      text: 'Chat memory refreshed! How can I help you today?',
      products: [],
      ts: new Date().toISOString()
    }])
  }

  // Razorpay popup handler for retry/manual trigger
  const triggerRazorpayCheckout = useCallback((checkoutData) => {
    if (typeof window.Razorpay === 'undefined') {
      if (showToast) showToast('error', 'Razorpay Not Loaded', 'Please check internet connection.')
      return
    }
    const rzp = new window.Razorpay({
      key: checkoutData.razorpay_key_id || safeRazorpayKeyId,
      amount: checkoutData.amount_paisa || checkoutData.final_amount_paisa,
      currency: 'INR',
      name: 'SHOP.CO Luxury Commerce',
      description: 'Human Verification for ' + checkoutData.transaction_id,
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
            throw new Error(err.detail || 'Payment signature confirmation failed.')
          }
          if (onOrderPlaced) onOrderPlaced(checkoutData.transaction_id, 'HUMAN_OVERRIDE')
          if (onFetchData) onFetchData()
          const amountINR = ((checkoutData.amount_paisa || checkoutData.final_amount_paisa || 0) / 100).toLocaleString('en-IN')
          const confirmText = `🎉 Order has been placed successfully! Your payment has been verified via Razorpay.\n\n` +
            `• **Transaction ID:** ${checkoutData.transaction_id}\n` +
            `• **Payment ID:** ${response.razorpay_payment_id}\n` +
            `• **Amount Settled:** ₹${amountINR}\n\n` +
            `Your items are confirmed and being prepared for shipment.`

          setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'ai',
            text: confirmText,
            products: [],
            confirmedPaymentId: response.razorpay_payment_id,
            checkoutResult: { flow: 'AUTONOMOUS', transaction_id: checkoutData.transaction_id, amount_paisa: checkoutData.amount_paisa },
            ts: new Date().toISOString()
          }])
        } catch (err) {
          if (showToast) showToast('error', 'Verification Failed', err.message)
        }
      },
      prefill: { name: (user && user.name) || 'Sri Krishna', email: 'shopper@shop.co', contact: '9999999999' },
      theme: { color: '#000000' },
      modal: { ondismiss: () => { if (showToast) showToast('info', 'Payment Dismissed', 'Razorpay test checkout was closed.') } }
    })
    rzp.on('payment.failed', resp => {
      if (showToast) showToast('error', 'Payment Failed', resp.error.description || 'Payment could not be completed.')
    })
    rzp.open()
  }, [safeRazorpayKeyId, safeRazorpayKeySecret, user, onOrderPlaced, onFetchData, showToast])

  const cartTotal = safeCart.reduce((a, it) => a + it.price_paisa * it.qty, 0)
  const cartCount = safeCart.reduce((a, it) => a + it.qty, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-white text-gray-900 flex flex-col animate-fadeIn">
      {/* ── Full-Screen Header ── */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-md flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight font-heading text-black">
                  SHOP.CO AI Shopping Assistant
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Catalog-Aware • Autonomous Settlement • Instant Razorpay Trigger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Reset conversation memory"
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:text-black hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer border border-gray-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Memory</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Cart Bar inside Full-Screen View ── */}
      {cartCount > 0 && (
        <div className="bg-[#F0F0F0] border-b border-gray-200 flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <ShoppingBag className="w-4 h-4 text-black" />
              <span>
                <strong>{cartCount}</strong> item{cartCount !== 1 ? 's' : ''} in cart •{' '}
                <strong className="text-black font-heading">₹{(cartTotal / 100).toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <button
              onClick={() => handleSend("place the order")}
              disabled={isTyping}
              className="px-4 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 disabled:opacity-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Checkout Now
            </button>
          </div>
        </div>
      )}

      {/* ── Messages Stream (Centered in max-w-4xl) ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onAddToCart={handleChatAddToCart}
              onRetryPayment={triggerRazorpayCheckout}
              isTyping={isTyping}
            />
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Bottom Controls & Input Area (Centered in max-w-4xl) ── */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-4 space-y-2.5">
          {/* Quick Suggestion Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isTyping}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-[#F0F0F0] hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Input Row */}
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or type 'place the order'..."
              disabled={isTyping}
              className="flex-1 px-5 py-3.5 rounded-full bg-[#F0F0F0] border border-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black/30 focus:ring-2 focus:ring-black/10 transition-all disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="p-3.5 rounded-full bg-black text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center font-sans">
            Under limit: Sells autonomously • Over limit: Escalates to Razorpay approval
          </p>
        </div>
      </div>
    </div>
  )
}
