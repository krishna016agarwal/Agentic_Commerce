import React, { useState } from 'react'
import { Sliders, Shield, Zap, RefreshCw, Key, CheckCircle2, AlertCircle, X, ChevronRight, Lock } from 'lucide-react'

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  onUpdateLimit,
  onRunTestScenario,
  onResetDb,
  geminiKey,
  setGeminiKey,
  razorpayKeyId,
  setRazorpayKeyId,
  razorpayKeySecret,
  setRazorpayKeySecret
}) {
  const [activeTab, setActiveTab] = useState('policy')
  const [sliderLimitINR, setSliderLimitINR] = useState(
    user ? Math.round(user.daily_spend_limit / 100) : 50000
  )
  const [savingLimit, setSavingLimit] = useState(false)

  if (!isOpen) return null

  const handleSliderChange = (e) => {
    setSliderLimitINR(Number(e.target.value))
  }

  const handleApplyLimit = async (limitInr) => {
    setSavingLimit(true)
    const paisa = (limitInr || sliderLimitINR) * 100
    if (onUpdateLimit) await onUpdateLimit(paisa)
    setSavingLimit(false)
  }

  const presetLimits = [1000, 5000, 20000, 50000, 100000]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col text-gray-900 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight font-heading">
                Settings & Safety Policy
              </h2>
              <p className="text-xs text-gray-500">
                Configure Dynamic UAP Limits, Test Scenarios & Gateway Keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-100 px-6 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('policy')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'policy'
                ? 'border-black text-black font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            🛡️ Spending Policy & Limits
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'scenarios'
                ? 'border-black text-black font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            ⚡ Test Scenarios
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'keys'
                ? 'border-black text-black font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            🔑 API Gateway Config
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'policy' && (
            <div className="space-y-5">
              {/* Daily Limit Slider Card */}
              <div className="p-5 rounded-2xl bg-[#F0F0F0] border border-gray-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    UAP Dynamic Spending Limit
                  </span>
                  <span className="text-xl font-black font-heading text-black">
                    ₹{sliderLimitINR.toLocaleString('en-IN')}
                  </span>
                </div>

                <input
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={sliderLimitINR}
                  onChange={handleSliderChange}
                  className="w-full accent-black h-2 bg-gray-300 rounded-lg cursor-pointer"
                />

                {/* Preset Pills */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  {presetLimits.map(val => (
                    <button
                      key={val}
                      onClick={() => {
                        setSliderLimitINR(val)
                        handleApplyLimit(val)
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        sliderLimitINR === val
                          ? 'bg-black text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      ₹{(val).toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleApplyLimit(sliderLimitINR)}
                    disabled={savingLimit}
                    className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingLimit ? 'Saving Limit...' : 'Save Dynamic Limit'}
                  </button>
                </div>
              </div>

              {/* Current Status Info */}
              {user && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-gray-500 font-medium">Accumulated Spend Today:</p>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      ₹{(user.daily_spend_accumulated / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-emerald-700 font-medium">Available Autonomous Budget:</p>
                    <p className="text-base font-bold text-emerald-700 mt-1">
                      ₹{Math.max(0, (user.daily_spend_limit - user.daily_spend_accumulated) / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Database reset */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Reset Database & Catalog Stock</p>
                  <p className="text-[11px] text-gray-500">Restores initial inventory quantities and clears test orders</p>
                </div>
                <button
                  onClick={onResetDb}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset DB</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Run 1-click test scenarios to demonstrate Autonomous checkout vs Human Escalation to judges:
              </p>

              {/* Scenario 1 */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-bold text-emerald-900">Scenario 1: Autonomous Under-Limit</h4>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Sets limit to ₹50,000 and adds ₹1,200 Watch Strap to cart. Processes silently on backend with zero friction.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onRunTestScenario('under_limit')
                    onClose()
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  Load Scenario 1
                </button>
              </div>

              {/* Scenario 2 */}
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <h4 className="text-xs font-bold text-rose-900">Scenario 2: Escalation Over-Limit</h4>
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Sets limit to ₹2,000 and adds ₹45,000 Omega Chronometer. Triggers Razorpay test popup modal automatically.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onRunTestScenario('over_limit')
                    onClose()
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer"
                >
                  Load Scenario 2
                </button>
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Razorpay Key ID (Testnet):</label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={e => setRazorpayKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-gray-900 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Razorpay Key Secret:</label>
                <input
                  type="password"
                  value={razorpayKeySecret}
                  onChange={e => setRazorpayKeySecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-gray-900 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Gemini API Key (Optional Override):</label>
                <input
                  type="password"
                  placeholder="Backend .env is used by default"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-gray-900 focus:outline-none focus:border-black"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Gemini Flash is configured in backend/.env. You can specify a custom key here if testing external keys.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
