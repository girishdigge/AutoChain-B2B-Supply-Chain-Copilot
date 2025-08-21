# negotiation_agent.py
from __future__ import annotations
import re
from typing import Dict, Any, List

from supplier_tool import SupplierTool
from finance_tool import FinanceTool
from logistics_tool import LogisticsTool


# ------------------------------ Parsing helpers ------------------------------ #
def _parse_suppliers_from_string(s: str) -> Dict[str, Any]:
    suppliers: List[Dict[str, Any]] = []
    current: Dict[str, Any] | None = None
    for line in s.splitlines():
        line = line.strip()
        m = re.match(r"✅\s*Supplier Quote from\s*(.+?):\s*$", line)
        if m:
            if current:
                suppliers.append(current)
            current = {"name": m.group(1)}
            continue
        if not current:
            continue
        m = re.search(r"MOQ:\s*(\d+).*?Lead Time:\s*(\d+)", line, flags=re.IGNORECASE)
        if m:
            current["moq"] = int(m.group(1))
            current["lead_time_weeks"] = int(m.group(2))
            continue
        m = re.search(
            r"Unit Price:\s*\$?([\d,\.]+).*?Total:\s*\$?([\d,\.]+)",
            line,
            flags=re.IGNORECASE,
        )
        if m:
            up = float(m.group(1).replace(",", ""))
            tot = float(m.group(2).replace(",", ""))
            current["unit_price"] = up
            current["total_price"] = tot
            continue
    if current:
        suppliers.append(current)
    return {"suppliers": suppliers}


def _ensure_structured_suppliers(obj: Any) -> Dict[str, Any]:
    if isinstance(obj, dict) and "suppliers" in obj:
        return obj
    if isinstance(obj, str):
        return _parse_suppliers_from_string(obj)
    return {"suppliers": []}


def _parse_number(s: str, label: str) -> float | None:
    if label.lower() == "shipping cost":
        m = re.search(r"Shipping Cost:\s*\$([\d,\.]+)", s, flags=re.IGNORECASE)
        if m:
            return float(m.group(1).replace(",", ""))
    if label.lower() == "estimated eta":
        m = re.search(r"Estimated ETA:\s*(\d+)\s*days", s, flags=re.IGNORECASE)
        if m:
            return float(m.group(1))
    if label.lower() == "estimated emissions":
        m = re.search(r"Estimated Emissions:\s*([\d,\.]+)\s*kg", s, flags=re.IGNORECASE)
        if m:
            return float(m.group(1).replace(",", ""))
    return None


# --------------------------------- Agent ------------------------------------ #
class NegotiationAgent:
    def __init__(self):
        self.supplier_tool = SupplierTool()
        self.finance_tool = FinanceTool()
        self.logistics_tool = LogisticsTool()
        # Hardcoded distances (Mumbai as base)
        self.distances = {
            "Berlin": 6300,
            "Paris": 7000,
            "London": 7200,
            "New York": 12500,
            "Singapore": 3900,
            "Tokyo": 6800,
        }

    def negotiate(
        self,
        model: str,
        quantity: int,
        delivery_location: str,
        region: str,
        urgency: str = "normal",
    ) -> Dict[str, Any]:
        print(
            f"\n🤝 Starting negotiation for {quantity} {model}(s) to {delivery_location} ({region})"
        )

        # --- Step 1: Supplier quotes ---------------------------------------- #
        raw_supplier = self.supplier_tool.run(
            None, model=model, quantity=quantity, urgency=urgency
        )
        suppliers = _ensure_structured_suppliers(raw_supplier)
        print("\n📦 Supplier options:\n", suppliers)

        # pick cheapest supplier for finance baseline
        best_supplier = min(
            suppliers["suppliers"], key=lambda x: x.get("total_price", 1e12)
        )
        base_cost = best_supplier["total_price"]

        # --- Step 2: Distance (hardcoded) ----------------------------------- #
        distance_km = self.distances.get(delivery_location, None)
        print(f"\n🛣 Distance Mumbai → {delivery_location}: {distance_km} km")
        if distance_km is None:
            raise ValueError(
                f"❌ No hardcoded distance available for {delivery_location}"
            )

        # --- Step 3: Logistics ---------------------------------------------- #
        carriers = ["DHL", "FedEx", "LocalFreight"]
        shipping_options = []
        for carrier in carriers:
            plan_text = self.logistics_tool.run(
                None,
                model=model,
                quantity=quantity,
                distance_km=int(distance_km),
                urgency=urgency,
                preferred_mode="road",
                carrier=carrier,
            )
            cost = _parse_number(plan_text, "Shipping Cost")
            eta_days = _parse_number(plan_text, "Estimated ETA")
            co2 = _parse_number(plan_text, "Estimated Emissions")
            shipping_options.append(
                {
                    "carrier": carrier,
                    "plan_text": plan_text,
                    "shipping_cost": cost,
                    "eta_days": int(eta_days) if eta_days is not None else None,
                    "co2_kg": co2,
                }
            )
        shipping_options_sorted = sorted(
            shipping_options,
            key=lambda x: (
                x["shipping_cost"] if x["shipping_cost"] is not None else 1e12
            ),
        )
        best_shipping = shipping_options_sorted[0] if shipping_options_sorted else None
        print("\n🚚 Best shipping option (by cost):\n", best_shipping)

        # --- Step 4: Finance ----------------------------------------------- #
        finance_evaluation = self.finance_tool.run(
            None,
            base_cost=base_cost,
            currency="USD",
            region=region,
            payment_terms="Net30",
            financing=(urgency == "urgent"),
        )
        print("\n💰 Finance evaluation:\n", finance_evaluation)

        # --- Final decision ------------------------------------------------ #
        return {
            "suppliers": suppliers,
            "distance_km": distance_km,
            "shipping_options": shipping_options_sorted,
            "finance": finance_evaluation,
            "summary": {
                "chosen_carrier": best_shipping["carrier"] if best_shipping else None,
                "shipping_cost": (
                    best_shipping["shipping_cost"] if best_shipping else None
                ),
                "eta_days": best_shipping["eta_days"] if best_shipping else None,
                "co2_kg": best_shipping["co2_kg"] if best_shipping else None,
                "final_total": base_cost
                + (best_shipping["shipping_cost"] if best_shipping else 0),
            },
        }


if __name__ == "__main__":
    agent = NegotiationAgent()
    result = agent.negotiate("Harrier", 2, "Berlin", region="EU", urgency="urgent")
    print("\n✅ Final Negotiation Result:\n", result)
