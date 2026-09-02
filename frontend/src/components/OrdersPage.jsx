import React, { useState, useEffect } from 'react'
import {
  Package, Zap, ShieldCheck, Clock, CheckCircle2, XCircle,
  Receipt, RefreshCw, ChevronDown, ChevronUp, Tag, ShoppingBag,
  ArrowLeft
} from 'lucide-react'

function statusConfig(status) {
  switch (status) {
    case 'SUCCESS':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        label: 'Delivered'
      }
    case 'PENDING':
    case 'AWAITING_PAYMENT':
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: 'Pending'
      }
    case 'FAILED':
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/30',
        label: 'Failed'
      }
    default:
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-slate-400',
        bg: 'bg-slate-800 border-slate-700',
        label: status
      }
  }
}

function flowBadge(flow) {
  if (flow === 'AUTONOMOUS') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
        <Zap className="w-2.5 h-2.5" /> Autonomous
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">
      <ShieldCheck className="w-2.5 h-2.5" /> Razorpay Verified
    </span>
  )
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const status = statusConfig(order.status)

  let items = []
  try {
    items = JSON.parse(order.items_json || '[]')
  } catch {
    items = []
  }

  const dateStr = new Date(order.created_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0e1117] overflow-hidden hover:border-slate-700 transition-all duration-200 group">
      {/* Card Header */}
      <div className="px-5 py-4 flex items-start gap-4">
        {/* Status Icon */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${status.bg} ${status.color}`}>
          {status.icon}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-mono text-slate-500 mb-0.5">Order ID</p>
              <p className="text-sm font-mono font-bold text-slate-100 truncate max-w-[220px]">
                {order.transaction_id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-amber-400">
                ₹{(order.amount_paisa / 100).toLocaleString('en-IN')}
              </p>
              {order.discount_paisa > 0 && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 justify-end">
                  <Tag className="w-3 h-3" />
                  -₹{(order.discount_paisa / 100).toLocaleString('en-IN')} discount
                </p>
              )}
            </div>
          </div>

          {/* Meta Row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
            {flowBadge(order.flow_type)}
            <span className="text-[11px] text-slate-500">{dateStr}</span>
          </div>

          {/* Razorpay Payment ID */}
          {order.razorpay_payment_id && (
            <p className="mt-1.5 text-[10px] font-mono text-slate-600">
              Razorpay: <span className="text-slate-500">{order.razorpay_payment_id}</span>
            </p>
          )}
        </div>
      </div>

      {/* Expand/Collapse */}
      <div className="border-t border-slate-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all"
        >
          <span className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            {items.length} item{items.length !== 1 ? 's' : ''} ordered
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="px-5 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
            {items.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No item details available.</p>
            ) : (
              items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">{item.name || item.product_id}</p>
                    <p className="text-[11px] text-slate-500">Qty: {item.qty}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    ₹{((item.price_paisa * item.qty) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}

            {/* Receipt-style summary */}
            <div className="mt-3 p-3 rounded-xl bg-[#090d14] border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Receipt</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{(order.amount_paisa / 100 + order.discount_paisa / 100).toLocaleString('en-IN')}</span>
                </div>
                {order.discount_paisa > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount {order.discount_code ? `(${order.discount_code})` : ''}</span>
                    <span>-₹{(order.discount_paisa / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-100 pt-1 border-t border-slate-700 mt-1">
                  <span>Total Paid</span>
                  <span className="text-amber-400">₹{(order.amount_paisa / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage({ onBack }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // ALL | SUCCESS | AUTONOMOUS | HUMAN_OVERRIDE

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/orders?user_id=user_01&limit=50')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter(o => {
    if (filter === 'ALL') return true
    if (filter === 'AUTONOMOUS') return o.flow_type === 'AUTONOMOUS'
    if (filter === 'RAZORPAY') return o.flow_type === 'HUMAN_OVERRIDE'
    return o.status === filter
  })

  const totalSpent = orders
    .filter(o => o.status === 'SUCCESS')
    .reduce((sum, o) => sum + o.amount_paisa, 0)

  const autonomousCount = orders.filter(o => o.flow_type === 'AUTONOMOUS' && o.status === 'SUCCESS').length
  const razorpayCount = orders.filter(o => o.flow_type === 'HUMAN_OVERRIDE' && o.status === 'SUCCESS').length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg bg-[#161b22] border border-slate-800 hover:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Store
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">My Orders</h1>
          <p className="text-xs text-slate-400 mt-0.5">Your complete purchase history & receipts</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#0e1117] border border-slate-800 p-4 text-center">
          <p className="text-2xl font-mono font-bold text-amber-400">
            ₹{(totalSpent / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total Spent</p>
        </div>
        <div className="rounded-2xl bg-[#0e1117] border border-slate-800 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <p className="text-2xl font-mono font-bold text-emerald-400">{autonomousCount}</p>
          </div>
          <p className="text-xs text-slate-400 mt-1">Autonomous Orders</p>
        </div>
        <div className="rounded-2xl bg-[#0e1117] border border-slate-800 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <p className="text-2xl font-mono font-bold text-blue-400">{razorpayCount}</p>
          </div>
          <p className="text-xs text-slate-400 mt-1">Razorpay Verified</p>
        </div>
      </div>

      {/* Filter Pills + Refresh */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'ALL', label: 'All Orders' },
            { key: 'SUCCESS', label: '✅ Completed' },
            { key: 'AUTONOMOUS', label: '⚡ Autonomous' },
            { key: 'RAZORPAY', label: '🛡️ Razorpay' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filter === f.key
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#161b22] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="p-2 rounded-lg bg-[#161b22] border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading your orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#161b22] border border-slate-800 flex items-center justify-center">
            <Package className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">No orders yet</p>
            <p className="text-xs text-slate-500 mt-1">
              {filter === 'ALL'
                ? 'Add items to your cart and place an order to see them here.'
                : `No ${filter.toLowerCase()} orders found.`
              }
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <OrderCard key={order.transaction_id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
