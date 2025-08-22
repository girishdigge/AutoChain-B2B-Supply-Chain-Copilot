# tools/stripe_payment.py

import os
import stripe
from typing import Type
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from portia import Tool, ToolRunContext, ToolHardError

# Load Stripe API key from your .env file
load_dotenv()
stripe.api_key = os.getenv("STRIPE_TEST_API_KEY")
if not stripe.api_key:
    raise ValueError("STRIPE_TEST_API_KEY is not set in the environment variables.")


# ---------- Schemas ----------


class StripePaymentArgs(BaseModel):
    """Arguments for creating a Stripe payment link."""

    total_usd: float = Field(..., description="Total price in USD (e.g., 199.99)")
    order_id: str = Field(..., description="Unique order identifier")
    email: str = Field(..., description="Buyer's email address")
    model: str = Field(..., description="Product name or model")
    qty: int = Field(..., description="Quantity of the product")


class StripePaymentOutput(BaseModel):
    """Output containing the payment link and status."""

    payment_link: str = Field(
        ...,
        description="The generated Stripe Checkout URL for the user to complete payment",
    )
    order_id: str = Field(..., description="The order ID associated with this payment")
    status: str = Field(
        ..., description="The initial status of the payment (e.g., 'pending_payment')"
    )


# ---------- Tool Implementation ----------


class StripePaymentTool(Tool):
    id: str = "stripe_payment_tool"
    name: str = "StripePaymentTool"
    description: str = (
        "Creates a Stripe Checkout session and returns a payment link for a given order."
    )

    # This remains correct
    args_schema: Type[BaseModel] = StripePaymentArgs

    # FIX: Changed output_schema to be a tuple of (name, description)
    # The SDK expects a tuple here, not the class type directly.
    output_schema: tuple[str, str] = (
        "StripePaymentOutput",
        "A JSON object containing the payment link, order ID, and status.",
    )

    def run(
        self,
        context: ToolRunContext,
        total_usd: float,
        order_id: str,
        email: str,
        model: str,
        qty: int,
    ) -> dict:
        """
        Creates a Stripe Checkout session for payment.
        This implementation uses 'price_data' for dynamic, one-off charges,
        which is more efficient than creating new Product/Price objects on every run.
        """
        try:
            # Convert the dollar float amount to an integer of cents for the Stripe API
            amount_in_cents = int(total_usd * 100)

            # Create a checkout session directly with price data
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                customer_email=email,
                line_items=[
                    {
                        "price_data": {
                            "currency": "usd",
                            "product_data": {
                                "name": model,
                                "description": f"Order ID: {order_id}",
                            },
                            "unit_amount": amount_in_cents,
                        },
                        "quantity": qty,
                    }
                ],
                metadata={"order_id": order_id},
                success_url=f"http://localhost:3000/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}",
                cancel_url=f"http://localhost:3000/cancel?order_id={order_id}",
            )

            return {
                "payment_link": session.url,
                "order_id": order_id,
                "status": "pending_payment",
            }

        except Exception as e:
            raise ToolHardError(f"Stripe API Error: {str(e)}")
