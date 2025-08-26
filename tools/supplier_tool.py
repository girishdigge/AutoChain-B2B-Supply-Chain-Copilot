from typing import Type, List, Dict, Optional
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext

# Supplier catalog with tiered pricing
SUPPLIERS: Dict[str, List[dict]] = {
    "Lamborghini Aventador": [
        {
            "name": "Luxury Motors Inc.",
            "moq": 1,
            "lead_time_weeks": 12,
            "pricing_tiers": [(1, 450000), (2, 440000)],
        }
    ],
    "Rolls-Royce Ghost": [
        {
            "name": "Elite Autos Co.",
            "moq": 1,
            "lead_time_weeks": 16,
            "pricing_tiers": [(1, 380000), (2, 375000)],
        }
    ],
    "Ferrari SF90 Stradale": [
        {
            "name": "Speedster Global Ltd.",
            "moq": 1,
            "lead_time_weeks": 14,
            "pricing_tiers": [(1, 510000)],
        },
        {
            "name": "Exotic Car House",
            "moq": 1,
            "lead_time_weeks": 15,
            "pricing_tiers": [(1, 515000)],
        },
    ],
    "Aston Martin DB12": [
        {
            "name": "British Automotive Partners",
            "moq": 1,
            "lead_time_weeks": 10,
            "pricing_tiers": [(1, 245000)],
        }
    ],
    "Mercedes-Maybach S680": [
        {
            "name": "German Automotive Group",
            "moq": 1,
            "lead_time_weeks": 8,
            "pricing_tiers": [(1, 230000), (2, 225000)],
        }
    ],
}


class SupplierInput(BaseModel):
    model: str = Field(..., description="Car model requested")
    quantity: int = Field(..., description="Quantity requested")
    urgency: Optional[str] = Field(
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
        self,
        context: ToolRunContext,
        model: str,
        quantity: int,
        urgency: Optional[str] = "normal",
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
