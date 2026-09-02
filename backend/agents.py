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

# ─── Per-user last-shown product context (in-memory, session-scoped) ──────────
# Remembers which product was most recently shown/discussed per user so that
# vague commands like "yes", "add it", "add this" can be resolved without
# requiring the user to repeat the product name.
_last_shown_product: Dict[str, str] = {}  # user_id -> product_id

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
    _last_shown_product.pop(user_id, None)
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

def find_best_matching_product(message: str) -> Optional[Dict[str, Any]]:
    """Accurately find the single best matching product from catalog using token weighting."""
    if not message:
        return None
    msg_clean = message.lower()
    all_prods = get_all_products()

    # Exact product ID match
    for p in all_prods:
        if p["product_id"].lower() in msg_clean:
            return p

    best_prod = None
    best_score = 0.0

    distinctive_weights = {
        "ipad": 20.0, "xps": 20.0, "macbook": 20.0, "omega": 20.0,
        "seamaster": 20.0, "rolex": 20.0, "explorer": 15.0, "gshock": 20.0,
        "mudmaster": 20.0, "keychron": 20.0, "airpods": 20.0, "logitech": 15.0,
        "bellroy": 20.0, "hirsch": 20.0, "dell": 10.0, "casio": 15.0,
        "sony": 12.0, "samsung": 12.0, "wallet": 10.0, "strap": 10.0,
        "keyboard": 8.0, "mouse": 8.0, "monitor": 8.0, "chair": 8.0,
        "laptop": 6.0, "headphones": 6.0, "headphone": 6.0, "watch": 6.0,
        "watches": 6.0, "apple": 5.0
    }

    for p in all_prods:
        score = 0.0
        p_name = p["name"].lower()

        # Exact product name in query
        if p_name in msg_clean:
            score += 100.0

        # Word-by-word comparison
        name_words = [re.sub(r'[^a-z0-9\-]', '', w) for w in p_name.split()]
        for w in name_words:
            if not w or len(w) < 2:
                continue
            if re.search(r'\b' + re.escape(w) + r'\b', msg_clean):
                score += distinctive_weights.get(w, 2.0)

        # Check keywords
        p_keywords = [re.sub(r'[^a-z0-9\-]', '', k.strip()) for k in p.get("keywords", "").lower().split(",")]
        for kw in p_keywords:
            if kw and len(kw) >= 3 and re.search(r'\b' + re.escape(kw) + r'\b', msg_clean):
                score += distinctive_weights.get(kw, 1.5)

        if score > best_score:
            best_score = score
            best_prod = p

    if best_score >= 4.0:
        return best_prod
    return None

def get_last_discussed_product(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the most recent product discussed/shown to this user."""
    # 1. In-memory session cache
    if user_id in _last_shown_product and _last_shown_product[user_id]:
        p = get_product_by_id(_last_shown_product[user_id])
        if p:
            return p

    # 2. Extract from recent model messages in DB
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT content FROM conversation_memory
                   WHERE user_id = ? AND role = 'model'
                   ORDER BY id DESC LIMIT 5""",
                (user_id,)
            )
            rows = cursor.fetchall()
        for r in rows:
            p = find_best_matching_product(r["content"])
            if p:
                _last_shown_product[user_id] = p["product_id"]
                return p
    except Exception:
        pass

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
  "intent": "CHAT" | "SHOW_PRODUCTS" | "INITIATE_CHECKOUT" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "CLARIFY",
  "products": ["prod_id_1", "prod_id_2"],
  "checkout_trigger": false,
  "cart_action": null
}}

RULES:
- When showing or explaining products, set intent="SHOW_PRODUCTS" and list matching product_ids in the products array.
- When user says "place the order", "place order", "make payment", "pay", "checkout", "confirm order", "buy now", "purchase": set intent="INITIATE_CHECKOUT" and checkout_trigger=true.
- When the user says "add [product] to cart", "add this to cart", "add it to cart", "put this in cart", "add to my cart" or similar: set intent="ADD_TO_CART", AND set cart_action to {{"action": "ADD", "product_id": "<matching_product_id>"}}. In your message, confirm the item was added, then act like a brilliant sales agent: suggest 1-2 highly relevant complementary products only (e.g., adding a Dell laptop → suggest a mouse or keyboard bundle, NOT the full catalog). Mention a specific bundle discount if applicable. Include only the complementary product_ids in the products array, NOT the product just added.
- When the user says "remove [product] from cart", "remove this from cart", "remove it from cart", "delete from cart", "take this out of cart" or similar: set intent="REMOVE_FROM_CART", include the product_id in the products array, AND set cart_action to {{"action": "REMOVE", "product_id": "<matching_product_id>"}}.
- NEVER show the full product catalog in response to an add/remove cart command. Only show 1-2 relevant cross-sell products.
- NEVER make up product IDs that are not in the catalog.
- Keep responses friendly, elegant, and informative.
"""

# ─── BuyerAgent ───────────────────────────────────────────────────────────────

class BuyerAgent:
    """Conversational Buyer Agent with full memory and Gemini multi-turn chat."""

    @staticmethod
    def process_message(user_id: str, message: str, api_key: str = None) -> Dict[str, Any]:
        effective_key = api_key or GEMINI_API_KEY
        save_message_to_memory(user_id, "user", message)

        # ── 1. DETERMINISTIC CART COMMAND INTERCEPTION ──
        # Guarantees that "add X to cart", "add X", "add this to cart", "yes ADD_TO_CART",
        # "yes", "remove X from cart", etc. NEVER fail or dump the catalog!
        cart_command_result = BuyerAgent._check_cart_command(user_id, message)
        if cart_command_result:
            result = cart_command_result
        else:
            # ── 2. LLM or Heuristic Path ──
            result = None
            history = load_conversation_history(user_id, limit=30)
            history_for_gemini = history[:-1] if history else []

            if GEMINI_AVAILABLE and effective_key:
                try:
                    genai.configure(api_key=effective_key)
                    model = genai.GenerativeModel(
                        "gemini-2.5-flash",
                        system_instruction=build_system_prompt()
                    )
                    chat = model.start_chat(history=history_for_gemini)
                    response = chat.send_message(message)
                    raw = response.text.strip()

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
                        match = re.search(r'\{[\s\S]*\}', raw)
                        parsed = json.loads(match.group(0)) if match else None

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

            if result is None:
                result = BuyerAgent._heuristic_fallback(user_id, message)

        # ── 3. Resolve product IDs to full product dicts ──
        intent = result.get("intent", "CHAT")
        product_ids = result.get("products", [])
        recommended_products = []

        # For ADD_TO_CART / REMOVE_FROM_CART: show smart cross-sell suggestions ONLY, NOT full catalog
        if intent in ("ADD_TO_CART", "REMOVE_FROM_CART"):
            cart_action = result.get("cart_action")
            added_pid = cart_action.get("product_id") if cart_action else (product_ids[0] if product_ids else None)
            cross_sell = BuyerAgent._get_cross_sell_suggestions(added_pid) if added_pid else []
            recommended_products = [p for p in cross_sell if p["product_id"] != added_pid]
        else:
            if product_ids:
                for pid in product_ids:
                    p = get_product_by_id(pid)
                    if p:
                        recommended_products.append(p)

            # Fallback catalog search ONLY if recommended_products is empty and not checkout
            if not recommended_products and not result.get("checkout_trigger"):
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

        # Track last shown/discussed product so next turn's "yes" or "add to cart" knows what product it was
        if result.get("cart_action") and result["cart_action"].get("product_id"):
            _last_shown_product[user_id] = result["cart_action"]["product_id"]
        elif intent == "SHOW_PRODUCTS" and product_ids:
            _last_shown_product[user_id] = product_ids[0]
        elif recommended_products:
            _last_shown_product[user_id] = recommended_products[0]["product_id"]

        return {
            "agent_name": "Atelier AI Shopping Concierge",
            "message": result.get("message", "How can I help you today?"),
            "intent": intent,
            "checkout_trigger": result.get("checkout_trigger", False),
            "cart_action": result.get("cart_action"),
            "recommended_products": recommended_products,
            "catalog_offer": {
                "status": "OFFER_AVAILABLE" if recommended_products else "CHAT_RESPONSE",
                "products_count": len(recommended_products),
            },
            "intent_payload": {
                "intent": "CHECKOUT" if result.get("checkout_trigger") else (
                    "ADD_TO_CART" if intent == "ADD_TO_CART" else
                    "REMOVE_FROM_CART" if intent == "REMOVE_FROM_CART" else
                    ("SEARCH_PRODUCT" if recommended_products else "CHAT")
                )
            }
        }

    @staticmethod
    def _check_cart_command(user_id: str, message: str) -> Optional[Dict[str, Any]]:
        """Deterministically intercept and execute cart mutations with marketing upsell."""
        msg_lower = message.lower().strip()

        # ── 1. Remove from Cart ──
        is_remove = (
            re.search(r'\b(?:remove|delete|take\s+out|drop)\b.{0,60}\b(?:from|out\s+of)\s+(?:my\s+|the\s+)?cart\b', msg_lower)
            or any(p in msg_lower for p in ["remove from cart", "remove this from cart", "remove it from cart", "remove this", "remove it", "delete from cart"])
        )
        if is_remove:
            prod = find_best_matching_product(message) or get_last_discussed_product(user_id)
            if prod:
                _last_shown_product.pop(user_id, None)
                return {
                    "message": f"🗑️ **{prod['name']}** has been removed from your cart.",
                    "intent": "REMOVE_FROM_CART",
                    "products": [],
                    "checkout_trigger": False,
                    "cart_action": {"action": "REMOVE", "product_id": prod["product_id"]}
                }
            return {
                "message": "Which product would you like to remove from your cart? Please mention the product name.",
                "intent": "CLARIFY",
                "products": [],
                "checkout_trigger": False,
                "cart_action": None
            }

        # ── 2. Add to Cart ──
        is_explicit_add = (
            re.search(r'\b(?:add|put|insert)\b.{0,80}\b(?:to|in|into)\s+(?:my\s+|the\s+)?cart\b', msg_lower)
            or msg_lower.startswith("add ")
            or msg_lower.startswith("add_to_cart")
            or "add_to_cart" in msg_lower
            or any(p in msg_lower for p in ["add to cart", "add this to cart", "add it to cart", "add to my cart", "put in cart", "put this in cart", "add this", "add it"])
        )

        affirmation_words = ["yes", "yeah", "yep", "sure", "ok", "okay", "do it", "go ahead", "please", "confirm", "proceed", "add please", "yes please"]
        is_affirmation = any(msg_lower == w or msg_lower.startswith(w + " ") or msg_lower.startswith(w + ",") for w in affirmation_words)

        if is_explicit_add or is_affirmation:
            prod = find_best_matching_product(message)
            if not prod and (is_affirmation or any(p in msg_lower for p in ["this", "it", "to cart", "cart", "add_to_cart"])):
                prod = get_last_discussed_product(user_id)

            if prod:
                upsell_info = SellerAgent.UPSELL_MAP.get(prod["product_id"])
                if upsell_info:
                    upsell_prod = get_product_by_id(upsell_info["upsell_product_id"])
                    discount_inr = upsell_info["discount_paisa"] // 100
                    upsell_name = upsell_prod["name"] if upsell_prod else "a complementary accessory"
                    upsell_price_inr = int(upsell_prod["price_paisa"] / 100) if upsell_prod else 0
                    pitch = (
                        f"✅ **{prod['name']}** has been added to your cart!\n\n"
                        f"{upsell_info['seller_pitch']}\n\n"
                        f"**{upsell_name}** — ₹{upsell_price_inr:,}\n"
                        f"🏷️ Use code **{upsell_info['discount_code']}** to save ₹{discount_inr} on your bundle!"
                    )
                    cross_sell = [upsell_info["upsell_product_id"]] if upsell_prod else []
                else:
                    pitch = f"✅ **{prod['name']}** has been added to your cart! Say 'place the order' whenever you're ready to checkout."
                    cross_sell = []

                _last_shown_product[user_id] = prod["product_id"]
                return {
                    "message": pitch,
                    "intent": "ADD_TO_CART",
                    "products": cross_sell,
                    "checkout_trigger": False,
                    "cart_action": {"action": "ADD", "product_id": prod["product_id"]}
                }

            if is_explicit_add and not is_affirmation:
                return {
                    "message": "I'd love to add that to your cart! Which product would you like to add? For example: 'Add Apple iPad Pro' or 'Add Dell XPS'.",
                    "intent": "CLARIFY",
                    "products": [],
                    "checkout_trigger": False,
                    "cart_action": None
                }

        return None

    @staticmethod
    def _heuristic_fallback(user_id: str, message: str) -> Dict[str, Any]:
        msg_lower = message.lower().strip()

        # Checkout intent detection
        checkout_patterns = [
            "place the order", "placed the order", "place order", "placed order",
            "make payment", "made payment", "make the payment", "pay", "checkout",
            "confirm order", "confirmed order", "buy now", "purchase now",
            "order now", "complete payment", "process payment", "authorize payment",
            "buy this", "order this"
        ]
        is_checkout = any(p in msg_lower for p in checkout_patterns)

        matched_target_prod = find_best_matching_product(message)

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
        if matched_target_prod:
            p = matched_target_prod
            _last_shown_product[user_id] = p["product_id"]
            price_inr = p["price_paisa"] / 100
            stock_status = f"In Stock ({p['stock_qty']} units available)" if p['stock_qty'] > 0 else "Currently Out of Stock"
            return {
                "message": f"**{p['name']}** (₹{price_inr:,.0f})\n\n**Category:** {p['category']}\n**Description:** {p['description']}\n**Availability:** {stock_status}\n\nWould you like me to add this to your cart or process your order?",
                "intent": "SHOW_PRODUCTS",
                "products": [p["product_id"]],
                "checkout_trigger": False
            }

        # Laptops search
        if any(w in msg_lower for w in ["laptop", "laptops", "macbook", "workstation", "dell", "creator"]):
            return {
                "message": "Here are our top high-performance creator workstations! We feature the **Dell XPS 15 OLED Workstation** (i9, RTX 4070, 32GB) and the **Apple MacBook Pro 14-inch M3 Pro** (Liquid Retina XDR, 18-hour battery). Both are powerhouse machines tailored for intensive workflows.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_dell_laptop", "prod_macbook_pro"],
                "checkout_trigger": False
            }

        # Watches search
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
        all_prods = get_all_products()
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

    @staticmethod
    def _get_cross_sell_suggestions(product_id: str) -> List[Dict[str, Any]]:
        """Return smart cross-sell product suggestions for a product just added to cart."""
        upsell_info = SellerAgent.UPSELL_MAP.get(product_id)
        if upsell_info:
            prod = get_product_by_id(upsell_info["upsell_product_id"])
            if prod:
                prod["in_stock"] = prod["stock_qty"] > 0
                return [prod]
        return []

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
        "prod_casio_gshock": {
            "upsell_product_id": "prod_watch_strap",
            "discount_code": "GSHOCKBUNDLE",
            "discount_paisa": 20000,
            "seller_pitch": "⌚ Complement your Casio G-Shock with our premium Hirsch leather strap for dress occasions. Save Rs 200 with code GSHOCKBUNDLE!"
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
        "prod_ipad_pro": {
            "upsell_product_id": "prod_airpods_pro",
            "discount_code": "APPLEBUNDLE",
            "discount_paisa": 100000,
            "seller_pitch": "🎧 Elevate your iPad Pro experience with Apple AirPods Pro 2nd Gen! Enjoy Spatial Audio, ANC, and seamless connectivity. Add it and save Rs 1,000 with code APPLEBUNDLE."
        },
        "prod_leather_wallet": {
            "upsell_product_id": "prod_sony_headphones",
            "discount_code": "PREMIUMPACK",
            "discount_paisa": 30000,
            "seller_pitch": "🎧 Great pick! Pair your Bellroy wallet with our Sony WH-1000XM5 wireless headphones — the ultimate luxury everyday combo. Save Rs 300 with code PREMIUMPACK."
        },
        "prod_watch_strap": {
            "upsell_product_id": "prod_omega_chronometer",
            "discount_code": "WATCHBUNDLE",
            "discount_paisa": 20000,
            "seller_pitch": "⌚ This genuine leather strap was crafted to pair with our Omega Seamaster Aqua Terra Chronometer. Save Rs 200 with code WATCHBUNDLE!"
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
