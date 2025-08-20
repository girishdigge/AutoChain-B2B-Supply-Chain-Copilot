from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext
import re


class ValidatorInput(BaseModel):
    buyer_email: str = Field(..., description="Email of the buyer")
    model: str = Field(..., description="Car model")
    quantity: int = Field(..., description="Quantity of cars")
    delivery_location: str = Field(..., description="Delivery location")


class ValidatorTool(Tool[str]):
    id: str = "validator_tool"
    name: str = "Validator Tool"
    description: str = "Validates collected order details before placing an order."
    args_schema: Type[BaseModel] = ValidatorInput
    output_schema: tuple[str, str] = ("string", "Validation status")

    def run(
        self,
        context: ToolRunContext,
        buyer_email: str,
        model: str,
        quantity: int,
        delivery_location: str,
    ) -> str:
        errors = []

        # Basic email check
        if not re.match(r"[^@]+@[^@]+\.[^@]+", buyer_email):
            errors.append("Invalid email format.")

        # Quantity check
        if quantity <= 0:
            errors.append("Quantity must be greater than zero.")

        # Model check
        valid_models = ["Harrier", "Safari", "GLA", "GLC", "C-Class"]
        if model not in valid_models:
            errors.append(
                f"Unknown model: {model}. Valid options: {', '.join(valid_models)}"
            )

        # Location check
        if not delivery_location.strip():
            errors.append("Delivery location cannot be empty.")

        if errors:
            return f"❌ Validation failed: {'; '.join(errors)}"
        return "✅ Validation passed"
