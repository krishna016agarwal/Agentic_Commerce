import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Send, ShoppingCart, Sparkles, Zap, ShieldCheck, RefreshCw,
  Star, Package, CheckCircle2, AlertTriangle, MessageCircle, Bot,
  CreditCard, ArrowRight, ExternalLink
} from 'lucide-react'

// ── Interactive Product Card inside Chat Bubble ──────────────────────────────
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
      className="rounded-2xl overflow-hidden flex flex-col sm:flex-row bg-[#121620] border border-slate-700/80 hover:border-amber-500/50 transition-all shadow-lg animate-bounceIn"
      style={{ maxWidth: 320 }}
    >
      <div className="w-full sm:w-28 h-28 flex-shrink-0 bg-[#090d14] flex items-center justify-center p-2 border-b sm:border-b-0 sm:border-r border-slate-800">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain filter drop-shadow-md"
          onError={e => {
            e.target.src = '/assets/omega-watch.png'
          }}
        />
      </div>

      <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {product.category}
            </span>
            {product.in_stock ? (
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                ✓ Stock: {product.stock_qty}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-rose-400 font-semibold">
                ✗ Sold Out
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-100 leading-tight line-clamp-2">
            {product.name}
          </p>
          <p className="text-xs font-mono font-bold text-amber-400 mt-1">
            ₹{priceINR}
          </p>
        </div>

        <button
          onClick={handleAdd}
          disabled={!product.in_stock}
          className={`mt-2.5 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 justify-center transition-all ${
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

// ── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onAddToCart, onRetryPayment }) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  // Parse simple markdown bold **text**
  const formatText = (text) => {
    if (!text) return null
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-amber-300 font-semibold">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 animate-fadeIn">
        <div className="max-w-[85%]">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm shadow-md leading-relaxed">
            {msg.text}
          </div>
          <p className="text-right text-[10px] text-slate-500 mt-1 font-mono">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 animate-fadeIn max-w-[95%]">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xs flex-shrink-0 shadow-md">
        Ω
      </div>

      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {/* Text bubble */}
        {msg.text && (
          <div className="bg-[#141923] border border-slate-800 p-3.5 rounded-2xl rounded-tl-xs text-xs sm:text-sm text-slate-200 leading-relaxed shadow-md">
            <p className="whitespace-pre-wrap">{formatText(msg.text)}</p>
          </div>
        )}

        {/* Inline interactive product cards */}
        {msg.products && msg.products.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-1">
            {msg.products.map(p => (
              <ChatProductCard key={p.product_id} product={p} onAddToCart={onAddToCart} />
            ))}
          </div>
        )}

        {/* Autonomous Settlement Card */}
        {msg.checkoutResult?.flow === 'AUTONOMOUS' && (
          <div className="rounded-2xl p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 shadow-xl space-y-2 animate-bounceIn">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>🎉 Order Booked Autonomously!</span>
            </div>
            <p className="text-xs text-slate-300">
              Your purchase has been settled in the background with zero manual intervention. Your product is secured!
            </p>
            <div className="p-2 rounded-xl bg-[#090d14] border border-emerald-500/20 font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Transaction ID:</span>
                <span className="text-slate-200 font-bold">{msg.checkoutResult.transaction_id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount Settled:</span>
                <span className="text-emerald-400 font-bold">
                  ₹{((msg.checkoutResult.amount_paisa || 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">
              ✨ Logged in <strong>My Orders</strong> with full invoice receipt.
            </p>
          </div>
        )}

        {/* Human Escalation Notice */}
        {msg.checkoutResult?.flow === 'HUMAN_OVERRIDE' && (
          <div className="rounded-2xl p-4 bg-amber-950/40 border border-amber-500/40 text-amber-100 shadow-xl space-y-2 animate-bounceIn">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>⚠️ Escalating to Human for Manual Approval</span>
            </div>
            <p className="text-xs text-slate-300">
              This order exceeds your daily autonomous spending limit. The official Razorpay Test-Mode payment window has been launched.
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

// ── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 animate-fadeIn">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xs flex-shrink-0 shadow-md">
        Ω
      </div>
      <div className="bg-[#141923] border border-slate-800 p-3 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-md">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  )
}

// ── Quick Prompt Suggestions ─────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Explain the Omega watch",
  "I want to buy a laptop",
  "placed the order",
  "make payment",
  "Show luxury watches",
  "Recommend accessories"
]

// ── Main Sliding ChatPanel Component ─────────────────────────────────────────
export default function ChatPanel({
  isOpen,
  onClose,
  cart = [],
  discountCode = '',
  onAddToCart,
  user,
  geminiKey,
  razorpayKeyId = 'rzp_test_TWl4eo89k3aLud',
  razorpayKeySecret = 'TnA2AVvCQ5Ys6gdmVHHYLJ72',
  onOrderPlaced,
  onEscalateToRazorpay,
  onFetchData,
  showToast,
  userRemainingLimit,
  initialQuery = null,
  onClearInitialQuery = null
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Initial greeting upon opening
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true)
      setIsTyping(true)
      const timer = setTimeout(() => {
        setIsTyping(false)
        setMessages([
          {
            id: Date.now(),
            role: 'ai',
            text: `Hi, I am your shopping assistant for Atelier! 👋 I know every product in our catalog and can help you find items, explain features in detail, compare specs, and even book your orders autonomously.\n\nWhat can I help you find today?`,
            products: [],
            ts: new Date().toISOString()
          }
        ])
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isOpen, hasGreeted])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Handle incoming query from Storefront
  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSend(initialQuery)
      if (onClearInitialQuery) onClearInitialQuery()
    }
  }, [isOpen, initialQuery])

  // ── Open Razorpay Modal for Human Override ──
  const triggerRazorpayCheckout = useCallback((checkoutData) => {
    if (typeof window.Razorpay === 'undefined') {
      if (showToast) showToast('error', 'Razorpay Not Loaded', 'Please check your internet connection.')
      return
    }

    const options = {
      key: checkoutData.razorpay_key_id || razorpayKeyId,
      amount: checkoutData.amount_paisa || checkoutData.final_amount_paisa,
      currency: 'INR',
      name: 'Atelier Luxury Commerce',
      description: `Manual Authorization for ${checkoutData.transaction_id}`,
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
              razorpay_key_secret: razorpayKeySecret
            })
          })

          if (!confirmRes.ok) {
            const err = await confirmRes.json()
            throw new Error(err.detail || 'Payment verification failed.')
          }

          if (onOrderPlaced) {
            onOrderPlaced(checkoutData.transaction_id, 'HUMAN_OVERRIDE')
          }
          if (onFetchData) onFetchData()

          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              role: 'ai',
              text: `🎉 Payment verified & order booked! Thanks for purchasing! Your product is secured. (Razorpay Payment ID: ${response.razorpay_payment_id}). Your order is logged in My Orders.`,
              products: [],
              checkoutResult: {
                flow: 'AUTONOMOUS',
                transaction_id: checkoutData.transaction_id,
                amount_paisa: checkoutData.amount_paisa || checkoutData.final_amount_paisa
              },
              ts: new Date().toISOString()
            }
          ])
        } catch (err) {
          if (showToast) showToast('error', 'Verification Failed', err.message)
        }
      },
      prefill: {
        name: user?.name || 'Sri Krishna',
        email: 'shopper@atelier.ai',
        contact: '9999999999'
      },
      theme: { color: '#c5a880' },
      modal: {
        ondismiss: () => {
          if (showToast) showToast('info', 'Payment Dismissed', 'Razorpay checkout was dismissed.')
        }
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', resp => {
      if (showToast) showToast('error', 'Payment Failed', resp.error.description || 'Payment could not be processed.')
    })
    rzp.open()
  }, [razorpayKeyId, razorpayKeySecret, user, onOrderPlaced, onFetchData, showToast])

  // ── Send Message ──
  const handleSend = useCallback(async (customText = null) => {
    const text = (customText || input).trim()
    if (!text || isTyping) return

    const userMsg = { id: Date.now(), role: 'user', text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    if (!customText) setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.user_id || 'user_01',
          message: text,
          gemini_api_key: geminiKey || null,
          cart: cart.map(it => ({
            product_id: it.product_id,
            qty: it.qty,
            price_paisa: it.price_paisa,
            name: it.name,
            image_url: it.image_url
          })),
          discount_code: discountCode || null,
          razorpay_key_id: razorpayKeyId,
          razorpay_key_secret: razorpayKeySecret
        })
      })

      if (!res.ok) {
        throw new Error('Shopping assistant is currently unavailable.')
      }

      const data = await res.json()
      setIsTyping(false)

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: data.message,
        products: data.recommended_products || [],
        checkoutResult: data.checkout_result,
        ts: new Date().toISOString()
      }
      setMessages(prev => [...prev, aiMsg])

      // If autonomous checkout succeeded
      if (data.checkout_result?.flow === 'AUTONOMOUS' && data.checkout_result?.status === 'SUCCESS') {
        if (onOrderPlaced) {
          onOrderPlaced(data.checkout_result.transaction_id, 'AUTONOMOUS')
        }
        if (onFetchData) onFetchData()
      }

      // If escalation required -> instantly launch Razorpay modal
      if (data.checkout_result?.flow === 'HUMAN_OVERRIDE') {
        if (onEscalateToRazorpay) {
          onEscalateToRazorpay(data.checkout_result)
        } else {
          triggerRazorpayCheckout(data.checkout_result)
        }
      }

    } catch (err) {
      setIsTyping(false)
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'ai',
          text: "I encountered an issue retrieving that. Please ask again in a moment.",
          products: [],
          ts: new Date().toISOString()
        }
      ])
    }
  }, [input, isTyping, cart, discountCode, user, geminiKey, razorpayKeyId, razorpayKeySecret, onOrderPlaced, onEscalateToRazorpay, onFetchData, triggerRazorpayCheckout])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = async () => {
    await fetch('/api/memory/clear?user_id=user_01', { method: 'DELETE' })
    setMessages([
      {
        id: Date.now(),
        role: 'ai',
        text: "Chat memory cleared! Hi, I am your shopping assistant for Atelier. How can I help you discover our luxury catalog today?",
        products: [],
        ts: new Date().toISOString()
      }
    ])
  }

  const cartTotal = cart.reduce((a, it) => a + it.price_paisa * it.qty, 0)
  const cartCount = cart.reduce((a, it) => a + it.qty, 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[480px] lg:w-[540px] bg-[#0d1117] border-l border-slate-800 shadow-2xl animate-slideInRight"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#121620]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#c5a880] to-[#dfc79b] p-0.5 flex items-center justify-center shadow-lg shadow-amber-900/20">
              <div className="w-full h-full rounded-2xl bg-[#0e1117] flex items-center justify-center text-[#dfc79b] font-serif font-bold text-base">
                Ω
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
                Catalog-Aware • Autonomous Settlement • Razorpay Escalation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Reset conversation memory"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Cart Bar */}
        {cartCount > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>
                {cartCount} item{cartCount !== 1 ? 's' : ''} in cart •{' '}
                <strong className="text-amber-300 font-mono">₹{(cartTotal / 100).toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <button
              onClick={() => handleSend("place the order")}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors"
            >
              Checkout Now →
            </button>
          </div>
        )}

        {/* Messages Log */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
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

        {/* Quick Suggestion Prompt Chips */}
        <div className="flex gap-2 px-5 py-2 overflow-x-auto border-t border-slate-800/80 no-scrollbar">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#161b24] hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 text-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0e121a]">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try "Explain the Omega watch" or "placed the order"...'
              className="flex-1 px-4 py-3 rounded-2xl bg-[#121620] border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white shadow-md shadow-amber-900/30 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
            Press Enter to send • Autonomous settlement active for purchases under daily limit
          </p>
        </div>
      </div>
    </>
  )
}
