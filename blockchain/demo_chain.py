# blockchain/demo_chain.py
from chain import Chain
from anchor import Anchor

# ✅ Your real-world steps
steps = [
    (
        "order_extraction",
        {
            "buyer_email": "girishdigge@gmail.com",
            "model": "Harrier",
            "quantity": 3,
            "delivery_location": "Tokyo",
        },
    ),
    (
        "validation",
        {
            "valid": True,
            "missing_fields": [],
            "invalid_fields": [],
            "message": "Validation passed",
            "buyer_email": "girishdigge@gmail.com",
            "model": "Harrier",
            "quantity": 3,
            "delivery_location": "Tokyo",
        },
    ),
    ("inventory_check", {"inventory_check": "✅ 3x Harrier available in stock."}),
    ("pricing", {"pricing": {"unit_price": 25000, "total": 75000}}),
    (
        "supplier_quotes",
        {
            "suppliers": [
                {"name": "AutoMakers Ltd", "unit_price": 20000, "total_price": 60000},
                {"name": "GlobalCars Inc", "unit_price": 20500, "total_price": 61500},
            ]
        },
    ),
    (
        "logistics",
        {"carrier": "DHL", "mode": "Road", "ETA_days": 13, "shipping_cost": 61440},
    ),
    (
        "finance",
        {
            "finance": {
                "base_cost": 136440,
                "tax": 9550.80,
                "total_payable": 145990.80,
            }
        },
    ),
    ("confirmation", {"confirmation": "yes"}),
    (
        "final_order",
        {
            "order_id": "ORD-HAR-3-TOK-GIRISH",
            "payment_link": "https://checkout.stripe.com/c/pay/...",
        },
    ),
]


def main():
    print("🚀 Starting PortiaAI Blockchain Demo...\n")

    chain = Chain()

    # Add each step as an Anchor -> Block
    for step_name, data in steps:
        anchor = Anchor(step_name=step_name, data=data)
        chain.add_block(anchor)

    # Print the blockchain
    print("✅ Current Blockchain:\n")
    for block in chain.chain:
        print(f"Block {block.index}:")
        print(f"  Step       : {block.anchor['step_name']}")
        print(f"  Data       : {block.anchor['data']}")
        print(f"  Prev Hash  : {block.previous_hash}")
        print(f"  Hash       : {block.hash}\n")

    # Validate chain
    print("⛓️ Blockchain valid?", "✅ Yes" if chain.is_valid() else "❌ No")


if __name__ == "__main__":
    main()
