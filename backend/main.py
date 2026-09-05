"""
FastAPI application — Agentic Commerce Portal.
API keys managed via .env on backend only.
"""
import json
import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_db, log_audit_event, BASE_DIR
from schemas import (
    CartItem,
    ChatRequest, ChatResponse,
    UpsellRequest, UpsellResponse,
    CheckoutInitiateRequest, CheckoutInitiateResponse,
    AutonomousConfirmRequest, CheckoutConfirmRequest,
    ProductResponse, UserResponse, UpdateLimitRequest,
    AuditLogItem, OrderItem
)
from agents import BuyerAgent, SellerAgent, clear_conversation_memory
from gateway import SafetyGateway, RAZORPAY_KEY_ID

# Initialize DB on startup
init_db(force_reseed=False)

app = FastAPI(
    title="Agentic Commerce Portal API",
    description="Conversational E-Commerce with Autonomous Agent Settlement (using Razorpay for payment processing)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health & Config ──────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "portal": "Agentic Commerce Portal",
        "version": "2.0.0",
        "status": "ONLINE",
        "endpoints": [
            "/api/catalog", "/api/user", "/api/chat", "/api/upsell",
            "/api/checkout/initiate", "/api/checkout/autonomous",
            "/api/checkout/confirm", "/api/orders", "/api/audit-trail",
            "/api/memory/clear", "/api/reset-db", "/api/config"
        ]
    }

@app.get("/api/config")
def get_public_config():
    """Return non-sensitive public configuration (public key only, secret is never exposed)."""
    return {
        "razorpay_key_id": RAZORPAY_KEY_ID
    }

# ─── Catalog ──────────────────────────────────────────────────────────────────

@app.get("/api/catalog", response_model=List[ProductResponse])
def get_catalog(category: Optional[str] = Query(default=None)):
    with get_db() as conn:
        cursor = conn.cursor()
        if category and category.lower() != "all":
            cursor.execute("SELECT * FROM products WHERE category = ?", (category,))
        else:
            cursor.execute("SELECT * FROM products")
        rows = cursor.fetchall()
    return [
        {**dict(r), "in_stock": r["stock_qty"] > 0}
        for r in rows
    ]

@app.get("/api/catalog/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE product_id = ?", (product_id,))
        row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return {**dict(row), "in_stock": row["stock_qty"] > 0}

# ─── User ─────────────────────────────────────────────────────────────────────

@app.get("/api/user", response_model=UserResponse)
def get_user(user_id: str = Query(default="user_01")):
    try:
        return SafetyGateway.get_user_state(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/user/limit", response_model=UserResponse)
def update_limit(payload: UpdateLimitRequest):
    try:
        return SafetyGateway.update_user_limit(payload.user_id, payload.daily_spend_limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ─── Chat (with in-chat checkout) ─────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        # Run buyer agent
        agent_result = BuyerAgent.process_message(
            user_id=payload.user_id,
            message=payload.message,
            api_key=payload.gemini_api_key,
            cart=payload.cart
        )

        checkout_result = None

        # Resolve cart items: either from payload.cart or automatically matched from recommendation/message
        checkout_cart = list(payload.cart) if payload.cart else []

        if agent_result.get("checkout_trigger") and not checkout_cart:
            if agent_result.get("recommended_products"):
                top_p = agent_result["recommended_products"][0]
                checkout_cart = [
                    CartItem(
                        product_id=top_p["product_id"],
                        qty=1,
                        price_paisa=top_p["price_paisa"],
                        name=top_p["name"],
                        image_url=top_p["image_url"]
                    )
                ]
            else:
                # Check if user mentioned any product in catalog
                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM products WHERE stock_qty > 0")
                    all_p = [dict(r) for r in cursor.fetchall()]
                    for p in all_p:
                        p_words = [w for w in p["name"].lower().split() if len(w) > 3]
                        if any(w in payload.message.lower() for w in p_words) or p["category"].lower() in payload.message.lower():
                            checkout_cart = [
                                CartItem(
                                    product_id=p["product_id"],
                                    qty=1,
                                    price_paisa=p["price_paisa"],
                                    name=p["name"],
                                    image_url=p["image_url"]
                                )
                            ]
                            agent_result["recommended_products"] = [{**p, "in_stock": True}]
                            break

        # If checkout intent detected and cart has items, execute payment
        if agent_result.get("checkout_trigger") and checkout_cart:
            try:
                init_data = SafetyGateway.initiate_checkout(
                    user_id=payload.user_id,
                    items=checkout_cart,
                    discount_code=payload.discount_code
                )

                item_names = ", ".join(it.name or it.product_id for it in checkout_cart)

                if not init_data["requires_human_override"]:
                    # Autonomous settlement
                    settle = SafetyGateway.execute_autonomous_settlement(
                        transaction_id=init_data["transaction_id"],
                        token=init_data["token"]
                    )
                    checkout_result = {
                        "flow": "AUTONOMOUS",
                        "status": "SUCCESS",
                        "transaction_id": init_data["transaction_id"],
                        "amount_paisa": init_data["final_amount_paisa"],
                        "items": [it.dict() for it in checkout_cart],
                        "message": "🎉 Order booked autonomously! Your product is secured."
                    }
                    agent_result["message"] = (
                        f"🎉 Order booked autonomously! Your product is secured. Thanks for purchasing!\n\n"
                        f"**Item(s):** {item_names}\n"
                        f"**Transaction ID:** `{init_data['transaction_id']}`\n"
                        f"**Amount Settled:** ₹{init_data['final_amount_paisa']/100:,.2f}\n\n"
                        f"Your purchase is logged in **My Orders** with a complete receipt."
                    )
                else:
                    # Needs human override - return razorpay info
                    checkout_result = {
                        "flow": "HUMAN_OVERRIDE",
                        "status": "PENDING",
                        "transaction_id": init_data["transaction_id"],
                        "token": init_data["token"],
                        "amount_paisa": init_data["final_amount_paisa"],
                        "razorpay_order_id": init_data["razorpay_order_id"],
                        "razorpay_key_id": RAZORPAY_KEY_ID,
                        "items": [it.dict() for it in checkout_cart],
                        "message": "⚠️ Daily limit exceeded. Escalating to human for manual approval."
                    }
                    agent_result["message"] = (
                        f"⚠️ Daily limit exceeded. Escalating to human for manual approval.\n\n"
                        f"**Order Total:** ₹{init_data['final_amount_paisa']/100:,.2f} exceeds your pre-approved daily limit of ₹{init_data['daily_limit_paisa']/100:,.2f}.\n"
                        f"I have opened the official **Razorpay Test-Mode** payment window on your screen to complete authorization."
                    )

            except ValueError as ve:
                checkout_result = {
                    "flow": "ERROR",
                    "status": "FAILED",
                    "message": str(ve)
                }
                agent_result["message"] = f"❌ I couldn't process the payment: {ve}. Please check your cart or stock levels and try again."

        elif agent_result.get("checkout_trigger") and not checkout_cart:
            # Only set empty cart message if user actually meant to checkout now
            if agent_result.get("intent") == "INITIATE_CHECKOUT":
                agent_result["message"] = (
                    "Your cart is currently empty! Please tell me which item you'd like to purchase "
                    "(e.g., *'Buy the Omega watch'* or *'Order Keychron keyboard'*), or click **Add to Cart** on any product card, "
                    "and I'll book it immediately."
                )
            agent_result["checkout_trigger"] = False

        # Resolve cart_action product details for ADD_TO_CART so the frontend gets a full product object
        raw_cart_action = agent_result.get("cart_action")
        cart_action = None
        if raw_cart_action and isinstance(raw_cart_action, dict):
            action_type = raw_cart_action.get("action", "").upper()
            action_pid = raw_cart_action.get("product_id")
            if action_type in ("ADD", "REMOVE") and action_pid:
                resolved_prod = None
                # Try to find product in already-resolved recommended_products first
                for rp in agent_result.get("recommended_products", []):
                    if rp.get("product_id") == action_pid:
                        resolved_prod = rp
                        break
                if not resolved_prod:
                    from agents import get_product_by_id
                    resolved_prod = get_product_by_id(action_pid)
                if resolved_prod:
                    cart_action = {
                        "action": action_type,
                        "product_id": action_pid,
                        "product": {**resolved_prod, "in_stock": resolved_prod.get("stock_qty", 1) > 0}
                    }

        return {
            "agent_name": agent_result.get("agent_name", "Atelier AI Shopping Concierge"),
            "message": agent_result.get("message", "How can I help you?"),
            "intent": agent_result.get("intent", "CHAT"),
            "checkout_trigger": agent_result.get("checkout_trigger", False),
            "catalog_offer": agent_result.get("catalog_offer"),
            "recommended_products": agent_result.get("recommended_products", []),
            "checkout_result": checkout_result,
            "cart_action": cart_action,
            "intent_payload": agent_result.get("intent_payload", {"intent": agent_result.get("intent", "CHAT")})
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

# ─── Upsell ───────────────────────────────────────────────────────────────────

@app.post("/api/upsell", response_model=UpsellResponse)
def get_upsell(payload: UpsellRequest):
    return SellerAgent.evaluate_upsell(payload.product_id)

# ─── Checkout ─────────────────────────────────────────────────────────────────

@app.post("/api/checkout/initiate")
def initiate_checkout(payload: CheckoutInitiateRequest):
    try:
        result = SafetyGateway.initiate_checkout(
            user_id=payload.user_id,
            items=payload.items,
            discount_code=payload.discount_code
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout error: {e}")

@app.post("/api/checkout/autonomous")
def autonomous_checkout(payload: AutonomousConfirmRequest):
    try:
        return SafetyGateway.execute_autonomous_settlement(
            transaction_id=payload.transaction_id,
            token=payload.token
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settlement error: {e}")

@app.post("/api/checkout/confirm")
def confirm_checkout(payload: CheckoutConfirmRequest):
    try:
        return SafetyGateway.confirm_razorpay_payment(
            transaction_id=payload.transaction_id,
            token=payload.token,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confirmation error: {e}")

# ─── Orders ───────────────────────────────────────────────────────────────────

@app.get("/api/orders")
def get_orders(user_id: str = Query(default="user_01"), limit: int = Query(default=50)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT * FROM transactions
               WHERE user_id = ? AND status = 'SUCCESS'
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        )
        rows = cursor.fetchall()

    orders = []
    for row in rows:
        d = dict(row)
        try:
            items_raw = json.loads(d.get("items_json", "[]"))
            items = [
                {
                    "product_id": it.get("product_id", ""),
                    "name": it.get("name", ""),
                    "qty": it.get("qty", 1),
                    "price_paisa": it.get("price_paisa", 0)
                }
                for it in items_raw
            ]
        except Exception:
            items = []

        orders.append({
            "transaction_id": d["transaction_id"],
            "user_id": d["user_id"],
            "amount_paisa": d["amount_paisa"],
            "status": d["status"],
            "flow_type": d["flow_type"],
            "items": items,
            "discount_code": d.get("discount_code"),
            "discount_paisa": d.get("discount_paisa", 0),
            "razorpay_payment_id": d.get("razorpay_payment_id"),
            "created_at": d["created_at"],
            "updated_at": d["updated_at"]
        })

    return orders

# ─── Audit Trail ──────────────────────────────────────────────────────────────

@app.get("/api/audit-trail", response_model=List[AuditLogItem])
def get_audit_trail(limit: int = Query(default=50)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cursor.fetchall()]

# ─── Memory ───────────────────────────────────────────────────────────────────

@app.delete("/api/memory/clear")
def clear_memory(user_id: str = Query(default="user_01")):
    clear_conversation_memory(user_id)
    return {"status": "cleared", "user_id": user_id}

# ─── Reset DB ─────────────────────────────────────────────────────────────────

@app.post("/api/reset-db")
def reset_database():
    init_db(force_reseed=True)
    log_audit_event("[SYSTEM RESET]", "Manual system reset. Restored initial data.", level="INFO")
    return {"status": "SUCCESS", "message": "Database reseeded to initial state."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
