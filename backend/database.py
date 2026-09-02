"""
Database initialization and SQLite connection management for Razorpay Agentic Commerce Portal.
Configured with SQLite WAL mode, foreign keys, absolute directory paths, and conversation memory.
"""
import os
import sqlite3
import json
from datetime import datetime
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "agentic_commerce.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def log_audit_event(tag: str, message: str, level: str = "INFO", metadata: dict = None, conn=None):
    try:
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        meta_json = json.dumps(metadata or {}, ensure_ascii=False)
        if conn is not None:
            conn.execute(
                """
                INSERT INTO audit_logs (timestamp, level, tag, message, metadata_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (timestamp_str, level, tag, message, meta_json)
            )
        else:
            with get_db() as local_conn:
                local_conn.execute(
                    """
                    INSERT INTO audit_logs (timestamp, level, tag, message, metadata_json)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (timestamp_str, level, tag, message, meta_json)
                )
    except Exception as e:
        print(f"[AUDIT LOG ERROR] Failed to log audit event: {e}")

def init_db(force_reseed: bool = False):
    with get_db() as conn:
        cursor = conn.cursor()

        # Create Users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            daily_spend_limit INTEGER NOT NULL DEFAULT 5000000,
            daily_spend_accumulated INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)

        # Create Products table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            product_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            price_paisa INTEGER NOT NULL,
            stock_qty INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            badge TEXT,
            keywords TEXT NOT NULL
        );
        """)

        # Create Transactions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            amount_paisa INTEGER NOT NULL,
            status TEXT NOT NULL,
            flow_type TEXT NOT NULL,
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            razorpay_signature TEXT,
            items_json TEXT NOT NULL,
            discount_code TEXT,
            discount_paisa INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );
        """)

        # Create Audit Logs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            level TEXT NOT NULL,
            tag TEXT NOT NULL,
            message TEXT NOT NULL,
            metadata_json TEXT
        );
        """)

        # Create Conversation Memory table (per-user chat history)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversation_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """)

        # Check if users already seeded
        cursor.execute("SELECT COUNT(*) as count FROM users;")
        user_count = cursor.fetchone()["count"]

        if user_count == 0 or force_reseed:
            if force_reseed:
                cursor.execute("DELETE FROM transactions;")
                cursor.execute("DELETE FROM audit_logs;")
                cursor.execute("DELETE FROM products;")
                cursor.execute("DELETE FROM users;")
                cursor.execute("DELETE FROM conversation_memory;")

            # Seed primary test user
            cursor.execute("""
            INSERT INTO users (user_id, name, daily_spend_limit, daily_spend_accumulated, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, ("user_01", "Sri Krishna", 5000000, 0, datetime.now().isoformat()))

            # Seed 15 products across diverse categories
            products_seed = [
                (
                    "prod_omega_chronometer",
                    "Omega Seamaster Aqua Terra Chronometer",
                    "Watches",
                    "Master Chronometer certified luxury timepiece with METAS-certified movement, anti-magnetic technology, and brushed steel bracelet. Water-resistant to 150m. The ultimate precision instrument for the discerning connoisseur.",
                    4500000,  # Rs 45,000
                    5,
                    "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600",
                    "AUTONOMOUS READY",
                    "omega, watch, luxury, chronometer, seamaster, timepiece, aqua terra, automatic"
                ),
                (
                    "prod_rolex_explorer",
                    "Rolex Explorer II Stainless Steel",
                    "Watches",
                    "Iconic adventurer's watch with 42mm Oystersteel case, white lacquer dial, orange 24-hour hand, and Oyster bracelet. GMT function for dual time zones. Built for the most demanding environments.",
                    8500000,  # Rs 85,000
                    3,
                    "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&q=80&w=600",
                    "LUXURY ICON",
                    "rolex, watch, explorer, gmt, stainless, luxury, automatic"
                ),
                (
                    "prod_casio_gshock",
                    "Casio G-Shock Mudmaster GWG-2000",
                    "Watches",
                    "Triple sensor tough solar watch with carbon core guard structure, mud resistance, and world time for 29 time zones. Built for extreme outdoor adventures.",
                    3200000,  # Rs 32,000
                    8,
                    "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80&w=600",
                    "RUGGED",
                    "casio, gshock, watch, solar, adventure, outdoor, tough"
                ),
                (
                    "prod_keychron_keyboard",
                    "Keychron K2 Wireless Mechanical Keyboard",
                    "Electronics",
                    "75% compact wireless mechanical keyboard with Gateron G Pro Brown switches and vivid RGB backlight. Compatible with Mac and Windows. Aluminum frame, hot-swappable switches, 72-hour battery life.",
                    750000,  # Rs 7,500
                    3,
                    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600",
                    "LIMITED EDITION",
                    "keychron, keyboard, mechanical, wireless, rgb, typing, desktop"
                ),
                (
                    "prod_logitech_mouse",
                    "Logitech MX Master 3S Wireless Mouse",
                    "Electronics",
                    "Advanced ergonomic wireless mouse with 8K DPI sensor, quiet clicks, MagSpeed scroll wheel, and multi-device connectivity. Works on any surface including glass. 70-day battery life.",
                    850000,  # Rs 8,500
                    10,
                    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=600",
                    "BESTSELLER",
                    "logitech, mouse, wireless, mx master, ergonomic, bluetooth, productivity"
                ),
                (
                    "prod_sony_headphones",
                    "Sony WH-1000XM5 Wireless Headphones",
                    "Audio",
                    "Industry-leading noise cancellation with 30-hour battery, multipoint connection for 2 devices, and exceptional audio clarity. Lightweight foldable design with plush ear cushions. Perfect for travel and focus.",
                    2990000,  # Rs 29,900
                    6,
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
                    "TOP RATED",
                    "sony, headphones, wireless, noise cancelling, anc, audio, music, xm5"
                ),
                (
                    "prod_airpods_pro",
                    "Apple AirPods Pro 2nd Generation",
                    "Audio",
                    "Active Noise Cancellation with Transparency mode, Adaptive Audio, and Personalized Spatial Audio. USB-C charging case with 30+ hours total battery. H2 chip for superior audio performance.",
                    2490000,  # Rs 24,900
                    9,
                    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&q=80&w=600",
                    "APPLE EXCLUSIVE",
                    "apple, airpods, pro, wireless, earbuds, anc, audio, iphone"
                ),
                (
                    "prod_dell_laptop",
                    "Dell XPS 15 OLED Workstation",
                    "Laptops",
                    "15.6 inch InfinityEdge OLED display with 100% DCI-P3, Intel Core i9 13th Gen, 32GB DDR5, 1TB NVMe SSD, NVIDIA RTX 4070. Premium CNC aluminum chassis. The ultimate creator's workstation.",
                    14500000,  # Rs 1,45,000
                    4,
                    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&q=80&w=600",
                    "PRO CREATOR",
                    "dell, xps, laptop, workstation, oled, i9, rtx, creator"
                ),
                (
                    "prod_macbook_pro",
                    "Apple MacBook Pro 14-inch M3 Pro",
                    "Laptops",
                    "Apple M3 Pro chip with 11-core CPU and 14-core GPU. 18GB unified memory, 512GB SSD, Liquid Retina XDR display with ProMotion. Up to 18 hours battery. The most powerful MacBook ever.",
                    19900000,  # Rs 1,99,000
                    3,
                    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
                    "APPLE M3",
                    "apple, macbook, pro, m3, laptop, silicon, retina, creator"
                ),
                (
                    "prod_leather_wallet",
                    "Bellroy Note Sleeve Premium Wallet",
                    "Accessories",
                    "Slim leather wallet crafted from premium vegetable-tanned leather. Holds 4-8 cards, banknotes, and has quick-access pocket. RFID protection built-in. Comes with a lifetime warranty.",
                    350000,  # Rs 3,500
                    20,
                    "https://images.unsplash.com/photo-1627124118123-8cf0b4bf7dbf?auto=format&fit=crop&q=80&w=600",
                    "HANDCRAFTED",
                    "wallet, leather, slim, bellroy, rfid, cards, premium"
                ),
                (
                    "prod_watch_strap",
                    "Hirsch Camelgrain Leather Watch Strap",
                    "Accessories",
                    "Genuine Italian camel grain leather strap with antique look and soft leather lining. Available in 20mm and 22mm. Quick-release spring bars for tool-free swapping. Pairs beautifully with dress watches.",
                    120000,  # Rs 1,200
                    25,
                    "https://images.unsplash.com/photo-1548171916-c8fd5d36b75a?auto=format&fit=crop&q=80&w=600",
                    "UPSELL PICK",
                    "strap, leather, watch, band, hirsch, camel, accessory"
                ),
                (
                    "prod_samsung_monitor",
                    "Samsung 27-inch QHD IPS Monitor",
                    "Electronics",
                    "27-inch 2560x1440 QHD IPS panel with 165Hz refresh rate, 1ms response time, AMD FreeSync Premium. HDR400 support, ultra-thin bezel design. Perfect for gaming and creative work.",
                    2490000,  # Rs 24,900
                    7,
                    "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&q=80&w=600",
                    "HIGH REFRESH",
                    "samsung, monitor, qhd, 165hz, ips, display, gaming, desktop"
                ),
                (
                    "prod_ipad_pro",
                    "Apple iPad Pro 12.9-inch M2",
                    "Tablets",
                    "12.9-inch Liquid Retina XDR display with ProMotion, Apple M2 chip, Thunderbolt port, 5G connectivity, and Face ID. Transforms into a pro laptop with Magic Keyboard. Ultimate creativity tablet.",
                    10990000,  # Rs 1,09,900
                    5,
                    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600",
                    "PRO TABLET",
                    "apple, ipad, pro, m2, tablet, retina, 5g, creativity"
                ),
                (
                    "prod_gaming_chair",
                    "Secretlab TITAN Evo Gaming Chair",
                    "Furniture",
                    "Premium gaming chair with multi-tilt mechanism, 4-way L-ADAPT lumbar support, magnetic memory foam head pillow, and NEO hybrid leatherette. Cold-cure foam for lasting comfort during long sessions.",
                    4500000,  # Rs 45,000
                    4,
                    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=600",
                    "ERGONOMIC PRO",
                    "secretlab, gaming, chair, ergonomic, titan, lumbar, comfort"
                ),
                (
                    "prod_mechanical_keyboard_out",
                    "ASUS ROG Claymore II Mechanical Keyboard",
                    "Electronics",
                    "Full-size wireless mechanical keyboard with ROG RX Blue optical switches, detachable numpad, per-key RGB, and 100-hour battery. Aluminum top plate, tri-mode connectivity. (Currently out of stock)",
                    1290000,  # Rs 12,900
                    0,        # Out of stock for testing
                    "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=600",
                    "OUT OF STOCK",
                    "asus, rog, keyboard, mechanical, gaming, wireless, rgb"
                ),
            ]

            cursor.executemany("""
            INSERT INTO products (product_id, name, category, description, price_paisa, stock_qty, image_url, badge, keywords)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, products_seed)

            log_audit_event(
                "[SYSTEM INIT]",
                f"Database initialized with WAL mode, seeded user_01 (Daily Limit Rs 50,000) and {len(products_seed)} curated catalog items.",
                level="INFO",
                metadata={"user_id": "user_01", "products_count": len(products_seed)},
                conn=conn
            )

if __name__ == "__main__":
    init_db(force_reseed=True)
    print("Database successfully initialized at:", DB_PATH)
