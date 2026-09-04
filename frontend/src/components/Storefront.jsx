import React, { useState, useMemo } from 'react'
import {
  Sparkles, ShoppingBag, ArrowRight, ShieldCheck, Tag, Zap,
  Star, Search, MessageCircle, SlidersHorizontal, CheckCircle2,
  ChevronRight, ChevronLeft, Mail, ArrowLeft, Heart
} from 'lucide-react'

// ── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ rating = 4.5, count = 5 }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex text-amber-400">
        {[...Array(count)].map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-current" />
        ))}
      </div>
      <span className="text-xs text-gray-500 font-medium ml-1">
        {rating}/5
      </span>
    </div>
  )
}

// ── 4-point Sparkle Star Vector (Exact from Screenshot 4) ────────────────────
function SparkleStar({ className = "w-10 h-10 text-black" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M50 0 C50 35, 65 50, 100 50 C65 50, 50 65, 50 100 C50 65, 35 50, 0 50 C35 50, 50 35, 50 0 Z" />
    </svg>
  )
}

// ── Customer Testimonial Data (Exact from Screenshot 1) ──────────────────────
const CUSTOMER_REVIEWS = [
  {
    id: 1,
    name: "Sarah M.",
    verified: true,
    rating: 5,
    text: "I'm blown away by the quality and style of the clothes I received from Shop.co. From casual wear to elegant dresses, every piece I've bought has exceeded my expectations."
  },
  {
    id: 2,
    name: "Alex K.",
    verified: true,
    rating: 5,
    text: "Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co. The range of options they offer is truly remarkable, catering to a variety of tastes and occasions."
  },
  {
    id: 3,
    name: "James L.",
    verified: true,
    rating: 5,
    text: "As someone who's always on the lookout for unique fashion pieces, I'm thrilled to have stumbled upon Shop.co. The selection of clothes is not only diverse but also on point with the latest trends."
  },
  {
    id: 4,
    name: "Mooen T.",
    verified: true,
    rating: 5,
    text: "The autonomous checkout through the AI assistant was pure magic. I stated what I needed, it verified my spending limit in the background, and secured my order in 3 seconds flat."
  }
]

export default function Storefront({
  products = [],
  onAddToCart,
  onOpenChatWithQuery,
  userRemainingLimit = 5000000
}) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStyle, setSelectedStyle] = useState('All')
  const [selectedSize, setSelectedSize] = useState('Large')
  const [selectedColor, setSelectedColor] = useState('black')
  const [priceRange, setPriceRange] = useState(150000)
  const [searchQuery, setSearchQuery] = useState('')
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
  const [customerReviewIndex, setCustomerReviewIndex] = useState(0)

  // Categories list
  const filterCategories = ['All', 'T-shirts', 'Shorts', 'Shirts', 'Hoodie', 'Jeans', 'Watches', 'Electronics', 'Laptops', 'Audio', 'Accessories']
  const dressStyles = ['Casual', 'Formal', 'Party', 'Gym']
  const sizes = ['XX-Small', 'X-Small', 'Small', 'Medium', 'Large', 'X-Large', '2X-Large', '3X-Large', '4X-Large']
  const colors = [
    { name: 'green', bg: 'bg-emerald-500' },
    { name: 'red', bg: 'bg-rose-500' },
    { name: 'yellow', bg: 'bg-amber-400' },
    { name: 'orange', bg: 'bg-orange-500' },
    { name: 'cyan', bg: 'bg-cyan-400' },
    { name: 'blue', bg: 'bg-blue-600' },
    { name: 'purple', bg: 'bg-purple-600' },
    { name: 'pink', bg: 'bg-pink-500' },
    { name: 'white', bg: 'bg-white border border-gray-300' },
    { name: 'black', bg: 'bg-black' }
  ]

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase() ||
        p.name.toLowerCase().includes(selectedCategory.toLowerCase())

      const matchesStyle = selectedStyle === 'All' ||
        p.description.toLowerCase().includes(selectedStyle.toLowerCase()) ||
        p.keywords.toLowerCase().includes(selectedStyle.toLowerCase()) ||
        p.name.toLowerCase().includes(selectedStyle.toLowerCase())

      const matchesSearch = searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPrice = (p.price_paisa / 100) <= priceRange

      return matchesCategory && matchesStyle && matchesSearch && matchesPrice
    })
  }, [products, selectedCategory, selectedStyle, searchQuery, priceRange])

  // New arrivals & top selling subsets
  const newArrivals = useMemo(() => products.slice(0, 4), [products])
  const topSelling = useMemo(() => products.slice(4, 8).length > 0 ? products.slice(4, 8) : products.slice(0, 4), [products])

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    if (newsletterEmail) {
      setNewsletterSubscribed(true)
      setTimeout(() => setNewsletterSubscribed(false), 4000)
      setNewsletterEmail('')
    }
  }

  const handleNextReview = () => {
    setCustomerReviewIndex((prev) => (prev + 1) % CUSTOMER_REVIEWS.length)
  }

  const handlePrevReview = () => {
    setCustomerReviewIndex((prev) => (prev - 1 + CUSTOMER_REVIEWS.length) % CUSTOMER_REVIEWS.length)
  }

  // Helper product card renderer matching Screenshot 2 & 3
  const renderProductCard = (product) => {
    const isUnderLimit = product.price_paisa <= userRemainingLimit
    const isOutStock = product.stock_qty <= 0
    const priceINR = (product.price_paisa / 100).toLocaleString('en-IN')
    const originalPrice = Math.round((product.price_paisa / 100) * 1.25).toLocaleString('en-IN')

    return (
      <div
        key={product.product_id}
        className="flex flex-col justify-between group transition-all"
      >
        {/* Rounded Image Container (Exact bg-[#F0EEED] rounded-[20px]) */}
        <div className="relative aspect-square w-full rounded-[20px] bg-[#F0EEED] flex items-center justify-center p-6 overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
          <img
            src={product.image_url}
            alt={product.name}
            className="max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.src = "/assets/omega-watch.png" }}
          />

          {/* Autonomous / Escalation Status Pill */}
          <div className="absolute top-3 left-3">
            {isUnderLimit ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                <Zap className="w-2.5 h-2.5 text-emerald-600" />
                Under Limit
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                Escalates
              </span>
            )}
          </div>

          {/* Badge */}
          {product.badge && (
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-black text-white">
                {product.badge}
              </span>
            </div>
          )}

          {isOutStock && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="mt-3.5 space-y-1">
          <h3 className="text-base font-extrabold text-black font-heading truncate group-hover:opacity-80 transition-opacity">
            {product.name}
          </h3>

          {/* Star Rating */}
          <StarRating rating={4.5} />

          {/* Price with discount pill */}
          <div className="flex items-center gap-2.5 pt-1">
            <span className="text-xl font-black font-heading text-black">
              ₹{priceINR}
            </span>
            <span className="text-base font-bold text-gray-400 line-through">
              ₹{originalPrice}
            </span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              -20%
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenChatWithQuery && onOpenChatWithQuery(`Explain the ${product.name}`)}
              className="py-2 px-3 rounded-full text-xs font-semibold bg-[#F0F0F0] hover:bg-gray-200 text-gray-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
            <button
              disabled={isOutStock}
              onClick={() => onAddToCart(product)}
              className={`py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isOutStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-neutral-800 active:scale-95 shadow-xs'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isOutStock ? 'Sold' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-16 sm:space-y-20">

      {/* ════════════════════════════════════════════════════════════════════════
          1. HERO SECTION (Exact Replication of Screenshot 4)
         ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative rounded-[32px] sm:rounded-[40px] bg-[#F2F0F1] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-10">

          {/* Left Column: Heading, Subtitle, CTA, Counters */}
          <div className="max-w-xl space-y-6 sm:space-y-8 text-left z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-black font-heading uppercase leading-[1.05] tracking-tighter">
              FIND CLOTHES THAT MATCHES YOUR STYLE
            </h1>

            <p className="text-sm sm:text-base text-gray-600 font-sans leading-relaxed max-w-lg">
              Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.
            </p>

            <div>
              <a
                href="#catalog"
                className="inline-block px-12 sm:px-14 py-3.5 sm:py-4 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
              >
                Shop Now
              </a>
            </div>

            {/* Stats Metrics Counter Row */}
            <div className="pt-6 sm:pt-8 grid grid-cols-3 divide-x divide-gray-300">
              <div className="pr-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-black">
                  200+
                </p>
                <p className="text-xs text-gray-500 mt-1">International Brands</p>
              </div>
              <div className="px-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-black">
                  2,000+
                </p>
                <p className="text-xs text-gray-500 mt-1">High-Quality Products</p>
              </div>
              <div className="pl-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-black">
                  30,000+
                </p>
                <p className="text-xs text-gray-500 mt-1">Happy Customers</p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Imagery with Vector Sparkle Stars */}
          <div className="relative w-full lg:w-[50%] flex items-center justify-center">
            {/* Top Right Sparkle Star */}
            <div className="absolute -top-6 right-6 sm:right-12 z-20 animate-pulse">
              <SparkleStar className="w-16 h-16 sm:w-20 sm:h-20 text-black" />
            </div>

            {/* Left Mid Sparkle Star */}
            <div className="absolute top-1/2 left-2 sm:left-6 z-20">
              <SparkleStar className="w-10 h-10 sm:w-12 sm:h-12 text-black" />
            </div>

            {/* Hero Image */}
            <div className="relative w-full max-w-md lg:max-w-lg flex items-center justify-center">
              <img
                src="/download(1).webp"
                alt="Shop.co Fashion Model"
                className="w-full h-auto max-h-[520px] object-cover rounded-[32px] shadow-2xl filter drop-shadow-xl select-none"
                onError={(e) => {
                  e.currentTarget.src = "/assets/download(1).webp"
                }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          2. LUXURY BRAND RIBBON (Exact Replication of Screenshot 4)
         ════════════════════════════════════════════════════════════════════════ */}
      <section id="brands" className="rounded-2xl sm:rounded-3xl bg-black text-white py-8 sm:py-10 px-6 sm:px-12 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-8 sm:gap-12 text-center select-none">
          <span className="font-serif font-bold text-2xl sm:text-3xl tracking-widest uppercase hover:text-gray-300 transition-colors">
            VERSACE
          </span>
          <span className="font-serif font-black text-3xl sm:text-4xl tracking-tighter uppercase italic hover:text-gray-300 transition-colors">
            ZARA
          </span>
          <span className="font-sans font-bold text-2xl sm:text-3xl tracking-widest uppercase hover:text-gray-300 transition-colors">
            GUCCI
          </span>
          <span className="font-sans font-black text-2xl sm:text-3xl tracking-wide uppercase hover:text-gray-300 transition-colors">
            PRADA
          </span>
          <span className="font-sans font-light text-xl sm:text-2xl tracking-widest hover:text-gray-300 transition-colors">
            Calvin Klein
          </span>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          3. NEW ARRIVALS SECTION (Exact Replication of Screenshot 3)
         ════════════════════════════════════════════════════════════════════════ */}
      <section id="new-arrivals" className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-black tracking-tight uppercase">
            NEW ARRIVALS
          </h2>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map(product => renderProductCard(product))}
        </div>

        {/* View All Pill Button */}
        <div className="text-center pt-2">
          <a
            href="#catalog"
            className="inline-block px-14 py-3 rounded-full border border-gray-300 hover:border-black text-black text-sm font-semibold hover:bg-black hover:text-white transition-all cursor-pointer"
          >
            View All
          </a>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* ════════════════════════════════════════════════════════════════════════
          4. TOP SELLING SECTION (Exact Replication of Screenshot 3)
         ════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-black tracking-tight uppercase">
            TOP SELLING
          </h2>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topSelling.map(product => renderProductCard(product))}
        </div>

        {/* View All Pill Button */}
        <div className="text-center pt-2">
          <a
            href="#catalog"
            className="inline-block px-14 py-3 rounded-full border border-gray-300 hover:border-black text-black text-sm font-semibold hover:bg-black hover:text-white transition-all cursor-pointer"
          >
            View All
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          5. BROWSE BY DRESS STYLE (Exact Replication of Screenshot 1 Bento Grid)
         ════════════════════════════════════════════════════════════════════════ */}
      <section className="rounded-[36px] sm:rounded-[40px] bg-[#F0F0F0] p-8 sm:p-12 lg:p-16 space-y-10">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-black tracking-tight uppercase">
            BROWSE BY DRESS STYLE
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Casual (col 1-5) */}
          <div
            onClick={() => { setSelectedStyle('Casual'); const el = document.getElementById('catalog'); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
            className="md:col-span-5 h-64 sm:h-72 rounded-[28px] bg-white p-6 relative overflow-hidden group cursor-pointer shadow-xs hover:shadow-md transition-all"
          >
            <h3 className="text-2xl font-black font-heading text-black z-10 relative">Casual</h3>
            <img
              src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=800"
              alt="Casual Dress Style"
              className="absolute right-0 top-0 h-full w-3/5 object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Formal (col 6-12) */}
          <div
            onClick={() => { setSelectedStyle('Formal'); const el = document.getElementById('catalog'); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
            className="md:col-span-7 h-64 sm:h-72 rounded-[28px] bg-white p-6 relative overflow-hidden group cursor-pointer shadow-xs hover:shadow-md transition-all"
          >
            <h3 className="text-2xl font-black font-heading text-black z-10 relative">Formal</h3>
            <img
              src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800"
              alt="Formal Dress Style"
              className="absolute right-0 top-0 h-full w-3/5 object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Party (col 1-7) */}
          <div
            onClick={() => { setSelectedStyle('Party'); const el = document.getElementById('catalog'); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
            className="md:col-span-7 h-64 sm:h-72 rounded-[28px] bg-white p-6 relative overflow-hidden group cursor-pointer shadow-xs hover:shadow-md transition-all"
          >
            <h3 className="text-2xl font-black font-heading text-black z-10 relative">Party</h3>
            <img
              src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800"
              alt="Party Dress Style"
              className="absolute right-0 top-0 h-full w-3/5 object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Gym (col 8-12) */}
          <div
            onClick={() => { setSelectedStyle('Gym'); const el = document.getElementById('catalog'); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
            className="md:col-span-5 h-64 sm:h-72 rounded-[28px] bg-white p-6 relative overflow-hidden group cursor-pointer shadow-xs hover:shadow-md transition-all"
          >
            <h3 className="text-2xl font-black font-heading text-black z-10 relative">Gym</h3>
            <img
              src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=800"
              alt="Gym Dress Style"
              className="absolute right-0 top-0 h-full w-3/5 object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          6. OUR HAPPY CUSTOMERS (Exact Replication of Screenshot 1)
         ════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-black tracking-tight uppercase">
            OUR HAPPY CUSTOMERS
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevReview}
              className="p-2 rounded-full border border-gray-200 hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextReview}
              className="p-2 rounded-full border border-gray-200 hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CUSTOMER_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="p-6 sm:p-7 rounded-[24px] border border-gray-200 bg-white space-y-3.5 shadow-xs hover:border-black/30 transition-all"
            >
              {/* 5 Yellow Stars */}
              <div className="flex text-amber-400">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>

              {/* Customer Name with Green Checkmark */}
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold font-heading text-black">
                  {review.name}
                </span>
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              </div>

              {/* Review Quote */}
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                "{review.text}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          7. FULL CATALOG WITH SIDEBAR FILTERS (Exact Replication of Screenshot 2)
         ════════════════════════════════════════════════════════════════════════ */}
      <section id="catalog" className="pt-6 space-y-6">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <span>Home</span>
          <span>&gt;</span>
          <span className="text-black font-bold">
            {selectedCategory === 'All' ? 'Catalog' : selectedCategory}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Filter Sidebar (Screenshot 2) */}
          <div className="lg:col-span-3 p-6 rounded-[28px] border border-gray-200 bg-white space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-black font-heading text-black">Filters</h3>
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            </div>

            {/* Category Filter List */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              {filterCategories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between text-xs sm:text-sm py-1 transition-colors cursor-pointer ${
                    selectedCategory === cat ? 'font-bold text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <span>{cat}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>

            {/* Price Slider */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between text-xs font-bold text-black uppercase">
                <span>Price</span>
                <span className="font-heading font-black">₹{priceRange.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-black h-1.5 bg-gray-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                <span>₹1,000</span>
                <span>₹2,00,000</span>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              <span className="text-xs font-bold text-black uppercase block">Colors</span>
              <div className="grid grid-cols-5 gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-transform cursor-pointer ${
                      selectedColor === c.name ? 'ring-2 ring-black ring-offset-2 scale-110' : 'hover:scale-105'
                    }`}
                  >
                    {selectedColor === c.name && (
                      <span className={c.name === 'white' ? 'text-black text-xs font-bold' : 'text-white text-xs font-bold'}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              <span className="text-xs font-bold text-black uppercase block">Size</span>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedSize === s
                        ? 'bg-black text-white'
                        : 'bg-[#F0F0F0] text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Dress Style Filter */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              <span className="text-xs font-bold text-black uppercase block">Dress Style</span>
              <div className="space-y-2">
                {dressStyles.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStyle(st)}
                    className={`w-full flex items-center justify-between text-xs py-1 transition-colors cursor-pointer ${
                      selectedStyle === st ? 'font-bold text-black' : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    <span>{st}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Apply / Reset Filter Button */}
            <button
              onClick={() => {
                setSelectedCategory('All')
                setSelectedStyle('All')
                setPriceRange(200000)
                setSearchQuery('')
              }}
              className="w-full py-3 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          {/* Right Product Grid Area (Screenshot 2) */}
          <div className="lg:col-span-9 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h3 className="text-2xl font-black font-heading text-black">
                  {selectedCategory === 'All' ? 'All Products' : selectedCategory}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing 1-{filteredProducts.length} of {products.length} Products
                </p>
              </div>

              {/* Sort by pill */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Sort by:</span>
                <span className="font-bold text-black cursor-pointer flex items-center gap-1">
                  Most Popular <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </span>
              </div>
            </div>

            {/* Grid */}
            {filteredProducts.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#F0F0F0]/50 border border-gray-200 space-y-3">
                <p className="text-base font-bold text-gray-800 font-heading">No products matched your criteria.</p>
                <p className="text-xs text-gray-500">Try adjusting your price slider, style or category filter.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('All')
                    setSelectedStyle('All')
                    setPriceRange(200000)
                    setSearchQuery('')
                  }}
                  className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => renderProductCard(product))}
              </div>
            )}

            {/* Pagination Controls (Screenshot 2) */}
            <div className="pt-8 border-t border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-600">
              <button className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                  1
                </span>
                <span className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                  2
                </span>
                <span className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                  3
                </span>
                <span className="px-1 text-gray-400">...</span>
                <span className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                  10
                </span>
              </div>

              <button className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          8. FLOATING NEWSLETTER BANNER (Exact Replication of Screenshots 1 & 2)
         ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative -mb-16 z-20">
        <div className="rounded-[28px] sm:rounded-[32px] bg-black text-white p-8 sm:p-12 lg:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md space-y-2 text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight uppercase leading-tight">
              STAY UPTO DATE ABOUT OUR LATEST OFFERS
            </h2>
          </div>

          <div className="w-full md:w-80 space-y-3">
            {newsletterSubscribed ? (
              <div className="p-3.5 rounded-full bg-emerald-500 text-white font-bold text-center text-xs">
                ✓ Thank you for subscribing!
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-11 pr-4 py-3 rounded-full bg-white text-black placeholder-gray-400 text-xs sm:text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-white text-black hover:bg-gray-100 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                >
                  Subscribe to Newsletter
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          9. FOOTER (Exact Replication of Screenshots 1 & 2)
         ════════════════════════════════════════════════════════════════════════ */}
      <footer className="rounded-t-[36px] sm:rounded-t-[40px] bg-[#F0F0F0] pt-28 sm:pt-32 pb-12 px-6 sm:px-12 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Brand column */}
            <div className="md:col-span-4 space-y-4">
              <h3 className="text-3xl font-black font-heading text-black tracking-tight">
                SHOP.CO
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-sm leading-relaxed">
                We have clothes that suit your style and which you're proud to wear. From women to men.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3 pt-2">
                <span className="w-8 h-8 rounded-full bg-white text-black border border-gray-200 flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer hover:bg-black hover:text-white transition-colors">
                  𝕏
                </span>
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer hover:opacity-80 transition-opacity">
                  f
                </span>
                <span className="w-8 h-8 rounded-full bg-white text-black border border-gray-200 flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer hover:bg-black hover:text-white transition-colors">
                  ig
                </span>
                <span className="w-8 h-8 rounded-full bg-white text-black border border-gray-200 flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer hover:bg-black hover:text-white transition-colors">
                  gh
                </span>
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs sm:text-sm">
              <div className="space-y-3">
                <h4 className="font-bold text-black uppercase tracking-wider font-heading">COMPANY</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="hover:text-black cursor-pointer">About</li>
                  <li className="hover:text-black cursor-pointer">Features</li>
                  <li className="hover:text-black cursor-pointer">Works</li>
                  <li className="hover:text-black cursor-pointer">Career</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-black uppercase tracking-wider font-heading">HELP</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="hover:text-black cursor-pointer">Customer Support</li>
                  <li className="hover:text-black cursor-pointer">Delivery Details</li>
                  <li className="hover:text-black cursor-pointer">Terms & Conditions</li>
                  <li className="hover:text-black cursor-pointer">Privacy Policy</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-black uppercase tracking-wider font-heading">FAQ</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="hover:text-black cursor-pointer">Account</li>
                  <li className="hover:text-black cursor-pointer">Manage Deliveries</li>
                  <li className="hover:text-black cursor-pointer">Orders</li>
                  <li className="hover:text-black cursor-pointer">Payments</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-black uppercase tracking-wider font-heading">RESOURCES</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="hover:text-black cursor-pointer">Free eBooks</li>
                  <li className="hover:text-black cursor-pointer">Development Tutorial</li>
                  <li className="hover:text-black cursor-pointer">How to - Blog</li>
                  <li className="hover:text-black cursor-pointer">Youtube Playlist</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Payment Badges */}
          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>Shop.co © 2000-2023, All Rights Reserved</p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-white border border-gray-200 text-blue-700 font-bold text-[10px]">
                VISA
              </span>
              <span className="px-3 py-1 rounded bg-white border border-gray-200 text-red-600 font-bold text-[10px]">
                Mastercard
              </span>
              <span className="px-3 py-1 rounded bg-white border border-gray-200 text-blue-500 font-bold text-[10px]">
                PayPal
              </span>
              <span className="px-3 py-1 rounded bg-white border border-gray-200 text-black font-bold text-[10px]">
                Pay
              </span>
              <span className="px-3 py-1 rounded bg-white border border-gray-200 text-gray-700 font-bold text-[10px]">
                G Pay
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
