import React, { useState, useMemo } from 'react'
import {
  Sparkles, ShoppingBag, ArrowRight, ShieldCheck, Tag, Zap,
  Star, Search, MessageCircle, SlidersHorizontal, CheckCircle2
} from 'lucide-react'

export default function Storefront({
  products = [],
  onAddToCart,
  onOpenChatWithQuery,
  userRemainingLimit = 5000000
}) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = ['All', 'Watches', 'Laptops', 'Audio', 'Electronics', 'Accessories', 'Tablets', 'Furniture']

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchesSearch = searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchQuery])

  return (
    <div className="space-y-6">
      {/* ── LUXURY HERO BANNER ── */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-r from-[#161b26] via-[#1a2130] to-[#0f141e]">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Autonomous Agentic Commerce • Track 1
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-100 leading-tight">
              ELEGANCE IN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#dfc79b] italic font-normal">MODESTY</span> & LUXURY
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              Experience the future of commerce. Chat with our catalog-aware AI Shopping Assistant, settle under-limit orders completely in the background, and seamlessly escalate high-value transactions to Razorpay Testnet.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={() => onOpenChatWithQuery && onOpenChatWithQuery("Explain the Omega watch")}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#c5a880] to-[#dfc79b] text-slate-950 font-semibold text-xs tracking-wide shadow-lg shadow-amber-900/30 hover:scale-105 transition-all flex items-center gap-2"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Explain the Omega Watch</span>
              </button>

              <button
                onClick={() => onOpenChatWithQuery && onOpenChatWithQuery("I want to buy a laptop")}
                className="px-4 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all flex items-center gap-2"
              >
                <span>Find Laptops with AI</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Hero Featured Card */}
          <div className="relative group w-48 sm:w-56 md:w-64 flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 p-3 bg-gradient-to-b from-[#212735] to-[#12161f] shadow-2xl">
              <img
                src="/assets/omega-watch.png"
                alt="Omega Seamaster Aqua Terra"
                className="w-full h-44 sm:h-52 object-contain filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 border border-amber-500/30">
                MASTER CHRONOMETER
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs font-serif font-bold text-slate-200">Omega Seamaster Aqua Terra</p>
                <p className="text-xs text-amber-400 font-mono font-semibold mt-0.5">₹45,000.00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTER BAR ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-serif font-bold text-slate-100">Live Product Catalog</h2>
            <p className="text-xs text-slate-400">Real-time inventory connected to SQLite WAL database</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog by name or keyword..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#121620] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const count = cat === 'All'
              ? products.length
              : products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  selectedCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#161b22] text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === cat ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── PRODUCT CATALOG GRID (Amazon/Flipkart Style) ── */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0e1117] border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-300">No products match your search.</p>
          <p className="text-xs text-slate-500">Try clearing the search query or selecting another category.</p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchQuery('') }}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const isUnderLimit = product.price_paisa <= userRemainingLimit
            const isOutStock = product.stock_qty <= 0

            return (
              <div
                key={product.product_id}
                className="rounded-2xl p-4 flex flex-col justify-between group relative overflow-hidden bg-[#0e1117] border border-slate-800 hover:border-amber-500/40 transition-all duration-300 shadow-xl"
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {product.category}
                  </span>

                  {product.badge && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Product Image Visual Container */}
                <div className="relative h-44 rounded-xl overflow-hidden bg-[#090d14] flex items-center justify-center p-3 border border-slate-800/80 group-hover:border-slate-700 transition-colors">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "/assets/omega-watch.png"
                    }}
                  />

                  {isOutStock && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold px-3 py-1 rounded-full">
                        OUT OF STOCK
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="mt-3 space-y-1.5 flex-1">
                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Pricing & Policy Tag */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-mono font-bold text-slate-100">
                      ₹{(product.price_paisa / 100).toLocaleString('en-IN')}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      Stock: <span className={product.stock_qty > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{product.stock_qty}</span>
                    </span>
                  </div>

                  {/* Gateway Policy Pill */}
                  <div className="text-[10px] font-mono">
                    {isUnderLimit ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Autonomous Eligible (Under Limit)
                      </span>
                    ) : (
                      <span className="text-rose-400/90 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-rose-400" />
                        Requires Razorpay Modal (Over Limit)
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenChatWithQuery && onOpenChatWithQuery(`Explain the ${product.name}`)}
                      className="py-2 px-2.5 rounded-xl text-[11px] font-semibold bg-[#161b24] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                      title="Ask AI agent to explain features"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ask AI</span>
                    </button>

                    <button
                      disabled={isOutStock}
                      onClick={() => onAddToCart(product)}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isOutStock
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-amber-900/20 active:scale-98'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isOutStock ? 'Sold Out' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
