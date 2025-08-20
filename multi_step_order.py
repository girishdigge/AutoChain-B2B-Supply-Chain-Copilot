import asyncio
import json
import os
from dotenv import load_dotenv
from portia import Portia

from clarification_tool import ClarificationTool
from order_tool import OrderTool
from validator_tool import ValidatorTool
from inventory_tool import InventoryTool
from pricing_tool import PricingTool

load_dotenv(override=True)

ORDERS_FILE = "orders.json"
REQUIRED_FIELDS = ["buyer_email", "model", "quantity", "delivery_location"]


def save_order(order_data):
    """Save confirmed order to orders.json"""
    if os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, "r") as f:
            try:
                orders = json.load(f)
            except json.JSONDecodeError:
                orders = []
    else:
        orders = []

    orders.append(order_data)

    with open(ORDERS_FILE, "w") as f:
        json.dump(orders, f, indent=2)

    print(f"\n📝 Order saved to {ORDERS_FILE}")


async def main():
    portia = Portia(
        tools=[
            OrderTool(),
            ClarificationTool(),
            ValidatorTool(),
            InventoryTool(),
            PricingTool(),
        ]
    )

    # Step 1: Get raw user input
    user_request = input("Enter your order request:\n")

    # Step 2: Naive field extraction
    collected_data = {
        "buyer_email": None,
        "model": None,
        "quantity": None,
        "delivery_location": None,
    }

    # crude extraction
    for word in user_request.split():
        if word.isdigit():
            collected_data["quantity"] = int(word)
            break

    if "@" in user_request:
        collected_data["buyer_email"] = user_request.split()[-1]

    # Step 3: Clarify missing fields
    for field in REQUIRED_FIELDS:
        if not collected_data[field]:
            question = f"Please provide {field.replace('_', ' ')}."
            answer = ClarificationTool().run(None, question)
            if field == "quantity":
                collected_data[field] = int(answer)
            else:
                collected_data[field] = answer

    # Step 4: Validate inputs
    print("\n🔍 Validation Result:")
    validation_result = ValidatorTool().run(None, **collected_data)
    print(" ", validation_result)

    # loop until valid
    while "❌" in validation_result:
        if "Invalid email" in validation_result:
            answer = ClarificationTool().run(
                None, "Please provide a valid email address (e.g., abc@example.com)."
            )
            collected_data["buyer_email"] = answer

        if "Unknown model" in validation_result:
            valid_models = ["Harrier", "Safari", "GLA", "GLC", "C-Class"]
            answer = ClarificationTool().run(
                None,
                f"Please provide a valid car model ({', '.join(valid_models)}).",
            )
            collected_data["model"] = answer

        validation_result = ValidatorTool().run(None, **collected_data)
        print("\n🔍 Validation Result:")
        print(" ", validation_result)

    # Step 5: Inventory check
    print("\n📦 Inventory Check:")
    inv_result = InventoryTool().run(
        None, model=collected_data["model"], quantity=collected_data["quantity"]
    )
    print(" ", inv_result)

    # negotiate shortages or alternatives
    while "❌" in inv_result:
        if "out of stock" in inv_result:
            new_model = ClarificationTool().run(
                None,
                "Selected model is out of stock. Please choose an alternative model.",
            )
            collected_data["model"] = new_model
            qty = ClarificationTool().run(None, f"Enter quantity for {new_model}:")
            collected_data["quantity"] = int(qty)
        elif "Only" in inv_result and "available" in inv_result:
            choice = ClarificationTool().run(
                None, f"{inv_result} Do you want to adjust your order? (YES/NO)"
            )
            if choice.lower() == "yes":
                available = int(inv_result.split()[2][:-1])
                collected_data["quantity"] = available
            else:
                print("Order cancelled due to stock limits.")
                return

        inv_result = InventoryTool().run(
            None, model=collected_data["model"], quantity=collected_data["quantity"]
        )
        print(" ", inv_result)

    # Step 6: Pricing
    print("\n💰 Pricing Info:")
    price_result = PricingTool().run(
        None, model=collected_data["model"], quantity=collected_data["quantity"]
    )
    print(" ", price_result)

    # Step 7: Final Confirmation
    confirmation = ClarificationTool().run(
        None,
        f"Do you want to confirm the order: {collected_data['quantity']}x {collected_data['model']} "
        f"for {collected_data['buyer_email']}, delivering to {collected_data['delivery_location']}? (YES/NO)",
    )

    if confirmation.lower() != "yes":
        print("\n❌ Order cancelled by user.")
        return

    # Step 8: Final Order
    print("\n🎉 Final Output:")
    result = OrderTool().run(None, **collected_data)
    print(" ", result)

    # Step 9: Save order
    save_order(collected_data)


if __name__ == "__main__":
    asyncio.run(main())
