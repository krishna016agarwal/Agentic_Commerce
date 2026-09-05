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
# Remembers which product(s) were most recently shown/discussed per user so that
# vague commands like "yes", "add it", "compare these two", "both" can be resolved.
_last_shown_product: Dict[str, str] = {}  # user_id -> primary product_id
_last_shown_products_list: Dict[str, List[str]] = {}  # user_id -> list of product_ids shown

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

def save_message_to_memory(user_id: str, role: str, content: str, shown_products: Optional[List[Dict[str, Any]]] = None):
    """Persist a single conversation turn to DB, attaching displayed products for assistant turns."""
    from datetime import datetime
    saved_content = content
    if role == "model" and shown_products:
        prods_str = ", ".join(f"{p.get('name')} (ID: {p.get('product_id')})" for p in shown_products)
        saved_content += f"\n[Products currently displayed on user screen: {prods_str}]"
    with get_db() as conn:
        conn.execute(
            """INSERT INTO conversation_memory (user_id, role, content, created_at)
               VALUES (?, ?, ?, ?)""",
            (user_id, role, saved_content, datetime.now().isoformat())
        )

def clear_conversation_memory(user_id: str):
    """Clear all chat history for a user."""
    _last_shown_product.pop(user_id, None)
    _last_shown_products_list.pop(user_id, None)
    with get_db() as conn:
        conn.execute("DELETE FROM conversation_memory WHERE user_id = ?", (user_id,))

def get_last_user_transaction(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the most recent transaction for a user."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT * FROM transactions
                   WHERE user_id = ?
                   ORDER BY created_at DESC LIMIT 1""",
                (user_id,)
            )
            row = cursor.fetchone()
        if row:
            return dict(row)
    except Exception:
        pass
    return None

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
            if score > 0:
                scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [p for _, p in scored]

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

def get_user_order_context(user_id: str) -> str:
    """Provide real-time order context for the system prompt."""
    tx = get_last_user_transaction(user_id)
    if not tx:
        return "No past orders found in this session."
    try:
        items = json.loads(tx["items_json"]) if tx.get("items_json") else []
        item_names = ", ".join(it.get("name", it.get("product_id", "Item")) for it in items)
    except Exception:
        item_names = "Selected items"
    amt = tx["amount_paisa"] / 100
    return (
        f"Latest Order ID: {tx['transaction_id']} | Status: {tx['status']} | "
        f"Amount: Rs {amt:,.2f} | Items: {item_names} | Flow: {tx['flow_type']} | "
        f"Created: {tx.get('created_at', '')}"
    )

def build_system_prompt(user_id: str = "", cart: Optional[List[Any]] = None) -> str:
    catalog_str = build_catalog_context()
    order_context = get_user_order_context(user_id) if user_id else "No past orders."
    cart_str = "Cart is currently empty."
    if cart:
        items_lines = []
        for it in cart:
            d = it if isinstance(it, dict) else (it.dict() if hasattr(it, "dict") else dict(it))
            name = d.get("name") or d.get("product_id")
            items_lines.append(f"- {name} (ID: {d.get('product_id')}) x{d.get('qty', 1)}")
        if items_lines:
            cart_str = "\n".join(items_lines)

    return f"""You are "Atelier Shopping Assistant", a warm, highly knowledgeable, luxury AI shopping concierge for the Atelier e-commerce store.
You know every product in our catalog by heart and assist shoppers with product discovery, personalized advice, side-by-side comparisons, and smooth autonomous checkouts.

CATALOG (all available products with live inventory):
{catalog_str}

USER'S CURRENT CART CONTENTS:
{cart_str}

USER'S RECENT ORDER CONTEXT:
{order_context}

CONVERSATIONAL GUIDELINES & BEHAVIOR:
1. When a user inquires about a product category (e.g. "I want to buy a laptop", "show me watches", "headphones"):
   - Recommend the top matching models from our catalog (e.g. for laptops: Dell XPS 15 OLED Workstation AND Apple MacBook Pro 14-inch M3 Pro).
   - In your message, highlight what makes each distinct (e.g. Dell offers Intel i9 + NVIDIA RTX 4070 + OLED display for creators/gamers; MacBook Pro offers M3 Pro efficiency, all-day battery, and macOS).
   - Ask what their primary use case is (e.g. video editing, coding, gaming, portability) to help them decide.
   - Set intent="SHOW_PRODUCTS" and include BOTH product IDs in "products".

2. When a user asks "Which should I buy?", "Which one do you recommend?", or "What's the difference?":
   - Use the conversation context to see which items were just discussed or displayed.
   - Provide a thoughtful, balanced comparison highlighting pros, cons, and who each is best suited for.
   - Offer a clear recommendation based on different user needs.
   - Set intent="SHOW_PRODUCTS" and keep the relevant product IDs in "products".

3. When a user says "Book this", "Buy this", "Order this", "Place order", "Make payment":
   - If a single product was clearly focused on or specifically named (e.g. "book the Dell", "order the MacBook", or "book this" when only 1 item was under discussion):
     Set intent="INITIATE_CHECKOUT", checkout_trigger=true, and list that product ID in "products".
     Confirm warmly: "I'm initiating checkout for your [Product Name] now!"
   - If multiple products were discussed and the user hasn't specified which one (e.g. just said "book this"):
     Politely ask: "I'd be happy to book that for you! Which one would you prefer — the [Option 1] or the [Option 2]?"
     Set intent="CLARIFY", checkout_trigger=false, and list both product IDs in "products".

4. When a user asks about order or payment status ("Have my order placed?", "Is payment done?", "Did you pay?", "Check my order"):
   - Refer to the USER'S RECENT ORDER CONTEXT above and conversation memory.
   - If an order was settled (Status: SUCCESS), reassure the customer warmly with the product name and Transaction ID.
   - If an order is pending or exceeded daily limit (Status: HUMAN_OVERRIDE), explain that manual approval is needed via Razorpay.
   - Set intent="CHAT", checkout_trigger=false. NEVER set checkout_trigger=true for status inquiries!

5. When a user says "Add [product] to cart" or "Add this to cart":
   - Set intent="ADD_TO_CART", set cart_action={{"action": "ADD", "product_id": "<id>"}}, and suggest 1 relevant complementary item (e.g. Dell XPS -> Logitech MX Master 3S).

6. When a user asks to remove an item ("Remove the watch from my cart", "Remove this", "Delete from cart"):
   - Look at USER'S CURRENT CART CONTENTS!
   - Set intent="REMOVE_FROM_CART", and set cart_action={{"action": "REMOVE", "product_id": "<matching_cart_item_id>"}}.
   - Only remove items that are ACTUALLY IN THE USER'S CART! Never remove an item that is not in the cart.

7. When a user says "no", "no thanks", "not interested", "never mind":
   - Respond naturally and politely (e.g. "No worries at all! Let me know if you need anything else."). Set intent="CHAT", products=[].

8. Handling Ambiguity:
   - If you genuinely cannot understand what the user wants, ask a polite, conversational clarifying question (e.g. "Could you please clarify which item you have in mind?").
   - NEVER repeat generic robotic templates.

RESPONSE FORMAT (Strict JSON only, no markdown wrappers):
{{
  "message": "Your conversational reply here",
  "intent": "CHAT" | "SHOW_PRODUCTS" | "INITIATE_CHECKOUT" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "CLARIFY",
  "products": ["prod_id_1", "prod_id_2"],
  "checkout_trigger": false,
  "cart_action": null
}}
"""

# ─── BuyerAgent ───────────────────────────────────────────────────────────────

class BuyerAgent:
    """Conversational Buyer Agent with full memory and Gemini multi-turn chat."""

    @staticmethod
    def process_message(user_id: str, message: str, api_key: str = None, cart: Optional[List[Any]] = None) -> Dict[str, Any]:
        effective_key = api_key or GEMINI_API_KEY
        save_message_to_memory(user_id, "user", message)

        # ── 0. PAYMENT / ORDER STATUS INQUIRY INTERCEPTION ──
        msg_lower = message.lower().strip()
        status_inquiry_patterns = [
            r'\b(?:have|has|did|is|was)\s+(?:you|u|my|the|it)\b.{0,30}\b(?:payment|order|transaction|paid|booked|placed)\b',
            r'\b(?:is|was)\s+(?:payment|order)\s+(?:done|made|completed|successful|placed|confirmed)\b',
            r'\b(?:done\s+with\s+payment|payment\s+done|payment\s+status|order\s+status|check\s+payment|check\s+my\s+order)\b',
            r'\b(?:did\s+(?:you|u)\s+pay|have\s+(?:you|u)\s+paid|have\s+my\s+order\s+placed)\b'
        ]
        is_status_inquiry = any(re.search(p, msg_lower) for p in status_inquiry_patterns)
        if is_status_inquiry:
            tx = get_last_user_transaction(user_id)
            if tx and tx.get("status") == "SUCCESS":
                items = json.loads(tx["items_json"]) if tx.get("items_json") else []
                item_names = ", ".join(it.get("name", it.get("product_id", "Item")) for it in items) or "your selected item"
                amt = tx["amount_paisa"] / 100
                status_msg = (
                    f"✅ Yes! Your order for **{item_names}** (₹{amt:,.2f}) was successfully placed and settled via autonomous payment.\n\n"
                    f"**Transaction ID:** `{tx['transaction_id']}`\n"
                    f"**Status:** Confirmed & Settled\n\n"
                    f"Your receipt has been recorded under **My Orders**."
                )
            elif tx and (tx.get("status") in ("PENDING", "RESERVED") or tx.get("flow_type") == "HUMAN_OVERRIDE"):
                items = json.loads(tx["items_json"]) if tx.get("items_json") else []
                item_names = ", ".join(it.get("name", it.get("product_id", "Item")) for it in items) or "your selected item"
                amt = tx["amount_paisa"] / 100
                status_msg = (
                    f"⏳ Your order for **{item_names}** (Total: ₹{amt:,.2f}, ID: `{tx['transaction_id']}`) "
                    f"has been initiated! Because the total exceeds your autonomous limit, it is currently "
                    f"awaiting authorization. Please complete the Razorpay window on your screen to finalize it."
                )
            else:
                status_msg = "No recent orders or payments were found for your account. You can explore our collection, add items to your cart, and say 'place the order' anytime!"

            save_message_to_memory(user_id, "model", status_msg)
            return {
                "agent_name": "Atelier AI Shopping Concierge",
                "message": status_msg,
                "intent": "CHAT",
                "checkout_trigger": False,
                "cart_action": None,
                "recommended_products": [],
                "catalog_offer": {"status": "CHAT_RESPONSE", "products_count": 0},
                "intent_payload": {"intent": "CHAT"}
            }

        # ── 1. DETERMINISTIC CART COMMAND INTERCEPTION ──
        # Guarantees that "add X to cart", "add X", "add this to cart", "yes ADD_TO_CART",
        # "yes", "remove X from cart", etc. NEVER fail or dump the catalog!
        cart_command_result = BuyerAgent._check_cart_command(user_id, message, cart=cart)
        if cart_command_result:
            result = cart_command_result
        else:
            # ── 2. LLM Path with Multi-Model Fallback ──
            result = None
            history = load_conversation_history(user_id, limit=30)
            history_for_gemini = history[:-1] if history else []

            if GEMINI_AVAILABLE and effective_key:
                genai.configure(api_key=effective_key)
                # Multi-model cascade: Prioritize active models with verified available quota
                models_to_try = [
                    "gemini-3.5-flash-lite",
                    "gemini-3.1-flash-lite",
                    "gemini-3.5-flash",
                    "gemini-3-flash-preview",
                    "gemini-2.5-flash-lite",
                    "gemini-2.5-flash"
                ]
                for model_name in models_to_try:
                    try:
                        model = genai.GenerativeModel(
                            model_name,
                            system_instruction=build_system_prompt(user_id, cart=cart)
                        )
                        chat = model.start_chat(history=history_for_gemini)
                        response = chat.send_message(message, request_options={"timeout": 8.0})
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
                                "checkout_trigger": any(w in message.lower() for w in ["place the order", "placed the order", "make payment", "checkout", "buy now"])
                            }

                        result = parsed
                        if result:
                            log_audit_event(
                                "[GEMINI LLM]",
                                f"Atelier responded via {model_name}: intent={result.get('intent')}, products={len(result.get('products', []))}",
                                level="INFO",
                                metadata={"user_id": user_id, "intent": result.get("intent"), "model": model_name}
                            )
                            break  # Successfully generated response!

                    except Exception as e:
                        print(f"[GEMINI {model_name} ERROR] {e}. Trying next model...")
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
        elif intent == "SHOW_PRODUCTS":
            if product_ids:
                for pid in product_ids:
                    p = get_product_by_id(pid)
                    if p:
                        recommended_products.append(p)

            # Fallback catalog search ONLY if intent was SHOW_PRODUCTS and LLM returned no valid IDs
            if not recommended_products and not result.get("checkout_trigger"):
                msg_lower = message.lower()
                category_map = {
                    "laptop": "Laptops", "macbook": "Laptops", "dell": "Laptops", "workstation": "Laptops",
                    "watch": "Watches", "omega": "Watches", "rolex": "Watches", "casio": "Watches", "chronometer": "Watches",
                    "keyboard": "Electronics", "mouse": "Electronics", "monitor": "Electronics", "keychron": "Electronics", "logitech": "Electronics",
                    "headphone": "Audio", "airpod": "Audio", "sony": "Audio", "earphone": "Audio", "audio": "Audio", "earbuds": "Audio",
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
                    "keywords": [k for k in keywords if k not in ["want", "buy", "nuy", "show", "need", "like", "find", "get", "please", "this", "that", "the"]]
                })
        # If intent == "CHAT", recommended_products remains empty so it will NOT show unrelated products!

        # ── 4. Granular Audit Logging ──
        msg_lower_full = message.lower()
        is_explain_query = any(w in msg_lower_full for w in ["explain", "feature", "specs", "specification", "detail", "tell me about"])
        is_all_products_query = any(w in msg_lower_full for w in ["show all", "all products", "list products", "catalog", "show products", "show watches", "show laptops", "products"])
        matched_target_prod = find_best_matching_product(message)

        if intent == "STOCK_OUT_WARNING" or (matched_target_prod and matched_target_prod.get("stock_qty", 0) <= 0 and any(w in msg_lower_full for w in ["buy", "order", "add", "purchase", "checkout", "get"])):
            failed_p = matched_target_prod or (recommended_products[0] if recommended_products else {"product_id": "prod_out_of_stock", "name": "Requested Item"})
            stock_out_payload = {
                "user_id": user_id,
                "intent": "STOCK_OUT_WARNING",
                "model": "gemini-3.1-flash-lite",
                "failed_item": {
                    "product_id": failed_p["product_id"],
                    "name": failed_p["name"],
                    "available_stock": 0
                },
                "system_action": "BLOCKED_CHECKOUT_CONVERSATIONALLY",
                "graceful_fallback_message": f"I'm sorry, the {failed_p['name']} is currently out of stock. Would you like me to recommend a comparable model instead?"
            }
            log_audit_event(
                "[STOCK OUT WARNING]",
                f"BLOCKED (Failure Handled Gracefully #1): {failed_p['name']} is out of stock. Checkout blocked conversationally.",
                level="ALERT",
                metadata=stock_out_payload
            )
        elif is_explain_query and (matched_target_prod or (recommended_products and len(recommended_products) == 1)):
            target = matched_target_prod or recommended_products[0]
            explain_payload = {
                "user_id": user_id,
                "intent": "EXPLAIN_PRODUCT",
                "model": "gemini-3.1-flash-lite",
                "target_product": {
                    "product_id": target["product_id"],
                    "name": target["name"],
                    "description": target["description"],
                    "price_paisa": target["price_paisa"],
                    "stock_qty": target["stock_qty"]
                }
            }
            log_audit_event(
                "[EXPLAIN PRODUCT]",
                f"Detailed specs generated for {target['name']}",
                level="INFO",
                metadata=explain_payload
            )
        elif is_all_products_query or (intent in ("SHOW_PRODUCTS", "SHOW_ALL_PRODUCTS") and recommended_products):
            prods_to_log = recommended_products if recommended_products else get_all_products()[:6]
            show_all_payload = {
                "user_id": user_id,
                "intent": "SHOW_ALL_PRODUCTS",
                "model": "gemini-3.1-flash-lite",
                "returned_products": [
                    {"product_id": p["product_id"], "name": p["name"], "stock_qty": p.get("stock_qty", 0)}
                    for p in prods_to_log
                ]
            }
            log_audit_event(
                "[SHOW ALL PRODUCTS]",
                f"Catalog products returned ({len(prods_to_log)} items)",
                level="INFO",
                metadata=show_all_payload
            )

        # Save assistant response to memory WITH displayed products so Gemini remembers next turn
        save_message_to_memory(user_id, "model", result.get("message", ""), shown_products=recommended_products)

        # Track last shown/discussed product so next turn's "yes", "compare these", etc. know what products were shown
        if result.get("cart_action") and result["cart_action"].get("product_id"):
            _last_shown_product[user_id] = result["cart_action"]["product_id"]
        elif intent == "SHOW_PRODUCTS" and product_ids:
            _last_shown_product[user_id] = product_ids[0]
            _last_shown_products_list[user_id] = product_ids
        elif recommended_products:
            _last_shown_product[user_id] = recommended_products[0]["product_id"]
            _last_shown_products_list[user_id] = [p["product_id"] for p in recommended_products]

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
    def _check_cart_command(user_id: str, message: str, cart: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        """Deterministically intercept and execute cart mutations with marketing upsell."""
        msg_lower = message.lower().strip()

        # ── 0. Negation / Dismissal — MUST be checked FIRST before any affirmation logic ──
        negation_words = [
            "no", "nope", "no thanks", "no thank you", "not interested",
            "never mind", "nevermind", "don't want", "dont want", "not now",
            "that's fine", "thats fine", "i'm good", "im good", "skip",
            "cancel", "forget it", "not really", "nah"
        ]
        is_negation = any(
            msg_lower == w or msg_lower.startswith(w + " ") or msg_lower.startswith(w + ",") or msg_lower.startswith(w + "!")
            for w in negation_words
        )
        if is_negation:
            # Let the LLM handle it naturally — return None so it flows to Gemini
            return None

        # ── 1. Remove from Cart (Cart-Aware) ──
        is_remove = (
            re.search(r'\b(?:remove|delete|take\s+out|drop|clear)\b.{0,60}\b(?:from|out\s+of)?\s*(?:my\s+|the\s+)?cart\b', msg_lower)
            or any(p in msg_lower for p in ["remove from cart", "remove this from cart", "remove it from cart", "delete from cart", "remove the watch", "remove watch", "remove laptop", "remove keyboard", "take this out of cart"])
        )
        if is_remove:
            cart_items = [it if isinstance(it, dict) else (it.dict() if hasattr(it, "dict") else dict(it)) for it in cart] if cart else []

            if not cart_items:
                return {
                    "message": "Your cart is currently empty, so there are no items to remove!",
                    "intent": "CHAT",
                    "products": [],
                    "checkout_trigger": False,
                    "cart_action": None
                }

            # Map cart items to full product objects
            cart_prods = []
            for ci in cart_items:
                pid = ci.get("product_id")
                p = get_product_by_id(pid)
                if p:
                    cart_prods.append(p)

            # Match specifically against items actually in the user's cart
            matched_prod = None
            best_score = 0.0
            msg_words = [w for w in re.findall(r'\b\w+\b', msg_lower) if w not in ["remove", "from", "my", "the", "cart", "this", "it", "please", "out", "of"]]

            for cp in cart_prods:
                score = 0.0
                cp_name = cp["name"].lower()
                cp_cat = cp["category"].lower()
                cp_kw = cp.get("keywords", "").lower()

                for w in msg_words:
                    if w in cp_name:
                        score += 10.0
                    if w in cp_cat or w in cp_kw:
                        score += 5.0
                    # Handle common terms
                    if w in ("watch", "watches") and ("watch" in cp_cat or "watches" in cp_cat or "watch" in cp_kw or "watch" in cp_name):
                        score += 20.0
                    if w in ("laptop", "laptops") and ("laptop" in cp_cat or "laptops" in cp_cat or "laptop" in cp_name):
                        score += 20.0
                    if w in ("headphone", "headphones", "audio", "earbuds", "airpods") and ("audio" in cp_cat or "headphone" in cp_kw or "headphone" in cp_name):
                        score += 20.0

                if score > best_score:
                    best_score = score
                    matched_prod = cp

            # If user said vague "remove this" / "remove it" / "remove from cart" and there's only 1 item in the cart
            is_vague_remove = any(w in msg_lower for w in ["this", "it", "item", "my item"]) or len(msg_words) == 0
            if not matched_prod and len(cart_prods) == 1 and is_vague_remove:
                matched_prod = cart_prods[0]

            if matched_prod and (best_score >= 5.0 or (is_vague_remove and len(cart_prods) == 1)):
                _last_shown_product.pop(user_id, None)
                return {
                    "message": f"🗑️ **{matched_prod['name']}** has been removed from your cart.",
                    "intent": "REMOVE_FROM_CART",
                    "products": [],
                    "checkout_trigger": False,
                    "cart_action": {"action": "REMOVE", "product_id": matched_prod["product_id"]}
                }

            # If no cart item matched, list what is in the cart
            cart_names = ", ".join(f"**{cp['name']}**" for cp in cart_prods)
            return {
                "message": f"I couldn't find that item in your cart. Your cart currently has: {cart_names}. Which one would you like to remove?",
                "intent": "CLARIFY",
                "products": [],
                "checkout_trigger": False,
                "cart_action": None
            }

        # ── 2. Add to Cart ──
        is_explicit_add = (
            re.search(r'\b(?:add|put|insert)\b.{0,80}\b(?:to|in|into)\s+(?:my\s+|the\s+)?cart\b', msg_lower)
            or msg_lower.startswith("add_to_cart")
            or "add_to_cart" in msg_lower
            or any(p in msg_lower for p in ["add to cart", "add this to cart", "add it to cart", "add to my cart", "put in cart", "put this in cart"])
        )

        # Explicit "add [product name]" — only if a product name follows
        if not is_explicit_add and msg_lower.startswith("add "):
            # Only treat as add-to-cart if we can find a matching product
            candidate = find_best_matching_product(message)
            if candidate:
                is_explicit_add = True

        affirmation_words = ["yes", "yeah", "yep", "sure", "ok", "okay", "do it", "go ahead", "confirm", "proceed", "add please", "yes please"]
        is_affirmation = any(msg_lower == w or msg_lower.startswith(w + " ") or msg_lower.startswith(w + ",") for w in affirmation_words)

        if is_explicit_add or is_affirmation:
            prod = find_best_matching_product(message)
            if not prod and (is_affirmation or any(p in msg_lower for p in ["this", "it", "to cart", "cart", "add_to_cart"])):
                prod = get_last_discussed_product(user_id)

            if prod:
                if prod.get("stock_qty", 0) <= 0:
                    stock_out_payload = {
                        "user_id": user_id,
                        "intent": "STOCK_OUT_WARNING",
                        "model": "gemini-3.1-flash-lite",
                        "failed_item": {
                            "product_id": prod["product_id"],
                            "name": prod["name"],
                            "available_stock": 0
                        },
                        "system_action": "BLOCKED_CHECKOUT_CONVERSATIONALLY",
                        "graceful_fallback_message": f"I'm sorry, the {prod['name']} is currently out of stock. Would you like me to recommend a comparable model instead?"
                    }
                    log_audit_event(
                        "[STOCK OUT WARNING]",
                        f"BLOCKED (Failure Handled Gracefully #1): {prod['name']} out of stock. Add to cart blocked conversationally.",
                        level="ALERT",
                        metadata=stock_out_payload
                    )
                    return {
                        "message": f"⚠️ I'm sorry, the **{prod['name']}** is currently out of stock. Would you like me to recommend a comparable model instead?",
                        "intent": "STOCK_OUT_WARNING",
                        "products": [],
                        "checkout_trigger": False,
                        "cart_action": None
                    }

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

        # ── 0. Negation / Dismissal — handle conversationally, never show products ──
        negation_words = [
            "no", "nope", "no thanks", "no thank you", "not interested",
            "never mind", "nevermind", "don't want", "dont want", "not now",
            "that's fine", "thats fine", "i'm good", "im good", "skip",
            "cancel", "forget it", "not really", "nah"
        ]
        is_negation = any(
            msg_lower == w or msg_lower.startswith(w + " ") or msg_lower.startswith(w + ",") or msg_lower.startswith(w + "!")
            for w in negation_words
        )
        if is_negation:
            return {
                "message": "No worries at all! 😊 Feel free to ask whenever you'd like to explore something, compare products, or need any help. I'm here!",
                "intent": "CHAT",
                "products": [],
                "checkout_trigger": False
            }

        # ── 1. Checkout intent detection ──
        checkout_patterns = [
            r'\bplace\s+the\s+order\b', r'\bplaced\s+the\s+order\b', r'\bplace\s+order\b', r'\bplaced\s+order\b',
            r'\bmake\s+payment\b', r'\bmade\s+payment\b', r'\bmake\s+the\s+payment\b', r'\bpay\s+now\b', r'\bcheckout\b',
            r'\bconfirm\s+order\b', r'\bconfirmed\s+order\b', r'\bbuy\s+now\b', r'\bpurchase\s+now\b',
            r'\border\s+now\b', r'\bcomplete\s+payment\b', r'\bprocess\s+payment\b', r'\bauthorize\s+payment\b',
            r'\bbuy\s+this\b', r'\border\s+this\b'
        ]
        # Only trigger checkout if NOT a question asking whether payment/order is done
        is_question = any(q in msg_lower for q in ["have you", "have u", "did you", "did u", "is payment", "is the payment", "was payment", "done with payment"])
        is_checkout = not is_question and any(re.search(p, msg_lower) for p in checkout_patterns)

        matched_target_prod = find_best_matching_product(message)

        if is_checkout:
            target_ids = [matched_target_prod["product_id"]] if matched_target_prod else []
            return {
                "message": "Processing your order through our deterministic safety gateway...",
                "intent": "INITIATE_CHECKOUT",
                "products": target_ids,
                "checkout_trigger": True
            }

        # ── 2. Comparison intent ──
        compare_keywords = ["compare", "vs", "versus", "difference between", "better than", "which is better", "which one", "side by side", "these two", "both of these"]
        is_comparison = any(kw in msg_lower for kw in compare_keywords)
        if is_comparison:
            compared_prods = []
            # Check if user had 2 products displayed in session
            cached_pids = _last_shown_products_list.get(user_id, [])
            if len(cached_pids) >= 2:
                for cpid in cached_pids[:2]:
                    p = get_product_by_id(cpid)
                    if p and p not in compared_prods:
                        compared_prods.append(p)

            # Try to find products by keywords if not resolved
            if len(compared_prods) < 2:
                all_prods = get_all_products()
                for p in all_prods:
                    p_name_lower = p["name"].lower()
                    p_keywords_lower = p.get("keywords", "").lower()
                    if any(word in msg_lower for word in p_name_lower.split() if len(word) > 3) or \
                       any(kw.strip() in msg_lower for kw in p_keywords_lower.split(",") if len(kw.strip()) > 3):
                        if p not in compared_prods:
                            compared_prods.append(p)

            # Include last discussed product if we have only 1
            if len(compared_prods) < 2:
                last_prod = get_last_discussed_product(user_id)
                if last_prod and last_prod not in compared_prods:
                    compared_prods.insert(0, last_prod)

            compared_prods = compared_prods[:2]
            if len(compared_prods) == 2:
                p1, p2 = compared_prods
                p1_price = p1["price_paisa"] / 100
                p2_price = p2["price_paisa"] / 100
                p1_stock = f"In Stock ({p1['stock_qty']} units)" if p1["stock_qty"] > 0 else "Out of Stock"
                p2_stock = f"In Stock ({p2['stock_qty']} units)" if p2["stock_qty"] > 0 else "Out of Stock"
                return {
                    "message": (
                        f"Great question! Let me break down the comparison between **{p1['name']}** and **{p2['name']}** for you:\n\n"
                        f"**{p1['name']}** — ₹{p1_price:,.0f}\n"
                        f"{p1['description'][:150]}...\n"
                        f"Availability: {p1_stock}\n\n"
                        f"**{p2['name']}** — ₹{p2_price:,.0f}\n"
                        f"{p2['description'][:150]}...\n"
                        f"Availability: {p2_stock}\n\n"
                        f"{'💡 Both are excellent choices — which matters more to you: price, performance, or specific features?' if p1_price != p2_price else '💡 These are very comparable options! Which features are most important to you?'}"
                    ),
                    "intent": "SHOW_PRODUCTS",
                    "products": [p1["product_id"], p2["product_id"]],
                    "checkout_trigger": False
                }
            elif len(compared_prods) == 1:
                return {
                    "message": f"Sure, I can help compare! I have **{compared_prods[0]['name']}** in mind — which other product would you like to compare it with? You can name any item from our catalog!",
                    "intent": "CHAT",
                    "products": [],
                    "checkout_trigger": False
                }
            else:
                return {
                    "message": "I'd love to help you compare! Could you mention the two products you'd like to see side-by-side? For example: 'Compare Dell XPS with MacBook Pro'",
                    "intent": "CHAT",
                    "products": [],
                    "checkout_trigger": False
                }

        # ── 3. Casual greetings & Identity ──
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

        # ── 4. Product description / Explanation / Features inquiry ──
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

        # ── 5. Category-based searches ──
        if any(w in msg_lower for w in ["laptop", "laptops", "macbook", "workstation", "dell", "creator"]):
            return {
                "message": "Here are our top high-performance creator workstations! We feature the **Dell XPS 15 OLED Workstation** (i9, RTX 4070, 32GB) and the **Apple MacBook Pro 14-inch M3 Pro** (Liquid Retina XDR, 18-hour battery). Both are powerhouse machines tailored for intensive workflows.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_dell_laptop", "prod_macbook_pro"],
                "checkout_trigger": False
            }

        if any(w in msg_lower for w in ["watch", "watches", "timepiece", "chronometer", "rolex", "casio"]):
            return {
                "message": "Here are our finest luxury timepieces! From the iconic **Omega Seamaster Aqua Terra Chronometer** to the **Rolex Explorer II Stainless Steel** and rugged **Casio G-Shock Mudmaster**, our collection offers unmatched prestige and precision.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_omega_chronometer", "prod_rolex_explorer", "prod_casio_gshock", "prod_watch_strap"],
                "checkout_trigger": False
            }

        if any(w in msg_lower for w in ["headphone", "headphones", "earbuds", "airpod", "audio", "sony", "music"]):
            return {
                "message": "Here are our premier audio selections! Experience industry-leading noise cancellation with the **Sony WH-1000XM5** or immersive spatial audio with the **Apple AirPods Pro 2nd Gen**.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_sony_headphones", "prod_airpods_pro"],
                "checkout_trigger": False
            }

        if any(w in msg_lower for w in ["keyboard", "keychron", "mouse", "logitech", "desk", "typing"]):
            return {
                "message": "Here are our best workspace productivity essentials! The **Keychron K2 Wireless Mechanical Keyboard** pairs wonderfully with the ergonomic **Logitech MX Master 3S Mouse**.",
                "intent": "SHOW_PRODUCTS",
                "products": ["prod_keychron_keyboard", "prod_logitech_mouse"],
                "checkout_trigger": False
            }

        # ── 6. General keyword search — only show products if the message is clearly a product search ──
        shopping_intent_words = ["show", "find", "search", "buy", "want", "need", "looking for", "recommend", "suggest", "get me", "tell me about"]
        is_shopping_intent = any(w in msg_lower for w in shopping_intent_words)
        keywords = [w for w in re.findall(r'\b\w+\b', msg_lower) if len(w) > 2 and w not in ["the", "and", "for", "with", "want", "buy", "show", "get", "need", "like", "description", "details", "about", "more", "can", "this"]]

        if is_shopping_intent and keywords:
            matching_prods = query_products_by_params({"keywords": keywords})
            if matching_prods:
                prod_names = ", ".join([f"**{p['name']}**" for p in matching_prods[:3]])
                return {
                    "message": f"Here are some great options I found for you: {prod_names}. Would you like details on any of these?",
                    "intent": "SHOW_PRODUCTS",
                    "products": [p["product_id"] for p in matching_prods[:4]],
                    "checkout_trigger": False
                }

        # ── 7. Conversational fallback — respond naturally without dumping products ──
        all_prods = get_all_products()
        return {
            "message": "I'm here to help! Whether you want to explore our luxury collection, compare products, or get detailed specs on anything — just ask. What are you looking for today?",
            "intent": "CHAT",
            "products": [],
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

        original_price = upsell_item["price_paisa"] if upsell_item else 120000
        bundle_price = max(0, original_price - offer["discount_paisa"])
        upsell_log = {
            "trigger_upsell": True,
            "recommendation_engine": "Seller_Agent_v2",
            "user_cart": [product_id],
            "suggested_product": {
                "product_id": offer["upsell_product_id"],
                "name": upsell_item["name"] if upsell_item else "Upsell Item",
                "original_price_paisa": original_price,
                "bundle_price_paisa": bundle_price,
                "applied_discount_code": offer["discount_code"],
                "discount_paisa": offer["discount_paisa"]
            },
            "reasoning": f"User has {product_id} in cart. Cross-sell premium {upsell_item['name'] if upsell_item else 'accessory'} with ₹{offer['discount_paisa']/100:.0f} bundle discount."
        }

        log_audit_event(
            "[UPSELL PROPOSAL]",
            f"Cross-sell offer: {offer['discount_code']} (-Rs {offer['discount_paisa']/100:.0f}) for {product_id}",
            level="INFO",
            metadata=upsell_log
        )
        return payload
