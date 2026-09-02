"""
Pydantic v2 schemas for all API requests and responses.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CartItem(BaseModel):
    product_id: str
    qty: int = Field(default=1, ge=1)
    price_paisa: int = Field(..., ge=0)
    name: Optional[str] = None
    image_url: Optional[str] = None


class ProductResponse(BaseModel):
    product_id: str
    name: str
    category: str
    description: str
    price_paisa: int
    stock_qty: int
    image_url: str
    badge: Optional[str] = None
    in_stock: bool


class UserResponse(BaseModel):
    user_id: str
    name: str
    daily_spend_limit: int
    daily_spend_accumulated: int
    remaining_limit_paisa: int


class UpdateLimitRequest(BaseModel):
    user_id: str = "user_01"
    daily_spend_limit: int = Field(..., ge=0, description="Spending limit in paisa (e.g. 500000 for ₹5,000)")


class ChatRequest(BaseModel):
    user_id: str = "user_01"
    message: str
    gemini_api_key: Optional[str] = None
    # Cart state passed from frontend so agent can trigger checkout
    cart: Optional[List[CartItem]] = []
    discount_code: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None


class ChatResponse(BaseModel):
    agent_name: str
    message: str
    intent: str = "CHAT"
    checkout_trigger: bool = False
    catalog_offer: Optional[Dict[str, Any]] = None
    recommended_products: List[ProductResponse] = []
    # Populated when checkout_trigger resolves autonomously
    checkout_result: Optional[Dict[str, Any]] = None
    # Cart mutation instructions for the frontend (ADD, REMOVE, CLEAR)
    cart_action: Optional[Dict[str, Any]] = None
    # Legacy field kept for backward compat with existing frontend
    intent_payload: Optional[Dict[str, Any]] = None


class UpsellRequest(BaseModel):
    product_id: str
    gemini_api_key: Optional[str] = None


class UpsellResponse(BaseModel):
    trigger_upsell: bool
    upsell_product: Optional[Dict[str, Any]] = None
    seller_pitch: str
    discount_code: Optional[str] = None
    discount_paisa: int = 0


class CheckoutInitiateRequest(BaseModel):
    user_id: str = "user_01"
    items: List[CartItem]
    discount_code: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None


class CheckoutInitiateResponse(BaseModel):
    transaction_id: str
    token: str
    requires_human_override: bool
    flow_type: str  # "AUTONOMOUS" or "HUMAN_OVERRIDE"
    total_amount_paisa: int
    discount_amount_paisa: int
    final_amount_paisa: int
    daily_limit_paisa: int
    daily_accumulated_paisa: int
    remaining_limit_paisa: int
    razorpay_order_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    currency: str = "INR"
    message: str
    contract_proposal: Dict[str, Any]


class AutonomousConfirmRequest(BaseModel):
    transaction_id: str
    token: str


class CheckoutConfirmRequest(BaseModel):
    transaction_id: str
    token: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    razorpay_key_secret: Optional[str] = None


class AuditLogItem(BaseModel):
    id: int
    timestamp: str
    level: str
    tag: str
    message: str
    metadata_json: Optional[str] = None


class OrderItem(BaseModel):
    """Represents a booked transaction for the My Orders page."""
    transaction_id: str
    user_id: str
    amount_paisa: int
    status: str
    flow_type: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    items_json: str
    discount_code: Optional[str] = None
    discount_paisa: int = 0
    created_at: str
    updated_at: str
