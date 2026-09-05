# 💳 Razorpay Agentic Commerce Portal
### *Autonomous Conversational Commerce & Machine-to-Machine Settlement Protocol*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Razorpay](https://img.shields.io/badge/Razorpay-SDK_2.0+-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF)](https://razorpay.com)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75C2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![SQLite](https://img.shields.io/badge/SQLite3-WAL_Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

---

## 🌟 Executive Overview

The **Razorpay Agentic Commerce Portal** is an autonomous e-commerce engine designed for **Track 1 (AI Growth & Agentic Commerce)** of the **Razorpay AI Buildathon**.

Traditional conversational commerce suffers from high friction: chatbots merely recommend links, leaving customers to manually navigate carts, apply discount codes, and pass through multiple checkout screens. The **Agentic Commerce Portal** changes this paradigm by combining a full-featured luxury storefront with an **Autonomous Multi-Agent Settlement Protocol**:

1. **Buyer Agent (Shopping Concierge)** parses shopper intent, searches the catalog semantically, retains multi-turn context memory, and recommends curated products rendered directly as inline interactive cards inside chat bubbles.
2. **Seller Agent (Merchant Representative)** evaluates active carts, generates contextual upsells, and negotiates bundle discounts dynamically (e.g., `WATCHBUNDLE`, `DESKSETUP`).
3. **Deterministic Safety Boundary & Gateway** guarantees financial integrity: probabilistic LLMs are strictly isolated from direct write access to database records and payment APIs.
4. **Autonomous In-Chat Settlement vs. Escalation**: Orders under the customer's pre-approved daily spend limit (inspired by NPCI's Unified Autonomous Payment protocol) execute autonomously inside the chat in under 800ms. High-value orders seamlessly escalate to Razorpay's official checkout modal.

---

## 🏛️ High-Level System Architecture (HLD)

The architecture strictly separates probabilistic AI inference from deterministic transaction processing:

```mermaid
graph TB
    subgraph ClientLayer["🖥️ Presentation Layer (React 18 + Vite + TailwindCSS)"]
        UI_Store["🏪 Luxury Storefront<br/>(Product Grid, Category Filters, Search)"]
        UI_Chat["💬 AI Concierge Drawer<br/>(Inline Interactive Product Cards)"]
        UI_Cart["🛒 Live Cart Drawer<br/>(Dynamic Discounts & Upsell Banners)"]
        UI_Audit["📜 Live Audit Trail<br/>(Real-Time SSE Event Log)"]
        UI_Console["⚙️ Merchant Dev Console<br/>(Spend Ceiling, API Creds, DB Reset)"]
    end

    subgraph APILayer["⚡ API Gateway (FastAPI Python 3.11)"]
        Router["FastAPI Router<br/>CORS / Dependency Injection"]
        Endpoint_Chat["/api/chat"]
        Endpoint_Catalog["/api/catalog"]
        Endpoint_Upsell["/api/upsell"]
        Endpoint_Checkout["/api/checkout/*"]
        Endpoint_Audit["/api/audit-trail"]
    end

    subgraph AILayer["🤖 Multi-Agent Intelligence Layer"]
        Buyer["Buyer Agent<br/>(Intent Extraction & Context Memory)"]
        Seller["Seller Agent<br/>(Catalog Query & Upsell Engine)"]
        Gemini["Google Gemini 2.5 Flash API<br/>(Fallback to Deterministic Mock LLM)"]
    end

    subgraph SafetyLayer["🛡️ Deterministic Safety Boundary (Python Controller)"]
        Validator["Mathematical Validator<br/>(Calculates Paisa, Discounts & Quantity)"]
        LimitChecker["Spend Limit Controller<br/>(Daily Spend vs Pre-Approved Ceiling)"]
        ConcurrencyLock["Write Lock Engine<br/>(threading.Lock - Race Condition Defense)"]
        TokenAuth["One-Time Token Engine<br/>(Cryptographic Nonce & Token Expiry)"]
    end

    subgraph PersistenceLayer["💾 Persistence Layer (SQLite WAL Mode)"]
        DB_Users[("users<br/>(Limits & Spend Accumulator)")]
        DB_Products[("products<br/>(Catalog & Stock Inventory)")]
        DB_Transactions[("transactions<br/>(Orders, Tokens & Signatures)")]
        DB_Memory[("conversation_memory<br/>(Multi-turn Session Context)")]
        DB_Audit[("audit_logs<br/>(Immutable Chronological Event Log)")]
    end

    subgraph ExternalGateway["💳 External Payment Network"]
        RazorpayAPI["Razorpay Payment Gateway<br/>(Orders API & HMAC-SHA256 Verification)"]
    end

    ClientLayer --> Router
    Router --> Endpoint_Chat
    Router --> Endpoint_Catalog
    Router --> Endpoint_Upsell
    Router --> Endpoint_Checkout
    Router --> Endpoint_Audit

    Endpoint_Chat --> Buyer
    Buyer <--> Gemini
    Buyer --> Seller
    Seller --> SafetyLayer

    Endpoint_Checkout --> SafetyLayer
    SafetyLayer --> LimitChecker
    SafetyLayer --> Validator
    SafetyLayer --> ConcurrencyLock
    SafetyLayer --> TokenAuth

    SafetyLayer --> PersistenceLayer
    SafetyLayer --> RazorpayAPI
```

---

## 🛡️ The Deterministic Safety Boundary

In production fintech systems, probabilistic Large Language Models (LLMs) hallucinate and loop. Granting an LLM direct write permissions to databases or payment gateway APIs introduces critical security risks.

Our system enforces the **Deterministic Safety Boundary**:

```mermaid
flowchart LR
    subgraph Probabilistic["❌ Probabilistic AI Domain (Read-Only)"]
        UserMsg["User Message"] --> LLM["Gemini 2.5 Flash"]
        LLM --> Proposal["Structured Proposal Payload<br/>(Intent, Proposed IDs, Quantities)"]
    end

    subgraph Boundary["🛡️ Deterministic Safety Boundary"]
        Proposal --> Gateway["Safety Gateway (Rigid Python Controller)"]
        Gateway --> Rules{"Validation Rules:<br/>1. Math & Price Validation<br/>2. Real Stock Availability<br/>3. Active Spend Limit Balance<br/>4. Concurrency Mutex Lock"}
    end

    subgraph Deterministic["✅ Deterministic System of Record (Write-Safe)"]
        Rules -->|Valid| DBWrite["SQLite WAL Mode Updates<br/>& Razorpay Order Creation"]
        Rules -->|Invalid| Rejection["Reject / Safe Error Recovery"]
    end

    style Probabilistic fill:#ffebee,stroke:#c62828,stroke-width:2px
    style Boundary fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    style Deterministic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

1. **Purely Read-Only AI Layer:** The Buyer and Seller Agents cannot modify database tables, alter user balances, or execute payments directly.
2. **Rigid Math Verification:** The Python Gateway recalculates item prices, line items, and discount coupons in `paisa` using integer arithmetic to prevent floating-point rounding errors.
3. **Atomic Concurrency Locks:** Threading locks prevent race conditions, double-spending, and stock overselling during simultaneous requests.

---

## 🔄 End-to-End Data Flow Diagram (DFD)

The data flow below captures the lifecycle of a conversational request through semantic parsing, cart management, and financial settlement:

```mermaid
sequenceDiagram
    autonumber
    actor Shopper as 👤 Shopper
    participant UI as 🖥️ React Frontend
    participant ChatAPI as ⚡ /api/chat
    participant Buyer as 🤖 Buyer Agent
    participant Gemini as 🧠 Gemini 2.5 Flash
    participant Seller as 🛍️ Seller Agent
    participant Gateway as 🛡️ Safety Gateway
    participant DB as 💾 SQLite DB
    participant RZP as 💳 Razorpay Gateway

    Shopper->>UI: Types "Add Omega watch to cart and pay"
    UI->>ChatAPI: POST /api/chat { user_id, message, cart }
    ChatAPI->>Buyer: process_message(message, cart)
    Buyer->>Gemini: Prompt with Catalog Schema + Conversation Memory
    Gemini-->>Buyer: JSON { intent: "CHECKOUT", product_id: "prod_01" }
    Buyer->>Seller: Inquire Catalog Offer for "prod_01"
    Seller->>DB: Query Product Price & Stock
    DB-->>Seller: Product Details (Price: ₹4,500, Stock: 5)
    Seller-->>Buyer: Offer Payload & Upsell Suggestion

    alt Cart Total <= Pre-Approved Spend Ceiling (Autonomous Settlement)
        Buyer->>Gateway: Request Autonomous Settlement (Under-Limit)
        Gateway->>DB: Check daily_spend_limit & daily_spend_accumulated
        Gateway->>Gateway: Generate Cryptographic Nonce Token
        Gateway->>DB: Decrement Stock & Increment Accumulated Spend
        Gateway->>DB: Record Transaction [STATUS: COMPLETED, TYPE: AUTONOMOUS]
        Gateway->>DB: Log Audit Event [TAG: AUTONOMOUS_PAYMENT]
        Gateway-->>ChatAPI: Success (Order ID, Txn ID, Token)
        ChatAPI-->>UI: Bot Response + Inline Success Card + Cart Clear
        UI-->>Shopper: Visual Confirmation & Live Audit Toast
    else Cart Total > Spend Ceiling (Human Escalation)
        Buyer->>Gateway: Initiate Escalated Checkout (Over-Limit)
        Gateway->>RZP: client.order.create({ amount, currency: 'INR' })
        RZP-->>Gateway: razorpay_order_id
        Gateway->>DB: Record Transaction [STATUS: PENDING, TYPE: ESCALATED]
        Gateway-->>ChatAPI: Checkout Payload (razorpay_order_id, amount)
        ChatAPI-->>UI: Bot Response + Trigger Razorpay Modal
        UI->>Shopper: Opens Razorpay Official Modal
        Shopper->>UI: Completes Payment (UPI / Card / NetBanking)
        UI->>ChatAPI: POST /api/checkout/confirm { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        ChatAPI->>Gateway: Verify HMAC-SHA256 Signature
        Gateway->>DB: Update Transaction [STATUS: SUCCESS] & Decrement Stock
        Gateway-->>UI: Payment Verified
    end
```

---

## 🔀 Decision Flow Chart: Autonomous vs. Escalated Checkout

The core transactional logic governing the **Deterministic Safety Boundary**:

```mermaid
flowchart TD
    Start(["🛒 Shopper Triggers Checkout<br/>(Button or Conversational 'Pay')"]) --> ValidateCart{"Is Cart Non-Empty &<br/>Items In Stock?"}
    
    ValidateCart -- No --> AbortErr["❌ Return Error:<br/>'Cart is empty or item out of stock'"]
    ValidateCart -- Yes --> CalcTotal["Calculate Total Paisa<br/>Apply Bundle Discounts (e.g., WATCHBUNDLE)"]
    
    CalcTotal --> FetchUser["Fetch User Spend Limits<br/>daily_spend_limit & daily_spend_accumulated"]
    FetchUser --> LimitCheck{"Cart Total <=<br/>Remaining Spend Limit?"}

    subgraph AutoFlow["⚡ Autonomous In-Chat Settlement (Under-Limit)"]
        LimitCheck -- Yes --> LockMutex["Acquire Concurrency Mutex Lock"]
        LockMutex --> GenToken["Generate Secure One-Time Nonce Token"]
        GenToken --> DeductStock["Decrement Inventory stock_qty in SQLite"]
        DeductStock --> IncSpend["Increment daily_spend_accumulated"]
        IncSpend --> SaveTxn["Insert Transaction (STATUS: COMPLETED, FLOW: AUTONOMOUS)"]
        SaveTxn --> AuditLog["Log Audit Trail: [AUTONOMOUS_SETTLEMENT]"]
        AuditLog --> ReleaseMutex["Release Mutex Lock"]
        ReleaseMutex --> ReturnSuccess["✅ Return Autonomous Success Payload to Chat"]
    end

    subgraph EscFlow["🔐 Escalated Gateway Checkout (Over-Limit)"]
        LimitCheck -- No --> AuditEsc["Log Audit Trail: [ESCALATION_TRIGGERED]"]
        AuditEsc --> CallRZP["Call Razorpay Orders API:<br/>client.order.create(amount, 'INR')"]
        CallRZP --> SavePending["Insert Transaction (STATUS: PENDING, FLOW: ESCALATED)"]
        SavePending --> LaunchModal["Launch Razorpay Payment Modal (UPI / Card / NetBanking)"]
        LaunchModal --> UserPaid{"Did Payment<br/>Succeed in Modal?"}
        UserPaid -- No --> TxnFailed["❌ Mark Transaction FAILED<br/>Restore Pending Stock"]
        UserPaid -- Yes --> VerifySig["Verify Razorpay HMAC-SHA256 Signature"]
        VerifySig --> SigValid{"Is Signature<br/>Valid?"}
        SigValid -- No --> TamperAlert["🚨 Security Alert: Signature Mismatch"]
        SigValid -- Yes --> FinalizeOrder["Update Transaction (STATUS: SUCCESS)<br/>Decrement Stock & Increment Spend"]
        FinalizeOrder --> OrderConf["🎉 Display Order Confirmation Screen"]
    end

    style AutoFlow fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
    style EscFlow fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

---

## 🗄️ Database Architecture (Entity Relationship Diagram)

Configured in **SQLite Write-Ahead Logging (WAL)** mode for high-concurrency non-blocking reads during writes:

```mermaid
erDiagram
    users {
        TEXT user_id PK "Unique user identifier (e.g. user_01)"
        TEXT name "Shopper full name"
        INTEGER daily_spend_limit "Pre-approved daily limit in paisa (e.g. 5000000 = ₹50,000)"
        INTEGER daily_spend_accumulated "Spent today in paisa"
        TEXT created_at "ISO-8601 creation timestamp"
    }

    products {
        TEXT product_id PK "Unique product identifier (e.g. prod_01)"
        TEXT name "Product title"
        TEXT category "Category (Electronics, Luxury, Footwear, etc.)"
        TEXT description "Detailed marketing copy"
        INTEGER price_paisa "Price in paisa (e.g. 450000 = ₹4,500)"
        INTEGER stock_qty "Available inventory quantity"
        TEXT image_url "Relative image path"
        TEXT badge "Card badge (Best Seller, Premium, etc.)"
        TEXT keywords "Comma-separated search keywords"
    }

    transactions {
        TEXT transaction_id PK "UUID transaction identifier"
        TEXT user_id FK "References users(user_id)"
        TEXT token UK "Cryptographic one-time nonce"
        INTEGER amount_paisa "Total paid in paisa"
        TEXT status "COMPLETED | SUCCESS | PENDING | FAILED"
        TEXT flow_type "AUTONOMOUS | ESCALATED"
        TEXT razorpay_order_id "Official Razorpay order ID"
        TEXT razorpay_payment_id "Payment ID from Razorpay capture"
        TEXT razorpay_signature "HMAC-SHA256 signature string"
        TEXT items_json "JSON array of cart items"
        TEXT discount_code "Applied bundle discount code"
        INTEGER discount_paisa "Discount amount in paisa"
        TEXT created_at "ISO-8601 creation timestamp"
        TEXT updated_at "ISO-8601 update timestamp"
    }

    conversation_memory {
        INTEGER id PK "Auto-incrementing turn ID"
        TEXT user_id "Identifier for shopper session"
        TEXT role "user | model"
        TEXT content "Message text + displayed product context"
        TEXT created_at "ISO-8601 timestamp"
    }

    audit_logs {
        INTEGER id PK "Auto-incrementing log ID"
        TEXT timestamp "YYYY-MM-DD HH:MM:SS.mmm"
        TEXT level "INFO | GATEWAY | SECURITY | WARN | ERROR"
        TEXT tag "Event tag (e.g. [UAP AUTONOMOUS PAYMENT])"
        TEXT message "Human-readable event summary"
        TEXT metadata_json "Arbitrary payload JSON"
    }

    users ||--o{ transactions : "executes"
```

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🛍️ Luxury Amazon-Style Storefront** | Polished responsive catalog featuring product sliders, category tabs, badges, stock counters, and real-time query search. |
| **💬 AI Shopping Concierge** | Slide-out chatbot drawer featuring multi-turn conversation memory, semantic product matchmaking, and interactive in-chat product cards with instant "Add to Cart" actions. |
| **⚡ Autonomous In-Chat Settlement** | Under-limit purchases execute automatically in under 800ms upon conversational intent (e.g., *"buy this"*, *"make payment"*). |
| **🔐 Razorpay Escalated Checkout** | High-value transactions automatically trigger Razorpay's checkout modal with full HMAC-SHA256 webhook/signature validation. |
| **🎯 Dynamic Multi-Agent Upselling** | Seller Agent intercepts cart modifications and pitches personalized companion items with bundle discount codes (`WATCHBUNDLE`, `DESKSETUP`). |
| **🛡️ NPCI UAP Spend Ceilings** | Configurable daily spend limit (`daily_spend_limit`) prevents unauthorized bulk spending. Real-time balance meters display available headroom. |
| **📜 Live Visual Audit Trail** | Millisecond-accurate event log tracking agent decisions, risk scoring, state changes, and transaction hashes. |
| **⚙️ Developer Control Center** | Interactive modal to adjust spend limits, test offline fallback modes, inspect system health, and re-seed the database. |

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/catalog` | Fetch product catalog with optional `?category=` filter. |
| `GET` | `/api/catalog/{product_id}` | Fetch individual product specifications and stock status. |
| `GET` | `/api/user` | Retrieve user state, daily spend limit, and remaining headroom. |
| `POST` | `/api/user/limit` | Update user daily spend limit (`daily_spend_limit`). |
| `POST` | `/api/chat` | Send shopper message to Buyer Agent; returns recommendations and checkout payloads. |
| `POST` | `/api/upsell` | Query Seller Agent for cross-sell recommendations and bundle discount codes. |
| `POST` | `/api/checkout/initiate` | Evaluate cart and route to either autonomous or escalated flow. |
| `POST` | `/api/checkout/autonomous` | Execute autonomous payment for pre-approved under-limit carts. |
| `POST` | `/api/checkout/confirm` | Verify Razorpay HMAC-SHA256 signature for escalated transactions. |
| `GET` | `/api/orders` | Retrieve order history for the active user. |
| `GET` | `/api/audit-trail` | Stream or query the chronological security and agent audit logs. |
| `POST` | `/api/memory/clear` | Clear multi-turn conversational memory for a user. |
| `POST` | `/api/reset-db` | Reset database tables and re-seed products to default state. |

---

## 🛠️ Installation & Local Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/krishna016agarwal/Agentic_Commerce.git
cd Agentic_Commerce
```

---

### Step 2: Backend Setup
The backend utilizes a dedicated Python virtual environment.

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# Install all backend dependencies
pip install -r requirements.txt
```

#### Configure Environment Variables (`backend/.env`):
Create a `.env` file in the `backend/` directory:
```ini
# Google Gemini API Key (Optional: system provides deterministic mock fallback if empty)
GEMINI_API_KEY=your_gemini_api_key_here

# Razorpay Test Mode Credentials
RAZORPAY_KEY_ID=rzp_test_TWl4eo89k3aLud
RAZORPAY_KEY_SECRET=TnA2AVvCQ5Ys6gdmVHHYLJ72
```

#### Run Backend Server:
```powershell
uvicorn main:app --reload --port 8000
```
Backend API will be live at: `http://localhost:8000`  
Swagger API Docs available at: `http://localhost:8000/docs`

---

### Step 3: Frontend Setup
In a new terminal window:

```powershell
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start Vite Development Server
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

### Step 4: Run Automated Tests
Execute the backend test suite inside the virtual environment:
```powershell
cd backend
.\venv\Scripts\pytest.exe test_suite.py -v
```
All **10 core fintech integration tests** validate:
- Product catalog retrieval and stock validation.
- User spend limit calculations and remaining headroom.
- Autonomous checkout under-limit approval.
- Escalated checkout over-limit routing.
- Razorpay signature verification and tamper detection.
- Multi-turn conversation memory persistence.
- Concurrency write locks and inventory protection.

---

## 🔒 Security & Compliance Safeguards

1. **Zero Key Exposure:** API keys (`GEMINI_API_KEY`, `RAZORPAY_KEY_SECRET`) are strictly maintained on the backend server (`.env`) and never exposed in frontend client bundles.
2. **Cryptographic Nonce Validation:** Autonomous transactions generate single-use cryptographic tokens (`secrets.token_hex(16)`) to prevent replay attacks.
3. **HMAC-SHA256 Signature Verification:** Escalated Razorpay transactions are cryptographically verified using `razorpay.utility.verify_payment_signature`.
4. **Integer Arithmetic:** All currency amounts are calculated strictly in `paisa` (integer) to avoid floating-point inaccuracies.
5. **Immutable Audit Trail:** All state-changing events (limit adjustments, agent proposals, transaction completions, signature failures) are permanently logged with microsecond timestamps in `audit_logs`.

---

## 👥 Contributors & Acknowledgements

- Built for the **Razorpay AI Buildathon — Track 1: AI Growth & Agentic Commerce**.
- Architecture inspired by **NPCI Unified Autonomous Payment (UAP)** and **Agentic Commerce Protocols (ACP)**.
