import React, { useState } from 'react'
import { Settings, Wallet, User, RefreshCw, Shield, ChevronRight, Zap, Database, AlertTriangle } from 'lucide-react'

const LIMIT_PRESETS = [
  { label: '₹5,000', value: 500000 },
  { label: '₹10,000', value: 1000000 },
  { label: '₹25,000', value: 2500000 },
  { label: '₹50,000', value: 5000000 },
  { label: '₹1,00,000', value: 10000000 },
]

export default function SettingsPage({ user, onUpdateLimit, onResetDb, auditLogs }) {
  const [limitInput, setLimitInput] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const currentLimit = user?.daily_spend_limit || 5000000
  const spent = user?.daily_spend_accumulated || 0
  const spentPct = Math.min(100, (spent / currentLimit) * 100)

  const handleSaveLimit = async () => {
    const val = parseInt(limitInput.replace(/,/g, ''), 10)
    if (isNaN(val) || val < 0) return
    setSaving(true)
    await onUpdateLimit(val * 100) // convert rupees to paisa
    setSaving(false)
    setLimitInput('')
  }

  const handlePreset = async (paisa) => {
    await onUpdateLimit(paisa)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(240,192,74,0.1)', border: '1px solid rgba(240,192,74,0.2)' }}>
          <Settings className="w-5 h-5" style={{ color: '#f0c04a' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manage your account and spending limits</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4" style={{ color: '#f0c04a' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Account Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #f0c04a, #c8952a)', color: '#0a0c10' }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Loading...'}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{user?.user_id || 'user_01'}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Member Since</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>2026</p>
          </div>
        </div>
      </div>

      {/* Spending Limit */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" style={{ color: '#f0c04a' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Autonomous Spending Limit</h2>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          If your cart total is under this limit, the AI agent settles your payment automatically with zero manual steps.
          Above this limit, a Razorpay window opens for manual verification.
        </p>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Spent today: ₹{(spent / 100).toLocaleString('en-IN')}</span>
            <span>Limit: ₹{(currentLimit / 100).toLocaleString('en-IN')}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${spentPct}%`, background: spentPct > 75 ? '#f43f5e' : 'linear-gradient(90deg, #10b981, #f0c04a)' }}
            />
          </div>
        </div>

        {/* Presets */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {LIMIT_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentLimit === p.value
                    ? 'text-black font-bold'
                    : 'btn-ghost'
                }`}
                style={currentLimit === p.value ? { background: 'linear-gradient(135deg, #f0c04a, #c8952a)' } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>₹</span>
            <input
              type="number"
              placeholder="Custom amount in rupees"
              value={limitInput}
              onChange={e => setLimitInput(e.target.value)}
              className="input-dark pl-8"
              min="0"
            />
          </div>
          <button
            onClick={handleSaveLimit}
            disabled={saving || !limitInput}
            className="btn-gold px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* AI Agent Info */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" style={{ color: '#10b981' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Agent Configuration</h2>
        </div>
        <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {[
            { label: 'AI Engine', value: 'Google Gemini 1.5 Flash', dot: 'bg-emerald-400' },
            { label: 'Memory', value: 'Per-user conversation history (last 30 turns)', dot: 'bg-emerald-400' },
            { label: 'Payment Gateway', value: 'Razorpay Test Mode', dot: 'bg-emerald-400' },
            { label: 'Settlement Mode', value: 'Autonomous + Human Override', dot: 'bg-blue-400' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 p-3 rounded-xl" style={{ background: 'rgba(240,192,74,0.06)', border: '1px solid rgba(240,192,74,0.15)', color: 'var(--text-secondary)' }}>
          <Shield className="w-3.5 h-3.5 inline mr-1" style={{ color: '#f0c04a' }} />
          All API keys are securely stored on the backend server and never exposed to the browser.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-rose-400">Danger Zone</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Reset the database to restore all initial products, users, and clear all orders and transactions.
          This action cannot be undone.
        </p>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 transition-all"
            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}
          >
            <Database className="w-3.5 h-3.5" />
            Reset Database
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onResetDb(); setShowResetConfirm(false) }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: '#f43f5e' }}
            >
              Yes, Reset Everything
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 rounded-xl text-xs btn-ghost"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
