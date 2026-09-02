"""
AI Agent implementations with Gemini multi-turn conversation memory.
API keys loaded from .env file. No keys on frontend.
"""
import os
import json
import re
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from database import get_db, log_audit_event

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# ─── Conversation Memory ────────────────────────────────────────────────────

def load_conversation_history(user_id: str, limit: int = 20) -> List[Dict[str, str]]:
    """Load recent conversation turns from DB for a user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT role, content FROM conversation_memory
               WHERE user_id = ?
               ORDER BY id DESC LIMIT ?""",
            (user_id, limit)
        )
        rows = cursor.fetchall()
    # Reverse so oldest first
    return [{"role": r["role"], "parts": [r["content"]]} for r in reversed(rows)]

def save_message_to_memory(user_id: str, role: str, content: str):
    """Persist a single conversation turn to DB."""
    from datetime import datetime
    with get_db() as conn:
        conn.execute(
            """INSERT INTO conversation_memory (user_id, role, content, created_at)
               VALUES (?, ?, ?, ?)""",
            (user_id, role, content, datetime.now().isoformat())
        )

def clear_conversation_memory(user_id: str):
    """Clear all chat history for a user."""
    with get_db() as conn:
        conn.execute("DELETE FROM conversation_memory WHERE user_id = ?", (user_id,))

# ─── Product Helpers ─────────────────────────────────────────────────────────

def get_all_products() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products")
        rows = cursor.fetchall()
    products = [dict(r) for r in rows]
    for p in products:
        p["in_stock"] = p["stock_qty"] > 0
    return products

def query_products_by_params(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    category = params.get("category")
    max_price = params.get("max_price_paisa")
    keywords = params.get("keywords") or []

    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM products WHERE 1=1"
        args = []

        if category and category.lower() not in ("all", "any", "none"):
            query += " AND (category LIKE ? OR keywords LIKE ?)"
            args.extend([f"%{category}%", f"%{category}%"])

        if max_price:
            query += " AND price_paisa <= ?"
            args.append(max_price)

        cursor.execute(query, args)
        rows = cursor.fetchall()

    products = [dict(r) for r in rows]
    for p in products:
        p["in_stock"] = p["stock_qty"] > 0

    if keywords:
        scored = []
        for p in products:
            score = 0
            searchable = f"{p['name']} {p['category']} {p['description']} {p['keywords']}".lower()
            for kw in keywords:
                if kw.lower() in searchable:
                    score += 1
            if score > 0 or len(products) <= 3:
                scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [p for _, p in scored] if scored else products

    return products

def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE product_id = ?", (product_id,))
        row = cursor.fetchone()
    if row:
        p = dict(row)
        p["in_stock"] = p["stock_qty"] > 0
        return p
    return None

def build_catalog_context() -> str:
    """Build a compact catalog string for the system prompt."""
    products = get_all_products()
    lines = []
    for p in products:
        price_inr = p["price_paisa"] / 100
        stock_str = f"{p['stock_qty']} in stock" if p["stock_qty"] > 0 else "OUT OF STOCK"
        lines.append(
            f"- [{p['product_id']}] {p['name']} | Category: {p['category']} | "
            f"Price: Rs {price_inr:,.0f} | {stock_str} | "
            f"Description: {p['description'][:120]}..."
        )
    return "\n".join(lines)

# ─── System Prompt ────────────────────────────────────────────────────────────

def build_system_prompt() -> str:
    catalog_str = build_catalog_context()
    return f"""You are "Atelier Shopping Assistant", a warm, luxury-focused, and catalog-aware AI shopping concierge for the Atelier e-commerce store.
You help shoppers discover products, explain features in detail, compare options, and book orders. You know every product in our catalog by heart.

CATALOG (all available products in SQLite database):
{catalog_str}

IDENTITY & PERSONA:
- Name: "Atelier Shopping Assistant"
- Warm, polite, and enthusiastic. Greet users warmly ("Hi, I am your shopping assistant for Atelier! How can I help you today?").
- When asked "Who are you?", "What is your name?", or generic greetings, stay strictly in character as the Atelier shopping concierge.
- When users ask "Explain the Omega watch" or inquire about any item, provide a rich, enthusiastic description of its craftsmanship, METAS chronometer movement, 150m water resistance, and luxury appeal, and return the product in the products array.
- When users ask "I want to buy a laptop" or search for items, recommend the best matching products from the catalog and include their product IDs in the products array.
- Upon purchase or checkout confirmation, respond warmly ("Thanks for purchasing! Your order is secured and logged in My Orders.").

RESPONSE FORMAT (Strict JSON only, no markdown wrappers):
{{
  "message": "Your conversational reply here",
  "intent": "CHAT" | "SHOW_PRODUCTS" | "INITIATE_CHECKOUT" | "CLARIFY",
  "products": ["prod_id_1", "prod_id_2"],
  "checkout_trigger": false
}}

RULES:
- When showing or explaining products, set intent="SHOW_PRODUCTS" and list matching product_ids in the products array.
- When user says "place the order", "place order", "make payment", "pay", "checkout", "confirm order", "buy now", "purchase": set intent="INITIATE_CHECKOUT" and checkout_trigger=true.
- NEVER make up product IDs that are not in the catalog.
- Keep responses friendly, elegant, and informative.
"""

# ─── BuyerAgent ───────────────────────────────────────────────────────────────

class BuyerAgent:
    """Conversational Buyer Agent with full memory and Gemini multi-turn chat."""

    @staticmethod
    def process_message(user_id: str, message: str, api_key: str = None) -> Dict[str, Any]:
        # Use caller-supplied API key if provided, fall back to .env key
        effective_key = api_key or GEMINI_API_KEY
        # Save user message to memory
        save_message_to_memory(user_id, "user", message)

        # Load full conversation history
        history = load_conversation_history(user_id, limit=30)
        # Remove last entry (the one we just saved) to build history before current message
        history_for_gemini = history[:-1] if history else []

        result = None

        # ── Gemini Path ──
        if GEMINI_AVAILABLE and effective_key:
            try:
                genai.configure(api_key=effective_key)
                model = genai.GenerativeModel(
                    "gemini-2.5-flash",
                    system_instruction=build_system_prompt()
                )

                # Build chat with prior history
                chat = model.start_chat(history=history_for_gemini)
                response = chat.send_message(message)
                raw = response.text.strip()

                # Strip markdown fences if present
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()

                try:
                    parsed = json.loads(raw)
                except Exception:
                    # Try to extract JSON object with regex
                    match = re.search(r'\{[\s\S]*\}', raw)
                    if match:
                        try:
                            parsed = json.loads(match.group(0))
                        except Exception:
                            parsed = None
                    else:
                        parsed = None

                # If model responded with natural language text instead of JSON:
                if not parsed and raw:
                    parsed = {
                        "message": raw,
                        "intent": "CHAT",
                        "products": [],
                        "checkout_trigger": any(w in message.lower() for w in ["place the order", "placed the order", "make payment", "pay", "checkout", "buy now"])
                    }

                result = parsed

                if result:
                    log_audit_event(
                        "[GEMINI LLM]",
                        f"Atelier responded via gemini-2.5-flash: intent={result.get('intent')}, products={len(result.get('products', []))}",
                        level="INFO",
                        metadata={"user_id": user_id, "intent": result.get("intent")}
                    )

            except Exception as e:
                print(f"[GEMINI ERROR] {e}. Falling back to heuristic engine.")
                result = None

        # ── Heuristic Fallback (High-fidelity Catalog Intelligence) ──
        if result is None:
            result = BuyerAgent._heuristic_fallback(user_id, message)

        # ── Resolve product IDs to full product dicts ──
        product_ids = result.get("products", [])
        recommended_products = []
        if product_ids:
            for pid in product_ids:
                p = get_product_by_id(pid)
                if p:
                    recommended_products.append(p)

        # Ensure products are resolved whenever user message or response touches the catalog
        if not recommended_products:
            msg_lower = message.lower()
            category_map = {
                "laptop": "Laptops", "macbook": "Laptops", "dell": "Laptops", "workstation": "Laptops",
                "watch": "Watches", "omega": "Watches", "rolex": "Watches", "casio": "Watches", "chronometer": "Watches",
                "keyboard": "Electronics", "mouse": "Electronics", "monitor": "Electronics", "keychron": "Electronics", "logitech": "Electronics",
                "headphone": "Audio", "airpod": "Audio", "sony": "Audio", "earphone": "Audio", "audio": "Audio",
                "tablet": "Tablets", "ipad": "Tablets", "chair": "Furniture", "wallet": "Accessories", "strap": "Accessories"
            }
            matched_cat = None
            for kw, cat in category_map.items():
                if kw in msg_lower:
                    matched_cat = cat
                    break

            keywords = [w for w in re.findall(r'\b\w+\b', msg_lower) if len(w) > 2]
            recommended_products = query_products_by_params({
                "category": matched_cat,
                "keywords": [k for k in keywords if k not in ["want", "buy", "show", "need", "like", "find", "get", "please"]]
            })

        # Save assistant response to memory
        save_message_to_memory(user_id, "model", result.get("message", ""))

        return {
            "agent_name": "Atelier AI Shopping Concierge",
            "message": result.get("message", "How can I help you today?"),
            "intent": result.get("intent", "CHAT"),
            "checkout_trigger": result.get("checkout_trigger", False),
            "recommended_products": recommended_products,
            "catalog_offer": {
                "status": "OFFER_AVAILABLE" if recommended_products else "CHAT_RESPONSE",
                "products_count": len(recommended_products),
            },
            "intent_payload": {
                "intent": "CHECKOUT" if result.get("checkout_trigger") else ("SEARCH_PRODUCT" if recommended_products else "CHAT")
            }
        }

    @staticmethod
    def _heuristic_fallback(user_id: str, message: str) -> Dict[str, Any]:
        msg_lower = message.lower().strip()

        # Checkout intent detection (support present and past tense like "placed the order")
        checkout_patterns = [
            "place the order", "placed the order", "place order", "placed order",
            "make payment", "made payment", "make the payment", "pay", "checkout",
            "confirm order", "confirmed order", "buy now", "purchase now",
            "order now", "complete payment", "process payment", "authorize payment",
            "buy this", "order this"
        ]
        is_checkout = any(p in msg_lower for p in checkout_patterns)

        # Check if user specifically requested a product to buy/order
        all_prods = get_all_products()
        matched_target_prod = None
        for p in all_prods:
            p_name_words = [w for w in p["name"].lower().split() if len(w) > 3]
            if any(w in msg_lower for w in p_name_words) or p["product_id"].lower() in msg_lower:
                matched_target_prod = p
                break

        if is_checkout:
            target_ids = [matched_target_prod["product_id"]] if matched_target_prod else []
            return {
                "message": "Processing your order through our deterministic safety gateway...",
                "intent": "INITIATE_CHECKOUT",
                "products": target_ids,
                "checkout_trigger": True
            }

        # Casual greetings & Identity
        if any(g == msg_lower or msg_lower.startswith(g + " ") or msg_lower.endswith(" " + g) for g in ["hi", "hello", "hey", "good morning", "good evening"]):
            return {
                "message": "Hi, I am your shopping assistant for Atelier! 👋 I know every luxury piece in our catalog and can help you discover items, explore detailed descriptions, compare models, and even checkout autonomously. What can I find for you today?",
                "intent": "CHAT",
                "products": [],
                "checkout_trigger": False
            }

        if any(k in msg_lower for k in ["who are you", "what is your name", "what are you", "tell me about yourself"]):
            return {
                "message": "I am Atelier, your personal AI luxury shopping concierge! I have complete visibility into our real-time inventory, pricing, and specs. I can recommend items, provide in-depth product descriptions, negotiate bundle deals, and settle eligible orders autonomously in seconds.",
                "intent": "CHAT",
                "products": [],
                "checkout_trigger": False
            }

        if any(k in msg_lower for k in ["thanks", "thank you", "thx"]):
            return {
                "message": "You're very welcome! Thanks for shopping with Atelier. Let me know whenever you'd like to explore more items or check out! ✨",
                "intent": "CHAT",
                "products": [],
                "checkout_trigger": False
            }

        # Product description / Explanation / Features inquiry
        explain_cues = ["explain", "description", "details", "features", "specs", "tell me about", "what is", "about the", "information", "how is"]
        is_description_query = any(c in msg_lower for c in explain_cues)

        if matched_target_prod:
            p = matched_target_prod
            price_inr = p["price_paisa"] / 100
            stock_status = f"In Stock ({p['stock_qty']} units available)" if p['stock_qty'] > 0 else "Currently Out of Stock"
            return {
                "message": f"**{p['name']}** (₹{price_inr:,.0f})\n\n**Category:** {p['category']}\n**Description:** {p['description']}\n**Availability:** {stock_status}\n\nWould you like me to add this to your cart or process your order?",
                "intent": "SHOW_PRODUCTS",
                "products": [p["product_id"]],
                "checkout_trigger": False
            }

        # Laptops search (e.g. "I want to buy a laptop", "show laptops", "buy workstation")
        if any(w in msg_lower for w in ["laptop", "laptops", "macbook", "workstation", "dell", "creator"]):
            return {
                "message": "Here are our top high-performance creator workstations! We feature the **Dell XPS 15 OLED Workstation** (i9, RTX 4070, 32GB) and the **Apple MacBook Pro 14-inch M3 Pro** (Liquid Retina XDR, 18-hour battery). Both are powerhouse machines tailored for intensive workflows.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_dell_laptop", "prod_macbook_pro"],
                "checkout_trigger": False
            }

        # Watches search (e.g. "Show me luxury watches", "find a watch", "luxury watches")
        if any(w in msg_lower for w in ["watch", "watches", "timepiece", "chronometer", "rolex", "casio"]):
            return {
                "message": "Here are our finest luxury timepieces! From the iconic **Omega Seamaster Aqua Terra Chronometer** to the **Rolex Explorer II Stainless Steel** and rugged **Casio G-Shock Mudmaster**, our collection offers unmatched prestige and precision.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_omega_chronometer", "prod_rolex_explorer", "prod_casio_gshock", "prod_watch_strap"],
                "checkout_trigger": False
            }

        # Audio / Headphones
        if any(w in msg_lower for w in ["headphone", "headphones", "earbuds", "airpod", "audio", "sony", "music"]):
            return {
                "message": "Here are our premier audio selections! Experience industry-leading noise cancellation with the **Sony WH-1000XM5** or immersive spatial audio with the **Apple AirPods Pro 2nd Gen**.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_sony_headphones", "prod_airpods_pro"],
                "checkout_trigger": False
            }

        # Keyboards / Desk / Mouse
        if any(w in msg_lower for w in ["keyboard", "keychron", "mouse", "logitech", "desk", "typing"]):
            return {
                "message": "Here are our best workspace productivity essentials! The **Keychron K2 Wireless Mechanical Keyboard** pairs wonderfully with the ergonomic **Logitech MX Master 3S Mouse**.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_keychron_keyboard", "prod_logitech_mouse"],
                "checkout_trigger": False
            }

        # General keyword search against catalog
        keywords = [w for w in re.findall(r'\b\w+\b', msg_lower) if len(w) > 2 and w not in ["the", "and", "for", "with", "want", "buy", "show", "get", "need", "like", "description", "details", "about"]]
        matching_prods = query_products_by_params({"keywords": keywords})

        if matching_prods:
            return {
                "message": "I found these curated items matching your inquiry:",
                "intent": "SHOW_PRODUCTS",
                "products": [p["product_id"] for p in matching_prods[:4]],
                "checkout_trigger": False
            }

        # Default helpful discovery
        return {
            "message": "I'm ready to help you discover exceptional products. Here are some of our most celebrated pieces from the Atelier collection:",
            "intent": "SHOW_PRODUCTS",
            "products": [p["product_id"] for p in all_prods[:4]],
            "checkout_trigger": False
        }


# ─── SellerAgent ──────────────────────────────────────────────────────────────

class SellerAgent:
    """Seller Agent for dynamic upsell bundle suggestions."""

    UPSELL_MAP = {
        "prod_omega_chronometer": {
            "upsell_product_id": "prod_watch_strap",
            "discount_code": "WATCHBUNDLE",
            "discount_paisa": 20000,
            "seller_pitch": "🎁 Perfect pairing! Add the Hirsch Camelgrain Leather Strap to your Omega Chronometer and save Rs 200 with code WATCHBUNDLE. It elevates the look of your watch to an entirely new level."
        },
        "prod_rolex_explorer": {
            "upsell_product_id": "prod_watch_strap",
            "discount_code": "ROLEXBUNDLE",
            "discount_paisa": 20000,
            "seller_pitch": "🎁 Complement your Rolex Explorer with our premium Hirsch leather strap — a sophisticated alternative for dress occasions. Save Rs 200 with code ROLEXBUNDLE!"
        },
        "prod_keychron_keyboard": {
            "upsell_product_id": "prod_logitech_mouse",
            "discount_code": "DESKSETUP",
            "discount_paisa": 50000,
            "seller_pitch": "⌨️ Complete your dream desk setup! Add the Logitech MX Master 3S wireless mouse to your Keychron K2 keyboard order and save Rs 500 with code DESKSETUP."
        },
        "prod_logitech_mouse": {
            "upsell_product_id": "prod_keychron_keyboard",
            "discount_code": "DESKSETUP",
            "discount_paisa": 50000,
            "seller_pitch": "🖱️ Your mouse pairs perfectly with the Keychron K2 Mechanical Keyboard! Add it to your cart and get Rs 500 off with code DESKSETUP."
        },
        "prod_dell_laptop": {
            "upsell_product_id": "prod_logitech_mouse",
            "discount_code": "LAPTOPBUNDLE",
            "discount_paisa": 50000,
            "seller_pitch": "💻 Great choice! The Logitech MX Master 3S is the perfect companion mouse for your Dell XPS. Add it now and save Rs 500 with code LAPTOPBUNDLE!"
        },
        "prod_macbook_pro": {
            "upsell_product_id": "prod_logitech_mouse",
            "discount_code": "MACBUNDLE",
            "discount_paisa": 50000,
            "seller_pitch": "🍎 Your MacBook Pro deserves the best! The Logitech MX Master 3S is beloved by Mac power users. Add it and save Rs 500 with code MACBUNDLE."
        },
        "prod_sony_headphones": {
            "upsell_product_id": "prod_leather_wallet",
            "discount_code": "PREMIUMPACK",
            "discount_paisa": 30000,
            "seller_pitch": "🎧 Great taste in audio! Pair your Sony WH-1000XM5 with our Bellroy slim leather wallet — the perfect premium lifestyle combo. Save Rs 300 with code PREMIUMPACK."
        },
        "prod_airpods_pro": {
            "upsell_product_id": "prod_ipad_pro",
            "discount_code": "APPLEBUNDLE",
            "discount_paisa": 100000,
            "seller_pitch": "🎶 Your AirPods Pro will sound absolutely magical with the iPad Pro! Experience Spatial Audio like never before. Add the iPad Pro and save Rs 1,000 with code APPLEBUNDLE."
        },
        "prod_samsung_monitor": {
            "upsell_product_id": "prod_keychron_keyboard",
            "discount_code": "MONITORBUNDLE",
            "discount_paisa": 50000,
            "seller_pitch": "🖥️ Great monitor choice! Complete your workstation with the Keychron K2 mechanical keyboard. Add it and save Rs 500 with code MONITORBUNDLE."
        },
        "prod_gaming_chair": {
            "upsell_product_id": "prod_samsung_monitor",
            "discount_code": "GAMINGSETUP",
            "discount_paisa": 100000,
            "seller_pitch": "🎮 Epic gaming chair! Pair it with our Samsung 27-inch QHD 165Hz monitor for the ultimate gaming throne. Save Rs 1,000 with code GAMINGSETUP."
        },
    }

    @staticmethod
    def evaluate_upsell(product_id: str) -> Dict[str, Any]:
        offer = SellerAgent.UPSELL_MAP.get(product_id)
        if not offer:
            return {
                "trigger_upsell": False,
                "upsell_product": None,
                "seller_pitch": "No bundle accessories currently available for this selection.",
                "discount_code": None,
                "discount_paisa": 0
            }

        upsell_item = get_product_by_id(offer["upsell_product_id"])
        payload = {
            "trigger_upsell": True,
            "upsell_product": upsell_item,
            "seller_pitch": offer["seller_pitch"],
            "discount_code": offer["discount_code"],
            "discount_paisa": offer["discount_paisa"]
        }

        log_audit_event(
            "[SELLER AGENT UPSELL]",
            f"Upsell bundle offer: {offer['discount_code']} (-Rs {offer['discount_paisa']/100:.0f})",
            level="INFO",
            metadata=payload
        )
        return payload
