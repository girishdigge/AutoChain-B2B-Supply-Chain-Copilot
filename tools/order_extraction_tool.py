# order_extraction_tool.py
"""
Enhanced Order Extraction Tool for FastAPI WebSocket integration
"""

import json
import os
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from portia import Tool, ToolRunContext, ToolHardError, Message


class ExtractionOutput(BaseModel):
    buyer_email: Optional[str] = Field(None, description="Email of the buyer")
    model: Optional[str] = Field(None, description="Requested model name / SKU")
    quantity: Optional[int] = Field(None, description="Quantity requested")
    delivery_location: Optional[str] = Field(None, description="Delivery destination")


class OrderExtractionTool(Tool):
    id: str = "order_extraction_tool"
    name: str = "OrderExtractionTool"
    description: str = (
        "Reads inbox.txt and extracts buyer_email, model, quantity, delivery_location. "
        "Uses both LLM and pattern matching for robust extraction. "
        "Missing fields are allowed (None), which will trigger clarification later."
    )
    output_schema: tuple[str, str] = (
        "ExtractionOutput",
        "Structured extraction with buyer_email, model, quantity, delivery_location fields",
    )

    def _extract_with_patterns(self, text: str) -> Dict[str, Any]:
        """Fallback extraction using regex patterns"""
        result = {
            "buyer_email": None,
            "model": None,
            "quantity": None,
            "delivery_location": None,
        }

        # Email patterns
        email_patterns = [
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            r"(?:from|email|contact):\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})",
        ]

        for pattern in email_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["buyer_email"] = (
                    match.group(1) if match.groups() else match.group(0)
                )
                break

        # Quantity patterns
        quantity_patterns = [
            r"(?:quantity|qty|amount|units?):\s*(\d+)",
            r"(\d+)\s*(?:units?|pieces?|pcs?)",
            r"order\s+(\d+)",
        ]

        for pattern in quantity_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    result["quantity"] = int(match.group(1))
                    break
                except (ValueError, IndexError):
                    continue

        # Model/SKU patterns
        model_patterns = [
            r"(?:model|sku|product):\s*([A-Za-z0-9-_]+)",
            r"(?:model|sku)\s+([A-Za-z0-9-_]+)",
        ]

        for pattern in model_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["model"] = match.group(1).strip()
                break

        # Location patterns
        location_patterns = [
            r"(?:deliver to|delivery to|ship to|location):\s*([A-Za-z\s,]+)",
            r"(?:address|location):\s*([A-Za-z\s,]+)",
        ]

        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["delivery_location"] = match.group(1).strip()
                break

        return result

    def run(self, context: ToolRunContext) -> dict:
        INBOX_FILE = "inbox.txt"

        # Prefer explicit order_text from context.inputs (avoid using shared file).
        order_text = None
        try:
            if context and getattr(context, "inputs", None):
                # context.inputs might be a dict-like object
                order_text = context.inputs.get("order_text") or context.inputs.get(
                    "order_text_text"
                )
        except Exception:
            order_text = None

        # Fallback to reading the INBOX_FILE (legacy)
        if not order_text:
            if not os.path.exists(INBOX_FILE):
                raise ToolHardError(
                    f"Inbox file {INBOX_FILE} not found and no order_text provided."
                )
            with open(INBOX_FILE, "r", encoding="utf-8") as f:
                order_text = f.read().strip()

        if not order_text:
            raise ToolHardError(
                "Order text is empty. Please supply order_text or populate inbox.txt."
            )

        try:
            # First, try LLM extraction
            llm = context.config.get_default_model()
            system = (
                "You are a JSON-extractor assistant. Extract the buyer email, model name (SKU), "
                "quantity (integer), and the delivery location (city/country) from the user's free-form order text. "
                "Output ONLY a JSON object with keys: buyer_email, model, quantity, delivery_location. "
                "If a value is unknown or cannot be found, output null for that field. "
                "Look for common patterns like 'From:', 'Email:', model names, quantities (numbers), and locations. "
                "Be very careful to extract accurate information and don't hallucinate data."
            )
            user_msg = f"Order text:\n{order_text}\n\nReturn only a JSON object."
            messages = [
                Message(role="system", content=system),
                Message(role="user", content=user_msg),
            ]

            response = llm.get_response(messages)
            text_out = response.content.strip()

            # Extract JSON from the response robustly
            start = text_out.find("{")
            end = text_out.rfind("}")
            if start == -1 or end == -1:
                raise ValueError("No JSON object detected in LLM response.")

            json_text = text_out[start : end + 1]
            llm_result = json.loads(json_text)

            # Normalize field names (...)
            buyer_email = (
                llm_result.get("buyer_email")
                or llm_result.get("email")
                or llm_result.get("from")
            )
            model = (
                llm_result.get("model")
                or llm_result.get("sku")
                or llm_result.get("product")
            )
            quantity = (
                llm_result.get("quantity")
                or llm_result.get("qty")
                or llm_result.get("amount")
            )
            delivery_location = (
                llm_result.get("delivery_location")
                or llm_result.get("location")
                or llm_result.get("destination")
                or llm_result.get("address")
            )

            if quantity is not None:
                try:
                    quantity = int(quantity)
                except (ValueError, TypeError):
                    print(f"Warning: Could not convert quantity to integer: {quantity}")
                    quantity = None

            result = {
                "buyer_email": buyer_email,
                "model": model,
                "quantity": quantity,
                "delivery_location": delivery_location,
            }

        except Exception as llm_error:
            print(f"LLM extraction failed: {llm_error}")
            print("Falling back to pattern-based extraction...")
            result = self._extract_with_patterns(order_text)

        # Post-processing: clean up extracted data
        if result.get("buyer_email"):
            result["buyer_email"] = result["buyer_email"].strip().lower()

        if result.get("model"):
            result["model"] = result["model"].strip()

        if result.get("delivery_location"):
            location = result["delivery_location"].strip()
            result["delivery_location"] = " ".join(
                word.capitalize() for word in location.split()
            )

        # Validation meta
        missing_fields = []
        if not result.get("buyer_email"):
            missing_fields.append("buyer_email")
        if not result.get("model"):
            missing_fields.append("model")
        if not result.get("quantity"):
            missing_fields.append("quantity")
        if not result.get("delivery_location"):
            missing_fields.append("delivery_location")

        print(f"✅ Extracted order details: {result}")
        if missing_fields:
            print(f"⚠️ Missing fields (will need clarification): {missing_fields}")

        result["_extraction_metadata"] = {
            "source": "llm_with_pattern_fallback",
            "missing_fields": missing_fields,
        }

        return result

    def get_missing_fields(self, extraction_result: Dict[str, Any]) -> List[str]:
        """Helper method to get list of missing fields from extraction result"""
        if "_extraction_metadata" in extraction_result:
            return extraction_result["_extraction_metadata"].get("missing_fields", [])

        # Fallback: check fields manually
        missing = []
        required_fields = ["buyer_email", "model", "quantity", "delivery_location"]
        for field in required_fields:
            if not extraction_result.get(field):
                missing.append(field)
        return missing
