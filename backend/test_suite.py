"""
Comprehensive Test Suite for Agentic Commerce Portal Backend.
Validates the Deterministic Safety Gateway, spending limits, and order processing.
"""
import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import init_db, get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_fresh_db():
    init_db(force_reseed=True)

def test_catalog_endpoint():
    response = client.get("/api/catalog")
    assert response.status_code == 200
    products = response.json()
    assert len(products) >= 10
    # Ensure out of stock item is flagged
    out_of_stock_item = next((p for p in products if p["product_id"] == "prod_mechanical_keyboard_out"), None)
    assert out_of_stock_item is not None
    assert out_of_stock_item["in_stock"] is False
    assert out_of_stock_item["stock_qty"] == 0

def test_user_limit_and_spend():
    response = client.get("/api/user?user_id=user_01")
    assert response.status_code == 200
    user = response.json()
    assert user["user_id"] == "user_01"
    assert user["daily_spend_limit"] == 5000000  # ₹50,000
    assert user["daily_spend_accumulated"] == 0

def test_buyer_agent_search_intent():
    payload = {
        "user_id": "user_01",
        "message": "Explain the Omega watch"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Omega" in data["message"] or "Chronometer" in data["message"]
    assert len(data["recommended_products"]) > 0

def test_buyer_agent_laptop_search():
    payload = {
        "user_id": "user_01",
        "message": "I want to buy a laptop"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommended_products"]) > 0
    prod_ids = [p["product_id"] for p in data["recommended_products"]]
    assert "prod_dell_laptop" in prod_ids or "prod_macbook_pro" in prod_ids

def test_seller_agent_upsell_bundle():
    payload = {
        "product_id": "prod_omega_chronometer"
    }
    response = client.post("/api/upsell", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trigger_upsell"] is True
    assert data["discount_code"] == "WATCHBUNDLE"
    assert data["discount_paisa"] == 20000  # ₹200

def test_rule_1_under_limit_autonomous_checkout():
    """
    Test Rule 1: When purchase amount is under the daily limit,
    AI Agent must handle transactions AUTONOMOUSLY.
    """
    # 1. Initiate checkout for leather watch strap (₹1,200 = 120,000 paisa, well under ₹50,000 limit)
    initiate_payload = {
        "user_id": "user_01",
        "items": [
            {"product_id": "prod_watch_strap", "qty": 1, "price_paisa": 120000}
        ]
    }
    init_res = client.post("/api/checkout/initiate", json=initiate_payload)
    assert init_res.status_code == 200
    data = init_res.json()

    assert data["requires_human_override"] is False
    assert data["flow_type"] == "AUTONOMOUS"
    assert data["final_amount_paisa"] == 120000
    assert data["token"].startswith("acp_")

    # 2. Confirm autonomous settlement
    confirm_payload = {
        "transaction_id": data["transaction_id"],
        "token": data["token"]
    }
    confirm_res = client.post("/api/checkout/autonomous", json=confirm_payload)
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "SUCCESS"
    assert confirm_data["flow_type"] == "AUTONOMOUS"

    # 3. Verify user's accumulated spend was incremented
    user_res = client.get("/api/user?user_id=user_01")
    assert user_res.json()["daily_spend_accumulated"] == 120000

def test_rule_2_over_limit_human_escalation():
    """
    Test Rule 2: When purchase amount exceeds daily limit,
    it must ESCALATE to human shopper with Razorpay Order ID.
    """
    # 1. Lower the user limit to ₹1,000 (100,000 paisa)
    client.post("/api/user/limit", json={"user_id": "user_01", "daily_spend_limit": 100000})

    # 2. Attempt to purchase Omega Watch (₹45,000 = 4500000 paisa, which exceeds ₹1,000)
    initiate_payload = {
        "user_id": "user_01",
        "items": [
            {"product_id": "prod_omega_chronometer", "qty": 1, "price_paisa": 4500000}
        ]
    }
    init_res = client.post("/api/checkout/initiate", json=initiate_payload)
    assert init_res.status_code == 200
    data = init_res.json()

    # Must require human override & generate Razorpay Order ID
    assert data["requires_human_override"] is True
    assert data["flow_type"] == "HUMAN_OVERRIDE"
    assert data["razorpay_order_id"] is not None
    assert data["razorpay_key_id"] is not None

def test_out_of_stock_deterministic_safety():
    """
    Attempting to purchase an out-of-stock item must fail deterministically.
    """
    payload = {
        "user_id": "user_01",
        "items": [
            {"product_id": "prod_mechanical_keyboard_out", "qty": 1, "price_paisa": 1290000}
        ]
    }
    res = client.post("/api/checkout/initiate", json=payload)
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]

def test_audit_trail_logging():
    audit_res = client.get("/api/audit-trail?limit=50")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    assert any("[UAP" in log["tag"] or "[AUTONOMOUS" in log["tag"] or "[SYSTEM" in log["tag"] for log in logs)

def test_orders_endpoint():
    orders_res = client.get("/api/orders?user_id=user_01")
    assert orders_res.status_code == 200
    orders = orders_res.json()
    assert isinstance(orders, list)
    # The autonomous checkout from test_rule_1 should be in the orders list
    assert len(orders) >= 1
    first_order = orders[0]
    assert first_order["status"] == "SUCCESS"
    assert "transaction_id" in first_order
    assert len(first_order["items"]) > 0
