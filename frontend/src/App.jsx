import React, { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import Storefront from './components/Storefront'
import ChatPanel from './components/ChatPanel'
import CartDrawer from './components/CartDrawer'
import OrdersPage from './components/OrdersPage'
import SettingsModal from './components/SettingsModal'
import DeveloperConsoleModal from './components/DeveloperConsoleModal'
import {
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Zap, X
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
  const [activeView, setActiveView] = useState('store') // 'store' | 'orders'
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [notification, setNotification] = useState(null)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false)
  const [initialChatQuery, setInitialChatQuery] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [latestConfirmedPayment, setLatestConfirmedPayment] = useState(null)

  const handleOpenChatWithQuery = (query) => {
    setInitialChatQuery(query)
    setIsChatPanelOpen(true)
  }

  // Gateway Credentials (loaded securely from backend .env, never hardcoded on frontend)
  const [geminiKey, setGeminiKey] = useState('')
  const [razorpayKeyId, setRazorpayKeyId] = useState('')
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('')

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [prodRes, userRes, logRes, confRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/user?user_id=user_01'),
        fetch('/api/audit-trail?limit=50'),
        fetch('/api/config')
      ])
      if (prodRes.ok) setProducts(await prodRes.json())
      if (userRes.ok) setUser(await userRes.json())
      if (logRes.ok) setAuditLogs(await logRes.json())
      if (confRes && confRes.ok) {
        const conf = await confRes.json()
        if (conf.razorpay_key_id) setRazorpayKeyId(conf.razorpay_key_id)
      }
    } catch (err) {
      console.error('Error fetching portal data:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(async () => {
      try {
        const logRes = await fetch('/api/audit-trail?limit=50')
        if (logRes.ok) setAuditLogs(await logRes.json())
      } catch (_) {}
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Toast Notification ─────────────────────────────────────────────────────
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

    // Upsell inquiry
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
          showToast('upsell', 'Exclusive Deal!', offer.seller_pitch)
        }
      }
    } catch (e) {
      console.error('Upsell evaluation failed:', e)
    }

    if (!isChatPanelOpen) {
      setIsCartOpen(true)
    }
  }, [isChatPanelOpen])

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

  // ── Limit & DB Controls ────────────────────────────────────────────────────
  const handleUpdateLimit = async (newLimitPaisa) => {
    try {
      const res = await fetch('/api/user/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'user_01', daily_spend_limit: newLimitPaisa })
      })
      if (res.ok) {
        setUser(await res.json())
        showToast('info', 'Spending Policy Updated', `Daily spend limit set to ₹${(newLimitPaisa / 100).toLocaleString('en-IN')}`)
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
      const strap = products.find(p => p.product_id === 'prod_watch_strap') || {
        product_id: 'prod_watch_strap',
        name: 'Hirsch Camelgrain Leather Watch Strap',
        price_paisa: 120000,
        qty: 1
      }
      setCart([{ product_id: strap.product_id, name: strap.name, price_paisa: strap.price_paisa, image_url: strap.image_url, qty: 1 }])
      setIsCartOpen(true)
      showToast('info', 'Scenario 1 Loaded', 'Item ₹1,200 is under ₹50,000 limit. Click Authorize Autonomously!')
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
      showToast('info', 'Scenario 2 Loaded', 'Item ₹45,000 exceeds ₹2,000 limit. Razorpay modal will trigger!')
    }
  }

  // ── Checkout Initiation & Execution ────────────────────────────────────────
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

      // Autonomous path (Under limit)
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
        showToast('autonomous', '⚡ Autonomous Settlement Completed!', `Agent settled ${initData.transaction_id} for ₹${(initData.final_amount_paisa / 100).toLocaleString('en-IN')} silently.`)
        fetchData()
      } else {
        // Human escalation path (Over limit)
        openRazorpayModal(initData)
      }
    } catch (err) {
      showToast('error', 'Gateway Notification', err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Razorpay Modal Trigger (Unchanged Gateway Flow) ────────────────────────
  const openRazorpayModal = (initData) => {
    showToast('escalation', '🛡️ Escalating to Human Shopper', 'Daily limit exceeded. Launching Razorpay test modal...')
    if (typeof window.Razorpay === 'undefined') {
      showToast('error', 'Razorpay Not Loaded', 'Please check your internet connection.')
      return
    }
    const options = {
      key: initData.razorpay_key_id || razorpayKeyId,
      amount: initData.final_amount_paisa,
      currency: initData.currency || 'INR',
      name: 'SHOP.CO Luxury Atelier',
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
          setLatestConfirmedPayment({
            transaction_id: initData.transaction_id,
            razorpay_payment_id: response.razorpay_payment_id,
            amount_paisa: initData.final_amount_paisa,
            timestamp: Date.now()
          })
          showToast('success', '🎉 Payment Verified & Settled!', `Razorpay Payment ${response.razorpay_payment_id} authorized. Order placed successfully!`)
          fetchData()
        } catch (confirmError) {
          showToast('error', 'Verification Failed', confirmError.message)
        }
      },
      prefill: { name: user?.name || 'Sri Krishna', email: 'shopper@shop.co', contact: '9999999999' },
      theme: { color: '#000000' },
      modal: {
        ondismiss: () => {
          showToast('info', 'Payment Cancelled', 'Razorpay checkout popup was dismissed.')
          setIsProcessing(false)
        }
      }
    }
    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', resp => showToast('error', 'Payment Failed', resp.error.description || 'Payment failed.'))
    rzp.open()
  }

  // ── Chat Panel → Razorpay Escalation Bridge ───────────────────────────────
  const handleChatEscalateToRazorpay = (checkoutResult) => {
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

  // ── Chat Panel → Order Placed Bridge ───────────────────────────────────────
  const handleChatOrderPlaced = (transactionId, flow) => {
    setCart([])
    setIsCartOpen(false)
    showToast(
      flow === 'AUTONOMOUS' ? 'autonomous' : 'success',
      flow === 'AUTONOMOUS' ? '⚡ Order Booked Autonomously!' : '🎉 Payment Verified!',
      `Receipt ${transactionId} confirmed. View under "📦 Orders".`
    )
    fetchData()
  }

  const remainingLimitPaisa = user ? Math.max(0, user.daily_spend_limit - user.daily_spend_accumulated) : 5000000

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* ── 1. THE TOP NAVIGATION BAR (Navbar) ── */}
      <Navbar
        user={user}
        cartCount={cart.reduce((acc, it) => acc + it.qty, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onToggleSettings={() => setShowSettingsModal(true)}
        onToggleChat={() => setIsChatPanelOpen(prev => !prev)}
        isChatOpen={isChatPanelOpen}
        onToggleOrders={() => setActiveView(prev => prev === 'orders' ? 'store' : 'orders')}
        activeView={activeView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleLogs={() => setShowLogsModal(true)}
      />

      {/* ── Toast Notifications ── */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md animate-bounce-short">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 ${
              notification.type === 'autonomous'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : notification.type === 'escalation'
                ? 'bg-blue-900 text-white border-blue-700'
                : notification.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : notification.type === 'upsell'
                ? 'bg-black text-white border-gray-700'
                : 'bg-neutral-900 text-white border-gray-800'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {notification.type === 'autonomous' && <Zap className="w-5 h-5 text-emerald-400" />}
              {notification.type === 'escalation' && <ShieldCheck className="w-5 h-5 text-blue-400" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {notification.type === 'upsell' && <Sparkles className="w-5 h-5 text-amber-400" />}
              {(notification.type === 'info' || notification.type === 'success') && <CheckCircle2 className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold font-heading">{notification.title}</h4>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT (Storefront vs My Orders) ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
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

      {/* ── 2. THE CHAT SLIDE PANEL (Drawer Overlay) ── */}
      <ChatPanel
        isOpen={isChatPanelOpen}
        onClose={() => {
          setIsChatPanelOpen(false)
          setInitialChatQuery(null)
        }}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveItem}
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
        latestConfirmedPayment={latestConfirmedPayment}
      />

      {/* ── CART SLIDE DRAWER ── */}
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

      {/* ── 3. SETTINGS & DYNAMIC LIMIT MODAL ── */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onUpdateLimit={handleUpdateLimit}
        onRunTestScenario={handleRunTestScenario}
        onResetDb={handleResetDb}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        razorpayKeyId={razorpayKeyId}
        setRazorpayKeyId={setRazorpayKeyId}
        razorpayKeySecret={razorpayKeySecret}
        setRazorpayKeySecret={setRazorpayKeySecret}
      />

      {/* ── 4. DEVELOPER SYSTEMS CONSOLE OVERLAY (Audit Trail Logs) ── */}
      <DeveloperConsoleModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        logs={auditLogs}
        onRefresh={fetchData}
        isLoading={isProcessing}
      />
    </div>
  )
}
