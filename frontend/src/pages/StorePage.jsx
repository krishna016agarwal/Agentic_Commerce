import React, { useState, useMemo } from 'react'
import { ShoppingCart, Star, Zap, MessageCircle, TrendingUp, Tag } from 'lucide-react'

const CATEGORIES = ['All', 'Watches', 'Electronics', 'Audio', 'Laptops', 'Tablets', 'Accessories', 'Furniture']

const BADGE_STYLE = {
  'AUTONOMOUS READY': 'badge-emerald',
  'LUXURY ICON': 'badge-gold',
  'LIMITED EDITION': 'badge-purple',
  'BESTSELLER': 'badge-blue',
  'TOP RATED': 'badge-blue',
  'PRO CREATOR': 'badge-purple',
  'APPLE M3': 'badge-blue',
  'PRO TABLET': 'badge-purple',
  'APPLE EXCLUSIVE': 'badge-blue',
  'HIGH REFRESH': 'badge-emerald',
  'ERGONOMIC PRO': 'badge-gold',
  'HANDCRAFTED': 'badge-gold',
  'UPSELL PICK': 'badge-gold',
  'RUGGED': 'badge-rose',
  'OUT OF STOCK': 'badge-rose',
  'HIGH DEMAND': 'badge-rose',
}

function ProductCard({ product, onAddToCart, onOpenChat }) {
  const priceINR = (product.price_paisa / 100).toLocaleString('en-IN')
  const badgeClass = BADGE_STYLE[product.badge] || 'badge-blue'

  return (
    <div className="card-product flex flex-col group animate-fadeIn">
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
        <img
          src={product.image_url}
          alt={product.name}
          className="product-img"
          loading="lazy"
          onError={e => { e.target.src = `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80` }}
        />
        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3">
            <span className={`badge ${badgeClass}`}>{product.badge}</span>
          </div>
        )}
        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
            <span className="badge badge-rose text-sm px-4 py-2">Out of Stock</span>
          </div>
        )}
        {/* Quick chat overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-black btn-gold"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask AI Agent
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{product.category}</p>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {product.name}
          </h3>
        </div>

        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {product.description}
        </p>

        <div className="flex items-center gap-1 mt-auto">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>4.8</span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div>
            <span className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0c04a' }}>
              ₹{priceINR}
            </span>
          </div>
          {product.in_stock && (
            <span className="text-[10px]" style={{ color: '#10b981' }}>✓ In Stock ({product.stock_qty})</span>
          )}
        </div>

        <button
          onClick={() => onAddToCart(product)}
          disabled={!product.in_stock}
          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
            product.in_stock
              ? 'btn-gold'
              : 'opacity-40 cursor-not-allowed'
          }`}
          style={!product.in_stock ? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  )
}

export default function StorePage({ products, searchQuery, onAddToCart, onOpenChat, remainingLimit }) {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filtered = useMemo(() => {
    let list = products
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.keywords || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [products, selectedCategory, searchQuery])

  const inStockCount = products.filter(p => p.in_stock).length

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-8 p-8 sm:p-12"
        style={{
          background: 'linear-gradient(135deg, #0f1a2e 0%, #1a0f2e 50%, #0f1a2e 100%)',
          border: '1px solid var(--border)'
        }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(240,192,74,0.3) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(99,102,241,0.2) 0%, transparent 60%)' }} />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-emerald flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" />
              AI-Powered Shopping
            </span>
            <span className="badge badge-gold flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              Autonomous Checkout
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Premium Products,<br />
            <span style={{ color: '#f0c04a' }}>Intelligent Commerce</span>
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Discover curated luxury and technology products. Chat with our AI agent to get personalized recommendations — it can even place your order automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={onOpenChat} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl font-bold">
              <MessageCircle className="w-4 h-4" />
              Chat with AI Agent
            </button>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Tag className="w-4 h-4" style={{ color: '#f0c04a' }} />
              Daily Limit: ₹{(remainingLimit / 100).toLocaleString('en-IN')} remaining
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`category-pill flex-shrink-0 ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
        <span className="text-xs ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} products · {inStockCount} in stock
        </span>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No products found</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Try a different search or ask the AI agent for help
          </p>
          <button onClick={onOpenChat} className="btn-gold mt-4 px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Ask AI Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(product => (
            <ProductCard
              key={product.product_id}
              product={product}
              onAddToCart={onAddToCart}
              onOpenChat={onOpenChat}
            />
          ))}
        </div>
      )}
    </div>
  )
}
