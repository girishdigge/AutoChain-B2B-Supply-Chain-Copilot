from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext

# Base logistics rates per km per unit by mode
LOGISTICS_RATES = {
    "road": 2.5,
    "rail": 1.8,
    "air": 6.0,
}

# Base handling fee per shipment
BASE_HANDLING_FEE = 200

# Carrier multipliers (cost, speed, emissions factor in gCO2 per ton-km)
CARRIERS = {
    "DHL": {"cost_mult": 1.2, "speed_mult": 0.9, "emission_mult": 1.1},
    "FedEx": {"cost_mult": 1.1, "speed_mult": 0.8, "emission_mult": 1.0},
    "LocalFreight": {"cost_mult": 0.9, "speed_mult": 1.2, "emission_mult": 0.8},
}

# Approx emissions factors by mode (gCO2 per ton-km per unit weight assumption)
EMISSIONS_FACTORS = {
    "road": 120,
    "rail": 30,
    "air": 600,
}

# assume avg weight of 1 unit (car) ~ 1.5 tons
UNIT_WEIGHT_TON = 1.5


class LogisticsInput(BaseModel):
    model: str = Field(..., description="Car model being shipped")
    quantity: int = Field(..., description="Number of units to ship")
    distance_km: int = Field(
        default=1000,
        description="Distance to delivery location in km (defaults to 1000km if not provided)",
    )
    urgency: str = Field(
        default="normal",
        description="Delivery urgency: 'normal' or 'urgent' (urgent may force air freight)",
    )
    preferred_mode: str = Field(
        default="road",
        description="Preferred transport mode: road, rail, or air",
    )
    carrier: str = Field(
        default="DHL",
        description="Carrier choice: DHL, FedEx, or LocalFreight",
    )
    delivery_location: str = Field(
        default="",
        description="Delivery location to help estimate distance if distance_km not provided",
    )


class LogisticsTool(Tool[str]):
    id: str = "logistics_tool"
    # FIXED: Remove spaces and special characters from the name
    name: str = "LogisticsShippingTool"
    description: str = (
        "Estimates shipping cost, ETA, and CO₂ emissions for orders, "
        "considering carriers and urgency."
    )
    args_schema: Type[BaseModel] = LogisticsInput
    output_schema: tuple[str, str] = ("string", "Shipping cost, ETA & CO₂ estimate")

    def run(
        self,
        context: ToolRunContext,
        model: str,
        quantity: int,
        distance_km: int = 1000,
        urgency: str = "normal",
        preferred_mode: str = "road",
        carrier: str = "DHL",
        delivery_location: str = "",
    ) -> str:
        # Hardcoded distances for common locations (km from Mumbai/India)
        LOCATION_DISTANCES = {
            "Berlin": 6300,
            "Paris": 7000,
            "London": 7200,
            "New York": 12500,
            "Singapore": 3900,
            "Tokyo": 6800,
            "Mumbai": 0,
            "Delhi": 1400,
            "Bangalore": 840,
        }

        # If delivery_location is provided and we have a hardcoded distance, use it
        if delivery_location and delivery_location in LOCATION_DISTANCES:
            distance_km = LOCATION_DISTANCES[delivery_location]
        elif distance_km <= 0:
            # Fallback to default distance
            distance_km = 1000
        # validate mode
        if preferred_mode not in LOGISTICS_RATES:
            return (
                f"❌ Unknown transport mode: {preferred_mode}. Valid: road, rail, air."
            )

        # validate carrier
        if carrier not in CARRIERS:
            return f"❌ Unknown carrier: {carrier}. Valid: {', '.join(CARRIERS.keys())}"

        # urgent orders may force air
        mode = preferred_mode
        if urgency == "urgent" and preferred_mode != "air":
            mode = "air"

        # base calculations
        rate = LOGISTICS_RATES[mode]
        variable_cost = rate * distance_km * quantity
        total_cost = BASE_HANDLING_FEE + variable_cost

        # ETA estimation (before carrier adjustment)
        if mode == "road":
            eta_days = distance_km // 500 + 2
        elif mode == "rail":
            eta_days = distance_km // 800 + 3
        else:  # air
            eta_days = max(2, distance_km // 2000 + 1)

        # emissions (tons * distance * factor)
        emissions_kg = (
            quantity * UNIT_WEIGHT_TON * distance_km * EMISSIONS_FACTORS[mode] / 1000
        )  # kgCO2

        # carrier adjustments
        mult = CARRIERS[carrier]
        total_cost *= mult["cost_mult"]
        eta_days = max(1, int(eta_days * mult["speed_mult"]))
        emissions_kg *= mult["emission_mult"]

        # urgency adjustments
        if urgency == "urgent":
            eta_days = max(1, eta_days - 1)
            total_cost *= 1.15

        return (
            f"🚚 Logistics Plan:\n"
            f"   Carrier: {carrier} | Mode: {mode.capitalize()} | Urgency: {urgency}\n"
            f"   Distance: {distance_km} km | Quantity: {quantity}\n"
            f"   Estimated ETA: {eta_days} days\n"
            f"   Shipping Cost: ${total_cost:.2f}\n"
            f"   Estimated Emissions: {emissions_kg:.1f} kgCO₂\n"
            f"   (Rate: ${rate}/km/unit, Handling Fee: ${BASE_HANDLING_FEE})"
        )


if __name__ == "__main__":
    # Example usage
    tool = LogisticsTool()
    result = tool.run(
        None,
        model="Harrier",
        quantity=3,
        distance_km=1500,
        urgency="urgent",
        preferred_mode="road",
        carrier="DHL",
    )
    print(result)
    result = tool.run(
        None,
        model="Harrier",
        quantity=3,
        distance_km=1500,
        urgency="urgent",
        preferred_mode="road",
        carrier="FedEx",
    )
    print(result)
    result = tool.run(
        None,
        model="Harrier",
        quantity=3,
        distance_km=1500,
        urgency="urgent",
        preferred_mode="road",
        carrier="LocalFreight",
    )
    print(result)
