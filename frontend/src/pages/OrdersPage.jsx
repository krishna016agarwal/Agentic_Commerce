import React from 'react'
import { Package, CheckCircle2, Clock, RefreshCw, ShoppingBag, Zap, User, Receipt } from 'lucide-react'

function OrderCard({ order }) {
  const amountINR = (order.amount_paisa / 100).toLocaleString('en-IN')
  const date = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const isAutonomous = order.flow_type === 'AUTONOMOUS'

  return (
    <div className="rounded-2xl overflow-hidden animate-fadeIn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isAutonomous ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
            {isAutonomous
              ? <Zap className="w-4 h-4 text-emerald-400" />
              : <User className="w-4 h-4 text-blue-400" />
            }
          </div>
          <div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{order.transaction_id}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{date}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0c04a' }}>
            ₹{amountINR}
          </p>
          <div className="flex items-center gap-1 justify-end mt-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-semibold">Delivered</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-4 space-y-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: 'rgba(255,255,255,0.06)' }}>
                📦
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Qty: {item.qty}</p>
              </div>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              ₹{(item.price_paisa * item.qty / 100).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between gap-3 text-xs" style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="flex items-center gap-4">
          <span className={`badge ${isAutonomous ? 'badge-emerald' : 'badge-blue'}`}>
            {isAutonomous ? '⚡ Autonomous' : '👤 Manual Pay'}
          </span>
          {order.discount_code && (
            <span className="badge badge-gold">🏷️ {order.discount_code}</span>
          )}
        </div>
        {order.razorpay_payment_id && (
          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
            {order.razorpay_payment_id}
          </span>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage({ orders, onRefresh }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(240,192,74,0.1)', border: '1px solid rgba(240,192,74,0.2)' }}>
            <Package className="w-5 h-5" style={{ color: '#f0c04a' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
              My Orders
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {orders.length} completed {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs btn-ghost"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: 'Total Orders',
              value: orders.length,
              icon: <ShoppingBag className="w-4 h-4" style={{ color: '#f0c04a' }} />,
              color: 'rgba(240,192,74,0.1)'
            },
            {
              label: 'Total Spent',
              value: `₹${(orders.reduce((a, o) => a + o.amount_paisa, 0) / 100).toLocaleString('en-IN')}`,
              icon: <Receipt className="w-4 h-4 text-emerald-400" />,
              color: 'rgba(16,185,129,0.1)'
            },
            {
              label: 'Auto-Settled',
              value: orders.filter(o => o.flow_type === 'AUTONOMOUS').length,
              icon: <Zap className="w-4 h-4 text-blue-400" />,
              color: 'rgba(59,130,246,0.1)'
            }
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: stat.color }}>{stat.icon}</div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Orders */}
      {orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No orders yet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Start shopping or chat with our AI agent to discover products and place your first order!
          </p>
          <div className="flex items-center gap-2 text-xs p-3 rounded-xl mx-auto inline-flex" style={{ background: 'rgba(240,192,74,0.08)', border: '1px solid rgba(240,192,74,0.2)', color: '#f0c04a' }}>
            <Clock className="w-4 h-4" />
            Completed orders will appear here instantly after purchase
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <OrderCard key={order.transaction_id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
