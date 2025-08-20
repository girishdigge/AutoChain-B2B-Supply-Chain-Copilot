from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext

PRICES = {
    "Harrier": 25000,
    "Safari": 28000,
    "GLA": 40000,
    "GLC": 50000,
    "C-Class": 55000,
}


class PricingInput(BaseModel):
    model: str = Field(..., description="Car model name")
    quantity: int = Field(..., description="Number of cars requested")


class PricingTool(Tool[str]):
    id: str = "pricing_tool"
    name: str = "Pricing Calculator"
    description: str = "Calculates total cost for the requested order."
    args_schema: Type[BaseModel] = PricingInput
    output_schema: tuple[str, str] = ("string", "Pricing information")

    def run(self, context: ToolRunContext, model: str, quantity: int) -> str:
        price_per_unit = PRICES.get(model)
        if not price_per_unit:
            return f"❌ Price not available for model {model}"
        total = price_per_unit * quantity
        return (
            f"💰 Price per {model}: ${price_per_unit} | Total for {quantity}: ${total}"
        )
