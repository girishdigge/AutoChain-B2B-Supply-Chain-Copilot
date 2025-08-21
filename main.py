"""
Portia-driven pipeline:
- LLM-based structured extraction
- Validation (with automatic clarification hooks)
- Inventory check
- Supplier/logistics/finance negotiation
- Final offer + human approval before placing an order
"""

import json
import os
from dotenv import load_dotenv
from typing import Type, Optional
from pydantic import BaseModel, Field

from portia import (
    Config,
    DefaultToolRegistry,
    InMemoryToolRegistry,
    Portia,
    Tool,
    ToolHardError,
    ToolRunContext,
    Message,
    PlanRunState,
)
from portia.cli import CLIExecutionHooks
from portia.execution_hooks import clarify_on_tool_calls

from validator_tool import ValidatorTool
from inventory_tool import InventoryTool
from pricing_tool import PricingTool
from supplier_tool import SupplierTool
from logistics_tool import LogisticsTool
from finance_tool import FinanceTool
from order_tool import OrderTool
from merge_tool import MergeFieldsTool
from clarification_tool import ClarificationTool
from distance_calculator_tool import DistanceCalculatorTool
from stripe_payment import StripePaymentTool

load_dotenv(override=True)

ORDERS_FILE = "orders.json"
INBOX_FILE = "inbox.txt"
if os.path.exists(INBOX_FILE):
    with open(INBOX_FILE, "r", encoding="utf-8") as f:
        inbox_text = f.read().strip()
else:
    inbox_text = ""
    print(f"⚠️ {INBOX_FILE} not found. Please place your order email in this file.")


# ----------------------------
# Structured schemas
# ----------------------------
class ExtractionOutput(BaseModel):
    buyer_email: Optional[str] = Field(None, description="Email of the buyer")
    model: Optional[str] = Field(None, description="Requested model name / SKU")
    quantity: Optional[int] = Field(None, description="Quantity requested")
    delivery_location: Optional[str] = Field(None, description="Delivery destination")


class FinalOffer(BaseModel):
    buyer_email: str
    model: str
    quantity: int
    delivery_location: str
    supplier: str | None = None
    base_price_usd: float | None = None
    shipping_cost_usd: float | None = None
    taxes_usd: float | None = None
    finance_cost_usd: float | None = None
    final_total_usd: float | None = None
    eta_days: int | None = None
    chosen_carrier: str | None = None
    transcript: dict | None = None


# ----------------------------
# LLM-based Extraction Tool
# ----------------------------
class OrderExtractionTool(Tool):
    """
    Extracts order details (buyer_email, model, quantity, delivery_location)
    directly from inbox.txt using LLM.
    """

    id: str = "order_extraction_tool"
    name: str = "OrderExtractionTool"
    description: str = (
        "Reads inbox.txt and extracts buyer_email, model, quantity, delivery_location. "
        "Missing fields are allowed (None), which will trigger clarification later."
    )
    output_schema: tuple[str, str] = (
        "ExtractionOutput",
        "Structured extraction with buyer_email, model, quantity, delivery_location fields",
    )

    def run(self, context: ToolRunContext) -> dict:
        if not inbox_text:
            raise ToolHardError("Inbox text is empty. Please add content to inbox.txt.")

        llm = context.config.get_default_model()
        system = (
            "You are a JSON-extractor assistant. Extract the buyer email, model name (SKU), "
            "quantity (integer), and the delivery location (city/country) from the user's free-form order text. "
            "Output ONLY a JSON object with keys: buyer_email, model, quantity, delivery_location. "
            "If a value is unknown, output null for that field."
        )
        user_msg = f"Order text:\n{inbox_text}\n\nReturn only a JSON object."
        messages = [
            Message(role="system", content=system),
            Message(role="user", content=user_msg),
        ]

        response = llm.get_response(messages)
        text_out = response.content.strip()

        try:
            start = text_out.find("{")
            end = text_out.rfind("}")
            if start == -1 or end == -1:
                raise ValueError("No JSON object detected in LLM response.")
            json_text = text_out[start : end + 1]
            obj = json.loads(json_text)

            buyer_email = obj.get("buyer_email") or obj.get("email")
            model = obj.get("model") or obj.get("sku")
            quantity = obj.get("quantity") or obj.get("qty")
            delivery_location = obj.get("delivery_location") or obj.get("location")

            if quantity is not None:
                try:
                    quantity = int(quantity)
                except (ValueError, TypeError):
                    raise ToolHardError(
                        f"Could not convert quantity to integer: {quantity}"
                    )

            return {
                "buyer_email": buyer_email,
                "model": model,
                "quantity": quantity,
                "delivery_location": delivery_location,
            }

        except ToolHardError:
            raise
        except Exception as e:
            raise ToolHardError(
                f"Failed to parse LLM JSON output: {e}\nRaw output: {text_out}"
            )


# ----------------------------
# Helper: persist orders
# ----------------------------
def save_order(order_obj: dict):
    if os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, "r") as f:
            try:
                orders = json.load(f)
            except json.JSONDecodeError:
                orders = []
    else:
        orders = []
    orders.append(order_obj)
    with open(ORDERS_FILE, "w") as f:
        json.dump(orders, f, indent=2)
    print(f"📝 Order saved to {ORDERS_FILE}")


# ----------------------------
# Main: build registries, plan, run
# ----------------------------
def main():
    config = Config.from_default()

    # Local tools you already have implemented
    local_tools = InMemoryToolRegistry.from_local_tools(
        [
            OrderExtractionTool(),
            ValidatorTool(),
            InventoryTool(),
            PricingTool(),
            SupplierTool(),
            LogisticsTool(),
            FinanceTool(),
            OrderTool(),
            MergeFieldsTool(),
            ClarificationTool(),
            DistanceCalculatorTool(),
            StripePaymentTool(),
        ]
    )

    tools = DefaultToolRegistry(config=config) + local_tools

    # Execution hooks: ask for clarifications on validator_tool and approval before order_tool
    exec_hooks = CLIExecutionHooks(
        before_tool_call=clarify_on_tool_calls(["validator_tool", "order_tool"])
    )

    portia = Portia(config=config, tools=tools, execution_hooks=exec_hooks)

    plan_text = """
    The agent helps process purchase orders end-to-end.

    ### Workflow (robust):
    1. Order Extraction
    - Call order_extraction_tool to extract buyer_email, model, quantity, delivery_location from inbox.txt.
    Output: $extracted_order

    2. Validation
    - Call validator_tool with $extracted_order.
    Output: $validation

    3. Clarify missing/invalid fields
    - If $validation indicates missing or invalid fields:
        - Ask the user one question at a time using clarification_tool until the missing fields are provided.
        - Output: $clarified_fields (dict of clarified fields)
    - If no fields are missing/invalid:
        - Explicitly set $clarified_fields = {} (empty JSON object).


    4. Merge extracted + clarified into a single final record
    - Call merge_fields_tool with inputs: extracted=$extracted_order, clarified=$clarified_fields
    Output: $merged_fields

    5. Re-validate merged fields (always)
    - Call validator_tool with $merged_fields.merged
    Output: $final_validated_fields
    Note: This step must run whether or not clarifications occurred, ensuring later steps have a consistent input.

    6. Inventory check
    - Call inventory_tool with $final_validated_fields.model and $final_validated_fields.quantity
    Output: $inventory_status
    - If inventory < requested:
        - Present available quantity and ask user:
        - "Only X units are available. Would you like to revise to X units, or choose another model, or cancel?"
        - If user revises qty -> update $final_validated_fields.quantity and re-run pricing from step 8.
        - If user chooses another model -> update $final_validated_fields.model and re-run inventory/pricing.
        - If user cancels -> exit gracefully.

    7. Pricing, supplier & logistics
    - Call pricing_tool with $final_validated_fields -> $pricing_info
    - Call supplier_tool with $final_validated_fields -> $supplier_quotes
    - Call logistics_tool with model, qty, delivery_location -> $shipping_info

    8. Finance & final total
    - Call finance_tool with $pricing_info and $shipping_info -> $finance_info (taxes, fees)
    - Compute final_total_usd = pricing_info.base * qty + shipping_info.shipping_cost + finance_info.taxes + finance_info.finance_cost

    9. Final offer & user confirmation
    - Present a clear offer (unit price, qty, shipping, taxes, final_total_usd, ETA) and ask user to confirm.
    If user declines -> cancel gracefully.

    10. On confirmation: create Stripe checkout session
    - Call stripe_payment_tool with total_usd = final_total_usd, order_id (unique), email, model, qty
    Output: $payment_result (contains payment_link)

    11. Persist and notify
    - Save order record locally with status 'AWAITING_PAYMENT', include order_id, buyer_email, model, qty, final_total_usd, payment_link
    - Call built-in Portia Gmail tool (portia:google:gmail:send_email) to email the buyer: include complete order details including order_id, status, payment_link

    12. Return the final structured output
    - Merge all fields from the validated and enriched order (supplier, base_price_usd, shipping_cost_usd, taxes_usd, finance_cost_usd, final_total_usd, eta_days, chosen_carrier, transcript).
    - Also include order_id, status="AWAITING_PAYMENT", payment_link, notifications_sent=true, buyer_email, model, quantity, delivery_location.
    - Output must be a single JSON object strictly following the FinalOffer schema.

    Notes:
    - Always prefer polite natural clarification.
    - Do not proceed to payment until the user explicitly confirms.
    - Ensure that a single canonical final_validated_fields object exists for all downstream steps.
    """

    print("\n=== Generated Plan ===")
    plan = portia.plan(plan_text)
    print(plan.pretty_print())

    print(
        "\n▶ Running plan (you will be prompted for clarifications/approvals if required)...\n"
    )
    plan_run = portia.run_plan(plan, structured_output_schema=FinalOffer)

    # Check result
    if plan_run.state == PlanRunState.NEED_CLARIFICATION:
        print(
            "Plan run paused and needs clarification. Inspect logs/console for prompts."
        )
    elif plan_run.state != PlanRunState.COMPLETE:
        print(f"Plan run ended with state {plan_run.state}. See logs for errors.")
    else:
        # Check if we have structured output
        if hasattr(plan_run.outputs, "final_output") and plan_run.outputs.final_output:
            try:
                # Try to parse the final output as FinalOffer
                final_output_value = plan_run.outputs.final_output.value

                # If the final output is a string, try to extract JSON from it
                if isinstance(final_output_value, str):
                    import re
                    import json

                    # Look for JSON in the string
                    json_match = re.search(
                        r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", final_output_value
                    )
                    if json_match:
                        json_str = json_match.group()
                        try:
                            final_data = json.loads(json_str)
                            final: FinalOffer = FinalOffer.model_validate(final_data)
                            print("\n✅ Plan completed. Final Offer:")
                            print(final.model_dump_json(indent=2))
                            save_order(final.model_dump())
                        except (json.JSONDecodeError, Exception) as e:
                            print(f"Could not parse JSON from final output: {e}")
                            print(f"Raw final output: {final_output_value}")
                    else:
                        print("No JSON found in final output.")
                        print(f"Raw final output: {final_output_value}")
                else:
                    # Try direct validation
                    final: FinalOffer = FinalOffer.model_validate(final_output_value)
                    print("\n✅ Plan completed. Final Offer:")
                    print(final.model_dump_json(indent=2))
                    save_order(final.model_dump())

            except Exception as e:
                print(f"Error validating final output: {e}")
                print(f"Final output type: {type(plan_run.outputs.final_output.value)}")
                print(f"Final output value: {plan_run.outputs.final_output.value}")
        else:
            print("No structured output available in plan results.")
            print(
                "Plan completed successfully but without the expected FinalOffer structure."
            )

    # done
    print("Finished.")


if __name__ == "__main__":
    main()
