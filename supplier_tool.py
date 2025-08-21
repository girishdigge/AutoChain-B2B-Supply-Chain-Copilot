from typing import Type, List, Dict
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext

# Supplier catalog with tiered pricing
SUPPLIERS: Dict[str, List[dict]] = {
    "Harrier": [
        {
            "name": "AutoMakers Ltd",
            "moq": 2,
            "lead_time_weeks": 2,
            "pricing_tiers": [(1, 20000), (5, 19000), (10, 18000)],
        },
        {
            "name": "GlobalCars Inc",
            "moq": 1,
            "lead_time_weeks": 3,
            "pricing_tiers": [(1, 20500), (5, 19500), (10, 18500)],
        },
    ],
    "Safari": [
        {
            "name": "SUV World",
            "moq": 2,
            "lead_time_weeks": 3,
            "pricing_tiers": [(1, 22000), (5, 21000), (10, 20000)],
        }
    ],
    "GLA": [
        {
            "name": "Luxury Imports",
            "moq": 5,
            "lead_time_weeks": 4,
            "pricing_tiers": [(1, 30000), (3, 29000), (10, 28000)],
        }
    ],
}


class SupplierInput(BaseModel):
    model: str = Field(..., description="Car model requested")
    quantity: int = Field(..., description="Quantity requested")
    urgency: str = Field(
        default="normal",
        description="Order urgency: 'normal' or 'urgent' (urgent adds surcharge, shorter lead time)",
    )


class SupplierTool(Tool[Dict]):
    id: str = "supplier_tool"
    name: str = "Supplier Quote Tool"
    description: str = (
        "Fetches supplier quotes (MOQ, lead times, pricing tiers, bulk discounts)."
    )
    args_schema: Type[BaseModel] = SupplierInput
    output_schema: tuple[str, str] = ("json", "Supplier quotes with pricing details")

    def run(
        self, context: ToolRunContext, model: str, quantity: int, urgency: str
    ) -> Dict:
        suppliers = SUPPLIERS.get(model)
        if not suppliers:
            return {"suppliers": []}

        results = {"suppliers": []}
        for supplier in suppliers:
            if quantity < supplier["moq"]:
                continue

            # Determine base unit price from tiered pricing
            unit_price = supplier["pricing_tiers"][0][1]
            for min_qty, price in supplier["pricing_tiers"]:
                if quantity >= min_qty:
                    unit_price = price

            # Apply urgency rules
            lead_time = supplier["lead_time_weeks"]
            if urgency == "urgent":
                lead_time = max(1, lead_time - 1)
                unit_price *= 1.10  # 10% surcharge

            total_price = unit_price * quantity

            results["suppliers"].append(
                {
                    "name": supplier["name"],
                    "moq": supplier["moq"],
                    "lead_time_weeks": lead_time,
                    "unit_price": unit_price,
                    "total_price": total_price,
                }
            )

        return results
