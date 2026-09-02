import React, { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import InventoryLedger from './components/InventoryLedger'
import Storefront from './components/Storefront'
import ChatBot from './components/ChatBot'
import ChatPanel from './components/ChatPanel'
import CartDrawer from './components/CartDrawer'
import VisualAuditTrail from './components/VisualAuditTrail'
import OrdersPage from './components/OrdersPage'
import {
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Zap, X, Sliders, RefreshCw
} from 'lucide-react'

export default function App() {
  const [products, setProducts] = useState([])
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [upsellOffer, setUpsellOffer] = useState(null)
  const [discountCode, setDiscountCode] = useState('')
  const [auditLogs, setAuditLogs] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('store') // 'store' | 'chat' (mobile toggle)
  const [activeView, setActiveView] = useState('store') // 'store' | 'orders'
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsTab, setSettingsTab] = useState('safety') // 'safety' | 'audit' | 'keys'
  const [notification, setNotification] = useState(null)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false)
  const [initialChatQuery, setInitialChatQuery] = useState(null)

  const handleOpenChatWithQuery = (query) => {
    setInitialChatQuery(query)
    setIsChatPanelOpen(true)
  }

  // Credentials
  const [geminiKey, setGeminiKey] = useState('')
  const [razorpayKeyId, setRazorpayKeyId] = useState('rzp_test_TWl4eo89k3aLud')
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('TnA2AVvCQ5Ys6gdmVHHYLJ72')

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [prodRes, userRes, logRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/user?user_id=user_01'),
        fetch('/api/audit-trail?limit=40')
      ])
      if (prodRes.ok) setProducts(await prodRes.json())
      if (userRes.ok) setUser(await userRes.json())
      if (logRes.ok) setAuditLogs(await logRes.json())
    } catch (err) {
      console.error('Error fetching portal data:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(async () => {
      try {
        const logRes = await fetch('/api/audit-trail?limit=40')
        if (logRes.ok) setAuditLogs(await logRes.json())
      } catch (_) {}
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (type, title, message) => {
    setNotification({ type, title, message })
    setTimeout(() => setNotification(null), 6000)
  }

  // ── Cart Actions ───────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async (product) => {
    setCart((prev) => {
      const existing = prev.find(it => it.product_id === product.product_id)
      if (existing) {
        return prev.map(it => it.product_id === product.product_id ? { ...it, qty: it.qty + 1 } : it)
      }
      return [...prev, {
        product_id: product.product_id,
        name: product.name,
        price_paisa: product.price_paisa,
        image_url: product.image_url,
        qty: 1
      }]
    })

    // Request upsell offer
    try {
      const upsellRes = await fetch('/api/upsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.product_id })
      })
      if (upsellRes.ok) {
        const offer = await upsellRes.json()
        if (offer.trigger_upsell) {
          setUpsellOffer(offer)
          showToast('upsell', 'Dynamic Upsell Pitch!', offer.seller_pitch)
        }
      }
    } catch (e) {
      console.error('Upsell evaluation failed:', e)
    }

    setIsCartOpen(true)
  }, [])

  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) handleRemoveItem(productId)
    else setCart(prev => prev.map(it => it.product_id === productId ? { ...it, qty: newQty } : it))
  }

  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(it => it.product_id !== productId))
  }

  const handleApplyUpsell = (offer) => {
    if (offer?.upsell_product) {
      handleAddToCart(offer.upsell_product)
      if (offer.discount_code) setDiscountCode(offer.discount_code)
      setUpsellOffer(null)
      showToast('success', 'Bundle Discount Applied!', `Added ${offer.upsell_product.name} with code ${offer.discount_code}`)
    }
  }

  // ── Settings / DB ──────────────────────────────────────────────────────────
  const handleUpdateLimit = async (newLimitPaisa) => {
    try {
      const res = await fetch('/api/user/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'user_01', daily_spend_limit: newLimitPaisa })
      })
      if (res.ok) {
        setUser(await res.json())
        showToast('info', 'Spending Policy Updated', `Daily spend ceiling set to ₹${(newLimitPaisa / 100).toLocaleString('en-IN')}`)
        fetchData()
      }
    } catch (e) {
      console.error('Failed to update limit:', e)
    }
  }

  const handleResetDb = async () => {
    try {
      const res = await fetch('/api/reset-db', { method: 'POST' })
      if (res.ok) {
        showToast('info', 'Database Reset', 'Initial catalog stock and limits restored.')
        setCart([])
        setDiscountCode('')
        setUpsellOffer(null)
        fetchData()
      }
    } catch (e) {
      console.error('Reset failed:', e)
    }
  }

  const handleRunTestScenario = async (scenario) => {
    if (scenario === 'under_limit') {
      await handleUpdateLimit(5000000)
      const strap = products.find(p => p.product_id === 'prod_omega_leather_strap') || {
        product_id: 'prod_omega_leather_strap',
        name: 'Omega Handcrafted Alligator Leather Strap',
        price_paisa: 150000,
        qty: 1
      }
      setCart([{ product_id: strap.product_id, name: strap.name, price_paisa: strap.price_paisa, image_url: strap.image_url, qty: 1 }])
      setIsCartOpen(true)
      showToast('info', 'Autonomous Test Ready', 'Item ₹1,500 is under ₹50,000 limit. Click Authorize Autonomously!')
    } else if (scenario === 'over_limit') {
      await handleUpdateLimit(200000)
      const watch = products.find(p => p.product_id === 'prod_omega_chronometer') || {
        product_id: 'prod_omega_chronometer',
        name: 'Omega Seamaster Aqua Terra Chronometer',
        price_paisa: 4500000,
        qty: 1
      }
      setCart([{ product_id: watch.product_id, name: watch.name, price_paisa: watch.price_paisa, image_url: watch.image_url, qty: 1 }])
      setIsCartOpen(true)
      showToast('info', 'Escalation Test Ready', 'Item ₹45,000 exceeds ₹2,000 limit. Razorpay modal will trigger!')
    }
  }

  // ── Checkout (Cart Drawer path) ────────────────────────────────────────────
  const handleInitiateCheckout = async () => {
    if (cart.length === 0 || isProcessing) return
    setIsProcessing(true)
    try {
      const res = await fetch('/api/checkout/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_01',
          items: cart.map(it => ({ product_id: it.product_id, qty: it.qty, price_paisa: it.price_paisa })),
          discount_code: discountCode || null,
          razorpay_key_id: razorpayKeyId || null,
          razorpay_key_secret: razorpayKeySecret || null
        })
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Checkout initiation rejected.')
      }
      const initData = await res.json()

      if (!initData.requires_human_override && initData.flow_type === 'AUTONOMOUS') {
        const autoRes = await fetch('/api/checkout/autonomous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id: initData.transaction_id, token: initData.token })
        })
        if (!autoRes.ok) {
          const autoErr = await autoRes.json()
          throw new Error(autoErr.detail || 'Autonomous settlement failed.')
        }
        setCart([])
        setIsCartOpen(false)
        showToast('autonomous', '⚡ Autonomous Settlement!', `AI Agent settled ${initData.transaction_id} for ₹${(initData.final_amount_paisa / 100).toLocaleString('en-IN')} with zero friction.`)
        fetchData()
      } else {
        openRazorpayModal(initData)
      }
    } catch (err) {
      showToast('error', 'Gateway Error', err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Razorpay Modal ─────────────────────────────────────────────────────────
  const openRazorpayModal = (initData) => {
    showToast('escalation', '🛡️ Escalating to Human Shopper', 'Transaction exceeds limit. Launching Razorpay test modal...')
    if (typeof window.Razorpay === 'undefined') {
      showToast('error', 'Razorpay Not Loaded', 'Please check your internet connection.')
      return
    }
    const options = {
      key: initData.razorpay_key_id || razorpayKeyId,
      amount: initData.final_amount_paisa,
      currency: initData.currency || 'INR',
      name: 'ModestWear & Luxury Atelier',
      description: `Manual Verification for ${initData.transaction_id}`,
      image: '/assets/omega-watch.png',
      order_id: initData.razorpay_order_id,
      handler: async (response) => {
        try {
          const confirmRes = await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_id: initData.transaction_id,
              token: initData.token,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              razorpay_key_secret: razorpayKeySecret || null
            })
          })
          if (!confirmRes.ok) {
            const err = await confirmRes.json()
            throw new Error(err.detail || 'Signature confirmation failed.')
          }
          setCart([])
          setIsCartOpen(false)
          showToast('success', '🎉 Payment Verified & Settled!', `Razorpay Payment ${response.razorpay_payment_id} authorized.`)
          fetchData()
        } catch (confirmError) {
          showToast('error', 'Verification Failed', confirmError.message)
        }
      },
      prefill: { name: user?.name || 'Sri Krishna', email: 'shopper@antigravity.ai', contact: '9999999999' },
      theme: { color: '#c5a880' },
      modal: {
        ondismiss: () => {
          showToast('info', 'Payment Cancelled', 'Razorpay checkout was dismissed.')
          setIsProcessing(false)
        }
      }
    }
    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', resp => showToast('error', 'Payment Failed', resp.error.description || 'Payment failed.'))
    rzp.open()
  }

  // ── Chat Panel → Razorpay Escalation ──────────────────────────────────────
  const handleChatEscalateToRazorpay = (checkoutResult) => {
    // checkoutResult from the chat endpoint's HUMAN_OVERRIDE flow
    const syntheticInitData = {
      transaction_id: checkoutResult.transaction_id,
      token: checkoutResult.token,
      final_amount_paisa: checkoutResult.amount_paisa || checkoutResult.final_amount_paisa,
      currency: checkoutResult.currency || 'INR',
      razorpay_order_id: checkoutResult.razorpay_order_id,
      razorpay_key_id: checkoutResult.razorpay_key_id || razorpayKeyId,
      requires_human_override: true
    }
    openRazorpayModal(syntheticInitData)
  }

  // ── Chat Panel → Autonomous success ───────────────────────────────────────
  const handleChatOrderPlaced = (transactionId, flow) => {
    setCart([])
    setIsCartOpen(false)
    showToast(
      flow === 'AUTONOMOUS' ? 'autonomous' : 'success',
      flow === 'AUTONOMOUS' ? '⚡ Autonomous Order Booked!' : '🎉 Payment Verified!',
      `Transaction ${transactionId} completed successfully. Check My Orders for details.`
    )
    fetchData()
  }

  const remainingLimitPaisa = user ? Math.max(0, user.daily_spend_limit - user.daily_spend_accumulated) : 5000000

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Navbar */}
      <Navbar
        user={user}
        cartCount={cart.reduce((acc, it) => acc + it.qty, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onResetDb={handleResetDb}
        onToggleSettings={() => setShowSettingsModal(true)}
        onToggleChat={() => setIsChatPanelOpen(prev => !prev)}
        isChatOpen={isChatPanelOpen}
        onToggleOrders={() => setActiveView(prev => prev === 'orders' ? 'store' : 'orders')}
        activeView={activeView}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md animate-bounce-short">
          <div
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 ${
              notification.type === 'autonomous'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                : notification.type === 'escalation'
                ? 'bg-blue-950/90 border-blue-500/50 text-blue-100 shadow-blue-950/50'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50'
                : notification.type === 'upsell'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-amber-950/50'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {notification.type === 'autonomous' && <Zap className="w-5 h-5 text-emerald-400" />}
              {notification.type === 'escalation' && <ShieldCheck className="w-5 h-5 text-blue-400" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {notification.type === 'upsell' && <Sparkles className="w-5 h-5 text-amber-400" />}
              {(notification.type === 'info' || notification.type === 'success') && <CheckCircle2 className="w-5 h-5 text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold font-serif tracking-wide">{notification.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Orders View vs Storefront */}
        {activeView === 'orders' ? (
          <OrdersPage onBack={() => setActiveView('store')} />
        ) : (
          <Storefront
            products={products}
            onAddToCart={handleAddToCart}
            onOpenChatWithQuery={handleOpenChatWithQuery}
            userRemainingLimit={remainingLimitPaisa}
          />
        )}
      </main>

      {/* ── CART DRAWER ── */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onApplyUpsell={handleApplyUpsell}
        upsellOffer={upsellOffer}
        discountCode={discountCode}
        setDiscountCode={setDiscountCode}
        onInitiateCheckout={handleInitiateCheckout}
        user={user}
        isProcessing={isProcessing}
      />

      {/* ── SLIDING CHAT PANEL ── */}
      <ChatPanel
        isOpen={isChatPanelOpen}
        onClose={() => {
          setIsChatPanelOpen(false)
          setInitialChatQuery(null)
        }}
        onAddToCart={handleAddToCart}
        cart={cart}
        discountCode={discountCode}
        user={user}
        geminiKey={geminiKey}
        razorpayKeyId={razorpayKeyId}
        razorpayKeySecret={razorpayKeySecret}
        onOrderPlaced={handleChatOrderPlaced}
        onEscalateToRazorpay={handleChatEscalateToRazorpay}
        onFetchData={fetchData}
        showToast={showToast}
        userRemainingLimit={remainingLimitPaisa}
        initialQuery={initialChatQuery}
        onClearInitialQuery={() => setInitialChatQuery(null)}
      />

      {/* ── SAFETY CONTROLS & DEVELOPER CONSOLE MODAL ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#121620] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e121a]">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-100">
                    System Architecture & Safety Gateway Console
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Deterministic Safety Gateway • SQLite WAL Mode • Razorpay Testnet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-800/80 bg-[#141923]">
              <button
                onClick={() => setSettingsTab('safety')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  settingsTab === 'safety'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                🛡️ Safety Policies & Stock Ledger
              </button>
              <button
                onClick={() => setSettingsTab('audit')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  settingsTab === 'audit'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                📜 Live Cryptographic Audit Trail
              </button>
              <button
                onClick={() => setSettingsTab('keys')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  settingsTab === 'keys'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                🔑 API Keys & Gateway Config
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {settingsTab === 'safety' && (
                <InventoryLedger
                  products={products}
                  user={user}
                  onUpdateLimit={handleUpdateLimit}
                  onRunTestScenario={handleRunTestScenario}
                  geminiKey={geminiKey}
                  setGeminiKey={setGeminiKey}
                  razorpayKeyId={razorpayKeyId}
                  setRazorpayKeyId={setRazorpayKeyId}
                  razorpayKeySecret={razorpayKeySecret}
                  setRazorpayKeySecret={setRazorpayKeySecret}
                />
              )}

              {settingsTab === 'audit' && (
                <VisualAuditTrail
                  logs={auditLogs}
                  onRefresh={fetchData}
                  isLoading={isProcessing}
                />
              )}

              {settingsTab === 'keys' && (
                <div className="space-y-4 text-xs max-w-lg mx-auto">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Razorpay Key ID (Test Mode):</label>
                    <input
                      type="text"
                      value={razorpayKeyId}
                      onChange={e => setRazorpayKeyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Razorpay Key Secret:</label>
                    <input
                      type="password"
                      value={razorpayKeySecret}
                      onChange={e => setRazorpayKeySecret(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Google Gemini API Key (Optional):</label>
                    <input
                      type="password"
                      placeholder="Loaded automatically from backend .env if available"
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border border-slate-700 font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Gemini 2.5 Flash is loaded from .env on the backend. You can override it here if desired.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0e121a] flex justify-between items-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Click tabs above to switch between Ledger, Audit Trail, and Keys
              </span>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-4 text-center text-xs text-slate-500 font-mono">
        Razorpay AI Buildathon Track 1 • Autonomous Agentic Commerce Portal • SQLite WAL Mode
      </footer>
    </div>
  )
}
