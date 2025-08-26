# validator_tool.py
from typing import Type, Optional
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext
import re


class ValidatorInput(BaseModel):
    buyer_email: Optional[str] = Field(None, description="Buyer's email address")
    model: Optional[str] = Field(None, description="Product model/SKU")
    quantity: Optional[int] = Field(None, description="Quantity to order")
    delivery_location: Optional[str] = Field(None, description="Delivery location")


class ValidatorOutput(BaseModel):
    valid: bool
    missing_fields: list[str] = []
    invalid_fields: list[str] = []
    message: Optional[str] = None
    # echo back the normalized fields (useful to feed into next steps)
    buyer_email: Optional[str] = None
    model: Optional[str] = None
    quantity: Optional[int] = None
    delivery_location: Optional[str] = None


class ValidatorTool(Tool[dict]):
    """
    ValidatorTool: returns structured validation result instead of raising for missing fields.
    This allows the Plan to branch and call the ClarificationTool explicitly.
    """

    id: str = "validator_tool"
    name: str = "ValidatorTool"
    description: str = (
        "Validates order details and returns a structured result indicating missing or invalid fields."
    )
    args_schema: Type[BaseModel] = ValidatorInput
    output_schema: tuple[str, str] = (
        "json",
        "A JSON object with fields: valid, missing_fields, invalid_fields, message, and echoed inputs.",
    )

    def _is_valid_email(self, email: str) -> bool:
        if not email or not isinstance(email, str):
            return False
        email = email.strip()
        if not email:
            return False
        pattern = (
            r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}"
            r"[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
        )
        return re.match(pattern, email) is not None

    def run(
        self,
        context: ToolRunContext,
        buyer_email: Optional[str] = None,
        model: Optional[str] = None,
        quantity: Optional[int] = None,
        delivery_location: Optional[str] = None,
    ) -> dict:
        missing_fields = []
        invalid_fields = []

        if not buyer_email:
            missing_fields.append("buyer_email")
        elif not self._is_valid_email(buyer_email):
            invalid_fields.append(f"buyer_email: '{buyer_email}' invalid format")

        if not model:
            missing_fields.append("model")
        elif len(model.strip()) < 2:
            invalid_fields.append(f"model: '{model}' too short")

        if quantity is None:
            quantity = 1
        elif quantity <= 0:
            invalid_fields.append(f"quantity: {quantity} must be > 0")

        if quantity is None:
            missing_fields.append("quantity")
        elif quantity <= 0:
            invalid_fields.append(f"quantity: {quantity} must be > 0")

        if not delivery_location:
            missing_fields.append("delivery_location")
        elif len(delivery_location.strip()) < 2:
            invalid_fields.append(f"delivery_location: '{delivery_location}' too short")

        valid = not (missing_fields or invalid_fields)

        # human friendly message
        message_parts = []
        if missing_fields:
            message_parts.append("Missing fields: " + ", ".join(missing_fields))
        if invalid_fields:
            message_parts.append("Invalid fields: " + "; ".join(invalid_fields))
        if valid:
            message_parts.append("Validation passed")

        result = ValidatorOutput(
            valid=valid,
            missing_fields=missing_fields,
            invalid_fields=invalid_fields,
            message="\n".join(message_parts),
            buyer_email=buyer_email,
            model=model,
            quantity=quantity,
            delivery_location=delivery_location,
        )
        # return serializable dict
        return result.model_dump()
