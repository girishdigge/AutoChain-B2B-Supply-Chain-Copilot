from typing import Type
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext

# Example tax rates by region
TAX_RATES = {
    "IN": 0.18,  # India 18% GST
    "US": 0.07,  # US avg sales tax
    "EU": 0.20,  # EU VAT
    "SG": 0.08,  # Singapore GST
}

# Financing interest per annum (assume 10%)
ANNUAL_INTEREST_RATE = 0.10


class FinanceInput(BaseModel):
    base_cost: float = Field(..., description="Base order cost before tax or interest")
    currency: str = Field(default="USD", description="Currency code")
    region: str = Field(
        default="US", description="Region for tax rules (US, EU, IN, etc.)"
    )
    payment_terms: str = Field(
        default="Net30",
        description="Payment terms: Advance, Net30, Net60",
    )
    financing: bool = Field(
        default=False,
        description="If True, simulate interest if payment is delayed",
    )


class FinanceTool(Tool[str]):
    id: str = "finance_tool"
    name: str = "Finance & Payment Tool"
    description: str = (
        "Calculates taxes, payment terms, and financing cost for an order."
    )
    args_schema: Type[BaseModel] = FinanceInput
    output_schema: tuple[str, str] = ("string", "Final payable amount with details")

    def run(
        self,
        context: ToolRunContext,
        base_cost: float,
        currency: str,
        region: str,
        payment_terms: str,
        financing: bool,
    ) -> str:
        # --- Tax Calculation ---
        tax_rate = TAX_RATES.get(region.upper(), 0.10)
        tax_amount = base_cost * tax_rate
        subtotal = base_cost + tax_amount

        # --- Payment Terms ---
        now = datetime.utcnow()
        if payment_terms.lower() == "advance":
            due_date = now
            effective_days = 0
        elif payment_terms.lower() == "net30":
            due_date = now + timedelta(days=30)
            effective_days = 30
        elif payment_terms.lower() == "net60":
            due_date = now + timedelta(days=60)
            effective_days = 60
        else:
            return f"❌ Unknown payment term: {payment_terms}"

        # --- Financing (if applicable) ---
        finance_cost = 0
        if financing and effective_days > 0:
            daily_rate = ANNUAL_INTEREST_RATE / 365
            finance_cost = subtotal * daily_rate * effective_days

        total_payable = subtotal + finance_cost

        return (
            f"💳 Finance Summary:\n"
            f"   Base Cost: {currency} {base_cost:,.2f}\n"
            f"   Tax ({tax_rate*100:.1f}%): {currency} {tax_amount:,.2f}\n"
            f"   Subtotal: {currency} {subtotal:,.2f}\n"
            f"   Payment Terms: {payment_terms} (Due {due_date.date()})\n"
            f"   Financing: {'Yes' if financing else 'No'}\n"
            f"   Interest Cost: {currency} {finance_cost:,.2f}\n"
            f"   👉 Total Payable: {currency} {total_payable:,.2f}"
        )
