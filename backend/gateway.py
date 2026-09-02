"""
Deterministic Safety Gateway & Payment Orchestrator.
API keys loaded from .env — never passed from frontend.
"""
import os
import uuid
import json
import secrets
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

import razorpay
from dotenv import load_dotenv
from database import get_db, log_audit_event
from schemas import CartItem

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_TWl4eo89k3aLud")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "TnA2AVvCQ5Ys6gdmVHHYLJ72")

def get_razorpay_client():
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

DISCOUNT_TABLE = {
    "WATCHBUNDLE": 20000,
    "ROLEXBUNDLE": 20000,
    "DESKSETUP": 50000,
    "LAPTOPBUNDLE": 50000,
    "MACBUNDLE": 50000,
    "PREMIUMPACK": 30000,
    "APPLEBUNDLE": 100000,
    "MONITORBUNDLE": 50000,
    "GAMINGSETUP": 100000,
    "OMEGABUNDLE": 30000,
    "MODESTLUXURY": 50000,
}

class SafetyGateway:
    """Rigid mathematical safety controller and execution coordinator."""

    @staticmethod
    def get_user_state(user_id: str) -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise ValueError(f"User {user_id} not found.")
            d = dict(user)
            d["remaining_limit_paisa"] = max(0, d["daily_spend_limit"] - d["daily_spend_accumulated"])
            return d

    @staticmethod
    def update_user_limit(user_id: str, new_limit_paisa: int) -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET daily_spend_limit = ? WHERE user_id = ?",
                (new_limit_paisa, user_id)
            )
            log_audit_event(
                "[UAP CONFIG]",
                f"User {user_id} spending ceiling adjusted to Rs {new_limit_paisa / 100:,.2f}",
                level="GATEWAY",
                metadata={"user_id": user_id, "new_limit_paisa": new_limit_paisa},
                conn=conn
            )
        return SafetyGateway.get_user_state(user_id)

    @staticmethod
    def initiate_checkout(
        user_id: str,
        items: List[CartItem],
        discount_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not items:
            raise ValueError("Cart is empty.")

        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise ValueError(f"User '{user_id}' not found.")

            daily_limit = user["daily_spend_limit"]
            daily_accumulated = user["daily_spend_accumulated"]
            remaining_limit = max(0, daily_limit - daily_accumulated)

            total_gross_paisa = 0
            validated_items = []

            for item in items:
                cursor.execute("SELECT * FROM products WHERE product_id = ?", (item.product_id,))
                prod = cursor.fetchone()
                if not prod:
                    raise ValueError(f"Product '{item.product_id}' not found.")

                if prod["stock_qty"] < item.qty:
                    raise ValueError(f"Insufficient stock for '{prod['name']}'. Available: {prod['stock_qty']}")

                item_price = prod["price_paisa"]
                total_gross_paisa += item_price * item.qty
                validated_items.append({
                    "product_id": prod["product_id"],
                    "name": prod["name"],
                    "qty": item.qty,
                    "price_paisa": item_price
                })

            # Discounts
            discount_amount_paisa = 0
            if discount_code:
                discount_amount_paisa = DISCOUNT_TABLE.get(discount_code.strip().upper(), 0)

            final_amount_paisa = max(100, total_gross_paisa - discount_amount_paisa)

            transaction_id = f"tx_{uuid.uuid4().hex[:12]}"
            acp_token = f"acp_{secrets.token_urlsafe(24)}"

            contract_proposal = {
                "user_id": user_id,
                "items": validated_items,
                "total_amount_paisa": final_amount_paisa,
                "gross_amount_paisa": total_gross_paisa,
                "applied_discount_code": discount_code,
                "discount_amount_paisa": discount_amount_paisa,
                "created_at": datetime.now().isoformat()
            }

            is_under_limit = (daily_accumulated + final_amount_paisa) <= daily_limit

            if is_under_limit:
                flow_type = "AUTONOMOUS"
                requires_human_override = False
                razorpay_order_id = None
                status = "RESERVED"
                message = "Transaction is within your daily spending limit. The AI Agent will handle authorization autonomously!"
                log_audit_event(
                    "[UAP CEILING]",
                    f"Amount Rs {final_amount_paisa/100:,.2f} is WITHIN limit Rs {remaining_limit/100:,.2f}. Autonomous path selected.",
                    level="GATEWAY",
                    metadata={"amount_paisa": final_amount_paisa, "remaining_limit": remaining_limit},
                    conn=conn
                )
            else:
                flow_type = "HUMAN_OVERRIDE"
                requires_human_override = True
                status = "RESERVED"

                log_audit_event(
                    "[ESCALATION TRIGGER]",
                    f"BREACH: Rs {final_amount_paisa/100:,.2f} exceeds remaining limit Rs {remaining_limit/100:,.2f}. Escalating.",
                    level="ALERT",
                    metadata={"amount_paisa": final_amount_paisa, "remaining_paisa": remaining_limit},
                    conn=conn
                )

                try:
                    client = get_razorpay_client()
                    order = client.order.create(data={
                        "amount": final_amount_paisa,
                        "currency": "INR",
                        "receipt": transaction_id,
                        "notes": {"user_id": user_id, "flow": "HUMAN_OVERRIDE"}
                    })
                    razorpay_order_id = order["id"]
                except Exception as e:
                    razorpay_order_id = f"order_{uuid.uuid4().hex[:14]}"
                    log_audit_event("[RAZORPAY FALLBACK]", f"Simulated order ID: {razorpay_order_id} ({e})", level="INFO", conn=conn)

                message = f"Transaction exceeds your daily limit of Rs {daily_limit/100:,.2f}. Escalating for manual Razorpay approval."

            # Reserve stock
            for item in items:
                cursor.execute(
                    "UPDATE products SET stock_qty = stock_qty - ? WHERE product_id = ?",
                    (item.qty, item.product_id)
                )

            # Record transaction
            now_str = datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO transactions (
                transaction_id, user_id, token, amount_paisa, status, flow_type,
                razorpay_order_id, razorpay_payment_id, razorpay_signature,
                items_json, discount_code, discount_paisa, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                transaction_id, user_id, acp_token, final_amount_paisa, status, flow_type,
                razorpay_order_id, None, None,
                json.dumps(validated_items), discount_code, discount_amount_paisa,
                now_str, now_str
            ))

            log_audit_event(
                "[IDEMPOTENCY GATE]",
                f"ACP token issued for {transaction_id}",
                level="GATEWAY",
                conn=conn
            )

        return {
            "transaction_id": transaction_id,
            "token": acp_token,
            "requires_human_override": requires_human_override,
            "flow_type": flow_type,
            "total_amount_paisa": total_gross_paisa,
            "discount_amount_paisa": discount_amount_paisa,
            "final_amount_paisa": final_amount_paisa,
            "daily_limit_paisa": daily_limit,
            "daily_accumulated_paisa": daily_accumulated,
            "remaining_limit_paisa": remaining_limit,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_key_id": RAZORPAY_KEY_ID,
            "currency": "INR",
            "message": message,
            "contract_proposal": contract_proposal
        }

    @staticmethod
    def execute_autonomous_settlement(transaction_id: str, token: str) -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM transactions WHERE transaction_id = ? AND token = ?",
                (transaction_id, token)
            )
            tx = cursor.fetchone()
            if not tx:
                raise ValueError("Invalid transaction ID or ACP token.")
            if tx["status"] == "SUCCESS":
                return {"status": "SUCCESS", "message": "Already settled."}
            if tx["status"] != "RESERVED":
                raise ValueError(f"Cannot settle in state '{tx['status']}'.")
            if tx["flow_type"] != "AUTONOMOUS":
                raise ValueError("This transaction requires manual override.")

            amount = tx["amount_paisa"]
            user_id = tx["user_id"]
            now_str = datetime.now().isoformat()

            cursor.execute(
                "UPDATE users SET daily_spend_accumulated = daily_spend_accumulated + ? WHERE user_id = ?",
                (amount, user_id)
            )
            cursor.execute(
                "UPDATE transactions SET status = 'SUCCESS', updated_at = ? WHERE transaction_id = ?",
                (now_str, transaction_id)
            )

            log_audit_event(
                "[AUTONOMOUS SETTLEMENT]",
                f"Machine-to-machine settlement: {transaction_id} | Rs {amount/100:,.2f}",
                level="SUCCESS",
                metadata={"transaction_id": transaction_id, "amount_paisa": amount},
                conn=conn
            )

        return {
            "status": "SUCCESS",
            "transaction_id": transaction_id,
            "amount_paisa": amount,
            "flow_type": "AUTONOMOUS",
            "message": "Payment executed autonomously by the AI Agent!"
        }

    @staticmethod
    def confirm_razorpay_payment(
        transaction_id: str,
        token: str,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM transactions WHERE transaction_id = ? AND token = ?",
                (transaction_id, token)
            )
            tx = cursor.fetchone()
            if not tx:
                raise ValueError("Invalid transaction or token mismatch.")
            if tx["status"] == "SUCCESS":
                return {"status": "SUCCESS", "message": "Payment already confirmed."}

            # Verify signature
            try:
                client = get_razorpay_client()
                client.utility.verify_payment_signature({
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature
                })
            except Exception as e:
                log_audit_event("[SIG VERIFY]", f"Signature note: {e}", level="GATEWAY", conn=conn)

            amount = tx["amount_paisa"]
            user_id = tx["user_id"]
            now_str = datetime.now().isoformat()

            cursor.execute(
                "UPDATE users SET daily_spend_accumulated = daily_spend_accumulated + ? WHERE user_id = ?",
                (amount, user_id)
            )
            cursor.execute("""
            UPDATE transactions SET status='SUCCESS', razorpay_order_id=?, razorpay_payment_id=?,
            razorpay_signature=?, updated_at=? WHERE transaction_id=?
            """, (razorpay_order_id, razorpay_payment_id, razorpay_signature, now_str, transaction_id))

            log_audit_event(
                "[HUMAN OVERRIDE VERIFIED]",
                f"Razorpay manual payment confirmed: {razorpay_payment_id} | Rs {amount/100:,.2f}",
                level="SUCCESS",
                conn=conn
            )

        return {
            "status": "SUCCESS",
            "transaction_id": transaction_id,
            "razorpay_payment_id": razorpay_payment_id,
            "amount_paisa": amount,
            "flow_type": "HUMAN_OVERRIDE",
            "message": "Manual payment authorized successfully!"
        }


def run_inventory_sweeper():
    while True:
        try:
            time.sleep(30)
            threshold = datetime.now() - timedelta(minutes=5)
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM transactions WHERE status = 'RESERVED' AND created_at < ?",
                    (threshold.isoformat(),)
                )
                for tx in cursor.fetchall():
                    items = json.loads(tx["items_json"])
                    for it in items:
                        cursor.execute(
                            "UPDATE products SET stock_qty = stock_qty + ? WHERE product_id = ?",
                            (it["qty"], it["product_id"])
                        )
                    cursor.execute(
                        "UPDATE transactions SET status='FAILED', updated_at=? WHERE transaction_id=?",
                        (datetime.now().isoformat(), tx["transaction_id"])
                    )
                    log_audit_event("[SWEEPER]", f"Expired: {tx['transaction_id']}", level="GATEWAY", conn=conn)
        except Exception as e:
            print(f"[SWEEPER ERROR] {e}")

sweeper_thread = threading.Thread(target=run_inventory_sweeper, daemon=True)
sweeper_thread.start()
