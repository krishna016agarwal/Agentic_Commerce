import React, { useState, useEffect } from 'react'
import {
  Package, Zap, ShieldCheck, Clock, CheckCircle2, XCircle,
  Receipt, RefreshCw, ChevronDown, ChevronUp, Tag, ShoppingBag,
  ArrowLeft, ExternalLink
} from 'lucide-react'

function statusBadge(status) {
  switch (status) {
    case 'SUCCESS':
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        label: 'Completed'
      }
    case 'PENDING':
    case 'AWAITING_PAYMENT':
      return {
        icon: <Clock className="w-3.5 h-3.5" />,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        label: 'Processing'
      }
    case 'FAILED':
      return {
        icon: <XCircle className="w-3.5 h-3.5" />,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        label: 'Declined'
      }
    default:
      return {
        icon: <Clock className="w-3.5 h-3.5" />,
        color: 'text-gray-700 bg-gray-100 border-gray-200',
        label: status
      }
  }
}

function flowPill(flow) {
  if (flow === 'AUTONOMOUS') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full">
        <Zap className="w-3 h-3 text-emerald-600" />
        Autonomous Settlement
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100/70 border border-blue-300 px-2.5 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3 text-blue-600" />
      Razorpay Human Verified
    </span>
  )
}

function OrderItemCard({ order }) {
  const [expanded, setExpanded] = useState(true)
  const status = statusBadge(order.status)

  let items = []
  if (Array.isArray(order.items)) {
    items = order.items
  } else if (order.items_json) {
    try {
      items = JSON.parse(order.items_json)
    } catch {
      items = []
    }
  }

  const dateStr = new Date(order.created_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const paymentId = order.razorpay_payment_id || 'AUTONOMOUS_SETTLED'

  return (
    <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs hover:border-gray-300 transition-all duration-200">
      {/* Header bar of order */}
      <div className="p-5 sm:p-6 bg-gray-50/60 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase">Receipt:</span>
            <span className="text-sm font-mono font-bold text-black">{order.transaction_id}</span>
            {flowPill(order.flow_type)}
          </div>
          <p className="text-xs text-gray-500 font-sans">
            Placed on {dateStr}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Amount</p>
            <p className="text-lg sm:text-xl font-black font-heading text-black">
              ₹{(order.amount_paisa / 100).toLocaleString('en-IN')}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
            {status.icon}
            <span>{status.label}</span>
          </span>
        </div>
      </div>

      {/* Order Body / Items list */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3 rounded-2xl bg-[#F0F0F0]/50 border border-gray-100"
            >
              {/* Product Thumbnail */}
              <div className="w-16 h-16 rounded-xl bg-[#F0EEED] p-2 flex items-center justify-center flex-shrink-0 border border-gray-200/60">
                <img
                  src={item.image_url || '/assets/omega-watch.png'}
                  alt={item.name || item.product_id}
                  className="w-full h-full object-contain"
                  onError={e => { e.target.src = '/assets/omega-watch.png' }}
                />
              </div>

              {/* Product Name & Qty */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 truncate">
                  {item.name || item.product_id}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-mono">
                  <span>Qty: {item.qty}</span>
                  <span>•</span>
                  <span>₹{((item.price_paisa || 0) / 100).toLocaleString('en-IN')} each</span>
                </div>
              </div>

              {/* Item Subtotal */}
              <div className="text-right">
                <p className="text-sm font-bold font-heading text-black">
                  ₹{(((item.price_paisa || 0) * (item.qty || 1)) / 100).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Permanent Razorpay Payment ID & Security Verification Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-semibold">Razorpay Payment ID:</span>
            <span className="font-mono font-bold bg-gray-100 px-2.5 py-1 rounded-md text-gray-900 border border-gray-200">
              {paymentId}
            </span>
          </div>

          {order.razorpay_order_id && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-semibold">Razorpay Order ID:</span>
              <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                {order.razorpay_order_id}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage({ onBack }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/orders?user_id=user_01')
      if (!res.ok) throw new Error('Failed to load your orders.')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="py-6 space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors cursor-pointer"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-black tracking-tight">
              MY ORDERS
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Verified autonomous settlements and Razorpay gateway transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="px-4 py-2 rounded-full bg-[#F0F0F0] hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Orders</span>
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>

      {/* Orders List / Empty State */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Retrieving secured order receipts...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-3xl bg-rose-50 border border-rose-200 space-y-3">
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-[#F0F0F0]/50 border border-gray-200 p-8 space-y-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">No Orders Placed Yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Place an order through the store or chat with our AI agent to test autonomous or Razorpay escalated settlement.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-full bg-black text-white font-bold text-xs hover:bg-neutral-800 transition-all cursor-pointer"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <OrderItemCard key={order.transaction_id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
