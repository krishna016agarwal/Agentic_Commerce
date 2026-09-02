import React, { useState, useRef, useEffect } from 'react'
import { Bot, User, Send, Sparkles, Code, ChevronDown, ChevronUp, ShoppingBag, ArrowRight } from 'lucide-react'

export default function ChatBot({
  onAddToCart,
  userRemainingLimit,
  geminiKey
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Hello! I am your AI Buyer Agent. I can search our catalog, negotiate bundle discounts with the Seller Agent, and route purchases through our deterministic safety gateway. What are you looking for today?',
      intent: null,
      offer: null,
      products: []
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showJsonInspector, setShowJsonInspector] = useState(false)
  const [lastProtocolPayload, setLastProtocolPayload] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (customText = null) => {
    const textToSend = customText || input
    if (!textToSend.trim() || isLoading) return

    const userMsg = { sender: 'user', text: textToSend }
    setMessages(prev => [...prev, userMsg])
    if (!customText) setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_01',
          message: textToSend,
          gemini_api_key: geminiKey || null
        })
      })

      const data = await response.json()
      
      const agentMsg = {
        sender: 'agent',
        text: data.message,
        intent: data.intent,
        offer: data.catalog_offer,
        products: data.recommended_products || []
      }

      setMessages(prev => [...prev, agentMsg])
      setLastProtocolPayload({
        intent: data.intent,
        checkout_trigger: data.checkout_trigger,
        catalog_offer: data.catalog_offer
      })
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: 'Encountered an issue communicating with the catalog agent. Please try again.',
          products: []
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const promptChips = [
    "Show Omega Seamaster watches",
    "Looking for embroidered silk abayas",
    "Dell Inspiron workstation with mouse",
    "What items are under ₹10,000?"
  ]

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl flex flex-col h-[580px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">AI Buyer Agent</h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono">
                A2A Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Intelligent Catalog Negotiation & Intent Extraction</p>
          </div>
        </div>

        {/* Toggle JSON Schema Inspector */}
        <button
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title="Inspect structured A2A JSON payloads"
        >
          <Code className="w-3.5 h-3.5 text-amber-400" />
          <span>A2A Protocol</span>
          {showJsonInspector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Collapsible JSON Protocol Inspector */}
      {showJsonInspector && lastProtocolPayload && (
        <div className="my-2 p-3 rounded-xl bg-[#090d14] border border-amber-500/30 text-[11px] font-mono overflow-x-auto max-h-40">
          <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>M2M Structured Payload (Buyer &rarr; Seller Agent):</span>
          </div>
          <pre className="text-slate-300">
            {JSON.stringify(lastProtocolPayload, null, 2)}
          </pre>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2 max-w-[88%]">
              {msg.sender === 'agent' && (
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-br-none shadow-md shadow-amber-900/20'
                    : 'bg-[#141923] text-slate-200 border border-slate-800 rounded-bl-none shadow-lg'
                }`}
              >
                {msg.text}

                {/* Structured Product Recommendations in Agent Message */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60">
                    <span className="text-[10px] uppercase font-mono text-amber-400 block font-bold">
                      Matched Catalog Items:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.products.map((prod) => (
                        <div
                          key={prod.product_id}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#0e121a] border border-slate-700/80 gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-200 text-xs truncate">
                              {prod.name}
                            </p>
                            <p className="text-[11px] font-mono text-amber-400 font-bold">
                              ₹{(prod.price_paisa / 100).toLocaleString('en-IN')}
                            </p>
                          </div>

                          <button
                            disabled={!prod.in_stock}
                            onClick={() => onAddToCart(prod)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                              prod.in_stock
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>{prod.in_stock ? 'Add' : 'Sold Out'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            <span className="font-mono text-[11px]">Buyer Agent parsing intent & catalog...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        {promptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-2.5 py-1 rounded-full bg-[#161b24] hover:bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Buyer Agent to search, compare, or bundle..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#121620] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white shadow-md shadow-amber-900/30 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
