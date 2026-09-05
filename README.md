# 🛍️ Agentic Commerce Portal
### *Autonomous Conversational Commerce & Machine-to-Machine Agent Settlement*
*(Payments processed securely via Razorpay)*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment_Gateway-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF)](https://razorpay.com)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75C2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![SQLite](https://img.shields.io/badge/SQLite3-WAL_Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

---

## 🌟 Overview

The **Agentic Commerce Portal** is an autonomous full-stack e-commerce platform that combines a modern storefront with a **Multi-Agent Conversational Settlement Protocol**. Razorpay is integrated strictly as the underlying payment gateway for handling secure checkout and signature verification.

Traditional e-commerce chatbots typically act as basic question-answering assistants that provide hyperlinks, requiring customers to manually navigate carts, apply discount codes, and complete checkout. The **Agentic Commerce Portal** transforms this workflow into an autonomous, agent-driven shopping experience:

1. **Buyer Agent (Shopping Concierge):** Parses user intent in natural language, searches the product catalog semantically, maintains multi-turn conversation memory, and returns interactive product cards directly inside chat bubbles.
2. **Seller Agent (Merchant Representative):** Monitors active cart updates, computes dynamic contextual upsell recommendations, and applies bundle discounts (e.g., `WATCHBUNDLE`, `DESKSETUP`).
3. **Deterministic Safety Boundary:** Strictly isolates probabilistic AI reasoning from direct write permissions to databases and payment endpoints.
4. **Autonomous In-Chat Settlement vs. Escalation:**
   - **Under-Limit Orders:** Cart totals within the customer's pre-approved daily spend limit execute autonomously in-chat using a single-use cryptographic token in under 800ms.
   - **Over-Limit Orders:** High-value transactions gracefully escalate to Razorpay's official checkout window for human authorization and cryptographic HMAC-SHA256 signature verification.

---

## 🏛️ High-Level System Architecture (HLD)

The architecture strictly separates probabilistic AI inference from deterministic transaction processing:

```mermaid
graph TB
    subgraph ClientLayer["🖥️ Presentation Layer (React 18 + Vite + TailwindCSS)"]
        UI_Store["🏪 Storefront Catalog<br/>(Product Grid, Category Filters, Search)"]
        UI_Chat["💬 AI Concierge Drawer<br/>(Inline Interactive Product Cards)"]
        UI_Cart["🛒 Live Cart Drawer<br/>(Dynamic Discounts & Upsell Banners)"]
        UI_Audit["📜 Live Audit Trail<br/>(Real-Time SSE Event Log)"]
        UI_Console["⚙️ Merchant Dev Console<br/>(Spend Ceiling, Model Status, DB Reset)"]
    end

    subgraph APILayer["⚡ API Gateway (FastAPI Python 3.11)"]
        Router["FastAPI Router<br/>CORS / Dependency Injection"]
        Endpoint_Chat["/api/chat"]
        Endpoint_Catalog["/api/catalog"]
        Endpoint_Upsell["/api/upsell"]
        Endpoint_Checkout["/api/checkout/*"]
        Endpoint_Audit["/api/audit-trail"]
        Endpoint_Config["/api/config"]
    end

    subgraph AILayer["🤖 Multi-Agent Intelligence Layer"]
        Buyer["Buyer Agent<br/>(Intent Extraction & Context Memory)"]
        Seller["Seller Agent<br/>(Catalog Query & Upsell Engine)"]
        Gemini["Google Gemini 2.5 Flash API<br/>(Fallback to Deterministic Mock Engine)"]
    end

    subgraph SafetyLayer["🛡️ Deterministic Safety Boundary (Python Controller)"]
        Validator["Mathematical Validator<br/>(Paisa Arithmetic, Discounts & Quantity)"]
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

    subgraph PaymentGateway["💳 External Payment Network"]
        RazorpayAPI["Razorpay Payment Gateway<br/>(Order Creation & Signature Verification)"]
    end

    ClientLayer --> Router
    Router --> Endpoint_Chat
    Router --> Endpoint_Catalog
    Router --> Endpoint_Upsell
    Router --> Endpoint_Checkout
    Router --> Endpoint_Audit
    Router --> Endpoint_Config

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

In financial systems, probabilistic Large Language Models (LLMs) must **never** have direct write access to database tables or directly invoke payment gateways.

The **Agentic Commerce Portal** enforces a rigid **Deterministic Safety Boundary**:

```mermaid
flowchart LR
    subgraph Probabilistic["❌ Probabilistic AI Domain (Read-Only)"]
        UserMsg["User Message"] --> LLM["Gemini 2.5 Flash"]
        LLM --> Proposal["Structured Proposal Payload<br/>(Intent, Proposed IDs, Quantities)"]
    end

    subgraph Boundary["🛡️ Deterministic Safety Boundary"]
        Proposal --> Gateway["Safety Gateway (Rigid Python Controller)"]
        Gateway --> Rules{"Validation Rules:<br/>1. Exact Price & Stock Verification<br/>2. Active Daily Spend Limit Check<br/>3. Replay Protection & Cryptographic Nonce<br/>4. Thread Mutex Concurrency Lock"}
    end

    subgraph Deterministic["✅ Deterministic System of Record (Write-Safe)"]
        Rules -->|Approved| DBWrite["SQLite WAL Mode Updates<br/>& Payment Settlement"]
        Rules -->|Rejected| Rejection["Safe Error Handling / Rejection"]
    end

    style Probabilistic fill:#ffebee,stroke:#c62828,stroke-width:2px
    style Boundary fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    style Deterministic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

- **Read-Only AI Domain:** AI models only propose actions; they cannot directly commit database modifications or trigger transactions.
- **Integer Paisa Math:** Currency computations use integer `paisa` values to completely eliminate floating-point rounding errors.
- **Concurrency Mutex Locks:** In-memory threading mutexes protect against race conditions, preventing double-checkout and inventory overselling.

---

## 🔄 End-to-End Data Flow Diagram (DFD)

The sequence below illustrates the flow from shopper inquiry through agent processing, safety validation, and settlement:

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

    Shopper->>UI: "Add Omega watch to cart and pay"
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
        Gateway->>DB: Verify daily_spend_limit & daily_spend_accumulated
        Gateway->>Gateway: Generate Cryptographic Nonce Token
        Gateway->>DB: Decrement Stock & Increment Accumulated Spend
        Gateway->>DB: Record Transaction [STATUS: COMPLETED, TYPE: AUTONOMOUS]
        Gateway->>DB: Log Audit Event [TAG: AUTONOMOUS_PAYMENT]
        Gateway-->>ChatAPI: Success (Order ID, Txn ID, Token)
        ChatAPI-->>UI: Bot Response + Inline Order Card + Clear Cart
        UI-->>Shopper: Visual Confirmation & Live Audit Toast
    else Cart Total > Spend Ceiling (Human Escalation via Razorpay)
        Buyer->>Gateway: Initiate Escalated Checkout (Over-Limit)
        Gateway->>RZP: client.order.create({ amount, currency: 'INR' })
        RZP-->>Gateway: razorpay_order_id
        Gateway->>DB: Record Transaction [STATUS: PENDING, TYPE: ESCALATED]
        Gateway-->>ChatAPI: Checkout Payload (razorpay_order_id, amount)
        ChatAPI-->>UI: Bot Response + Trigger Razorpay Modal
        UI->>Shopper: Opens Official Razorpay Checkout Modal
        Shopper->>UI: Completes Payment (UPI / Card / NetBanking)
        UI->>ChatAPI: POST /api/checkout/confirm { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        ChatAPI->>Gateway: Verify HMAC-SHA256 Signature using Secret from .env
        Gateway->>DB: Update Transaction [STATUS: SUCCESS] & Decrement Stock
        Gateway-->>UI: Payment Verified Confirmation
    end
```

---

## 🔀 Decision Flow Chart: Autonomous vs. Escalated Checkout

```mermaid
flowchart TD
    Start(["🛒 Shopper Triggers Checkout<br/>(Button or In-Chat 'Pay')"]) --> ValidateCart{"Is Cart Non-Empty &<br/>Items In Stock?"}
    
    ValidateCart -- No --> AbortErr["❌ Return Error:<br/>'Cart is empty or item out of stock'"]
    ValidateCart -- Yes --> CalcTotal["Calculate Total in Paisa<br/>Apply Bundle Discounts (e.g., WATCHBUNDLE)"]
    
    CalcTotal --> FetchUser["Fetch User Spend Limits<br/>daily_spend_limit & daily_spend_accumulated"]
    FetchUser --> LimitCheck{"Cart Total <=<br/>Remaining Daily Spend Limit?"}

    subgraph AutoFlow["⚡ Autonomous In-Chat Settlement (Under-Limit)"]
        LimitCheck -- Yes --> LockMutex["Acquire Concurrency Mutex Lock"]
        LockMutex --> GenToken["Generate Secure One-Time Nonce Token"]
        GenToken --> DeductStock["Decrement Inventory stock_qty in SQLite"]
        DeductStock --> IncSpend["Increment daily_spend_accumulated"]
        IncSpend --> SaveTxn["Insert Transaction (STATUS: COMPLETED, FLOW: AUTONOMOUS)"]
        SaveTxn --> AuditLog["Log Audit Trail: [AUTONOMOUS_SETTLEMENT]"]
        AuditLog --> ReleaseMutex["Release Mutex Lock"]
        ReleaseMutex --> ReturnSuccess["✅ Return Autonomous Success to Chat"]
    end

    subgraph EscFlow["🔐 Escalated Checkout via Razorpay (Over-Limit)"]
        LimitCheck -- No --> AuditEsc["Log Audit Trail: [ESCALATION_TRIGGERED]"]
        AuditEsc --> CallRZP["Call Razorpay Orders API:<br/>client.order.create(amount, 'INR')"]
        CallRZP --> SavePending["Insert Transaction (STATUS: PENDING, FLOW: ESCALATED)"]
        SavePending --> LaunchModal["Launch Razorpay Modal (UPI / Card / NetBanking)"]
        LaunchModal --> UserPaid{"Did Payment<br/>Succeed in Modal?"}
        UserPaid -- No --> TxnFailed["❌ Mark Transaction FAILED"]
        UserPaid -- Yes --> VerifySig["Verify HMAC-SHA256 Signature<br/>(Using Key Secret from backend .env)"]
        VerifySig --> SigValid{"Is Signature<br/>Valid?"}
        SigValid -- No --> TamperAlert["🚨 Security Alert: Signature Mismatch"]
        SigValid -- Yes --> FinalizeOrder["Update Transaction (STATUS: SUCCESS)<br/>Decrement Stock & Increment Spend"]
        FinalizeOrder --> OrderConf["🎉 Display Order Confirmation"]
    end

    style AutoFlow fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
    style EscFlow fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

---

## 🗄️ Database Schema (Entity Relationship Diagram)

Configured with **SQLite Write-Ahead Logging (WAL)** for high-throughput concurrent reads and writes:

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
        TEXT razorpay_order_id "Razorpay order ID for payments"
        TEXT razorpay_payment_id "Captured Razorpay payment ID"
        TEXT razorpay_signature "Cryptographic HMAC signature"
        TEXT items_json "JSON array of purchased items"
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
        TEXT tag "Event tag (e.g. [AUTONOMOUS PAYMENT])"
        TEXT message "Human-readable event summary"
        TEXT metadata_json "Arbitrary payload JSON"
    }

    users ||--o{ transactions : "executes"
```

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🛍️ Modern Storefront** | Product catalog featuring category navigation, search filtering, inventory stock meters, and promotional badges. |
| **💬 AI Shopping Concierge** | Slide-out chatbot drawer with multi-turn conversation memory, semantic product matchmaking, and interactive in-chat product cards. |
| **⚡ Autonomous Settlement** | Transactions within the customer's daily spend limit execute automatically in-chat in under 800ms. |
| **🔐 Razorpay Payment Gateway** | High-value transactions route seamlessly through Razorpay's official checkout modal with backend signature verification. |
| **🎯 Dynamic Upselling** | Seller Agent analyzes cart additions and suggests companion products with bundle discounts (`WATCHBUNDLE`, `DESKSETUP`). |
| **🛡️ Spending Ceilings** | Configurable daily spend limit prevents unauthorized high-value spending with real-time headroom tracking. |
| **📜 Live Visual Audit Trail** | Microsecond-accurate event log recording agent inferences, risk scoring, state changes, and transaction records. |
| **⚙️ Developer Console** | Management modal to inspect system health, adjust spend ceilings, view model connectivity, and re-seed catalog data. |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/catalog` | Retrieve product catalog with optional `?category=` filter. |
| `GET` | `/api/catalog/{product_id}` | Retrieve individual product specifications and inventory status. |
| `GET` | `/api/user` | Retrieve shopper details, daily spend limit, and remaining spend allowance. |
| `POST` | `/api/user/limit` | Update user daily spend limit (`daily_spend_limit`). |
| `POST` | `/api/chat` | Send shopper message to Buyer Agent; returns recommendations and checkout proposals. |
| `POST` | `/api/upsell` | Query Seller Agent for companion recommendations and bundle discount codes. |
| `POST` | `/api/checkout/initiate` | Evaluate cart and route to either autonomous or escalated flow. |
| `POST` | `/api/checkout/autonomous` | Execute autonomous settlement for pre-approved under-limit orders. |
| `POST` | `/api/checkout/confirm` | Cryptographically verify Razorpay payment signature for escalated transactions. |
| `GET` | `/api/orders` | Retrieve order and transaction history for the active user. |
| `GET` | `/api/audit-trail` | Stream or query chronological security and agent audit logs. |
| `GET` | `/api/config` | Retrieve non-sensitive public configuration (public Key ID; secrets never exposed). |
| `POST` | `/api/memory/clear` | Reset multi-turn conversational memory for a user session. |
| `POST` | `/api/reset-db` | Reset database tables and re-seed default catalog data. |

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
The backend runs within a dedicated Python virtual environment.

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

#### Configure Environment Variables (`backend/.env`):
Create or update `backend/.env` (this file is excluded from Git via `.gitignore`):
```ini
# Google Gemini API Key (Optional: system provides an offline mock fallback if empty)
GEMINI_API_KEY=your_gemini_api_key_here

# Razorpay API Credentials (Backend server use only - NEVER exposed on frontend)
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

#### Run Backend Server:
```powershell
uvicorn main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`  
- Interactive Swagger Documentation: `http://localhost:8000/docs`

---

### Step 3: Frontend Setup
In a separate terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install Node packages
npm install

# Start Vite development server
npm run dev
```
- Frontend Application URL: `http://localhost:5173`

---

### Step 4: Run Automated Tests
Execute the backend test suite inside the virtual environment:
```powershell
cd backend
.\venv\Scripts\pytest.exe test_suite.py -v
```

All **10 integration tests** validate:
- Catalog retrieval and inventory stock deduction.
- User spend limit calculations and remaining headroom.
- Autonomous checkout under-limit approval and token generation.
- Escalated checkout over-limit routing to Razorpay.
- Razorpay HMAC-SHA256 signature verification and tamper prevention.
- Multi-turn conversation memory persistence.
- Concurrency write locks and double-spend protection.

---

## 🔒 Security & Credential Protection

1. **Zero Secret Key Exposure:** Payment gateway secret keys (`RAZORPAY_KEY_SECRET`) are strictly maintained on the backend in `backend/.env` and are **never** bundled or transmitted to the frontend browser.
2. **Cryptographic Nonces:** Autonomous transactions utilize single-use tokens (`secrets.token_hex(16)`) to safeguard against replay attacks.
3. **HMAC-SHA256 Signature Verification:** Escalated transactions are validated on the backend using `razorpay.utility.verify_payment_signature` to prevent client-side payment tampering.
4. **Integer Currency Arithmetic:** Financial calculations are performed strictly in `paisa` (integer) to avoid floating-point errors.
5. **Immutable Audit Logs:** State modifications, spending ceiling updates, and transaction events are recorded with millisecond timestamps in the `audit_logs` table.
