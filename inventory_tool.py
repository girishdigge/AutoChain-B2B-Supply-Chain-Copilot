from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext


INVENTORY = {
    "Harrier": 5,
    "Safari": 2,
    "GLA": 0,
    "GLC": 3,
    "C-Class": 10,
}


class InventoryInput(BaseModel):
    model: str = Field(..., description="Car model requested")
    quantity: int = Field(..., description="Quantity requested")


class InventoryTool(Tool[str]):
    id: str = "inventory_tool"
    name: str = "Inventory Check Tool"
    description: str = "Checks inventory availability for requested models."
    args_schema: Type[BaseModel] = InventoryInput
    output_schema: tuple[str, str] = ("string", "Inventory validation result")

    def run(self, context: ToolRunContext, model: str, quantity: int) -> str:
        available = INVENTORY.get(model, 0)

        if available == 0:
            alternatives = [m for m, q in INVENTORY.items() if q > 0]
            return (
                f"❌ {model} is out of stock.\n"
                f"👉 Available alternatives: {', '.join(alternatives)}"
            )

        if quantity > available:
            return (
                f"❌ Only {available}x {model} available. "
                f"Would you like to order {available} instead?"
            )

        return f"✅ {quantity}x {model} available in stock."
