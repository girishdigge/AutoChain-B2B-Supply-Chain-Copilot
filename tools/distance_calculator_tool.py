from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext

# Hardcoded distances between major cities (in km)
# Using Mumbai as a base location for suppliers
CITY_DISTANCES = {
    # European cities
    ("Mumbai", "Berlin"): 6300,
    ("Mumbai", "Paris"): 7000,
    ("Mumbai", "London"): 7200,
    ("Mumbai", "Madrid"): 7800,
    ("Mumbai", "Rome"): 6200,
    ("Mumbai", "Amsterdam"): 6800,
    # American cities
    ("Mumbai", "New York"): 12500,
    ("Mumbai", "Los Angeles"): 16000,
    ("Mumbai", "Chicago"): 13000,
    ("Mumbai", "Toronto"): 12800,
    # Asian cities
    ("Mumbai", "Singapore"): 3900,
    ("Mumbai", "Tokyo"): 6800,
    ("Mumbai", "Seoul"): 6500,
    ("Mumbai", "Beijing"): 5500,
    ("Mumbai", "Bangkok"): 2700,
    ("Mumbai", "Dubai"): 1900,
    # Indian cities
    ("Mumbai", "Delhi"): 1400,
    ("Mumbai", "Bangalore"): 840,
    ("Mumbai", "Chennai"): 1030,
    ("Mumbai", "Kolkata"): 1650,
    ("Mumbai", "Hyderabad"): 650,
    ("Mumbai", "Pune"): 150,
}


class DistanceCalculatorInput(BaseModel):
    origin: str = Field(
        default="Mumbai", description="Origin city (defaults to Mumbai)"
    )
    destination: str = Field(..., description="Destination city")


class DistanceCalculatorTool(Tool[str]):
    id: str = "distance_calculator_tool"
    name: str = "DistanceCalculatorTool"
    description: str = (
        "Calculate distance in kilometers between two cities using hardcoded distances"
    )
    args_schema: Type[BaseModel] = DistanceCalculatorInput
    output_schema: tuple[str, str] = ("string", "Distance in kilometers between cities")

    def run(
        self,
        context: ToolRunContext,
        origin: str = "Mumbai",
        destination: str = "",
    ) -> str:
        if not destination:
            return "❌ Destination city is required"

        # Normalize city names (capitalize first letter)
        origin = origin.strip().title()
        destination = destination.strip().title()

        # Try both directions in our lookup table
        distance = None
        route1 = (origin, destination)
        route2 = (destination, origin)

        if route1 in CITY_DISTANCES:
            distance = CITY_DISTANCES[route1]
        elif route2 in CITY_DISTANCES:
            distance = CITY_DISTANCES[route2]

        if distance is not None:
            return f"📍 Distance from {origin} to {destination}: {distance} km"
        else:
            # Default fallback distance
            default_distance = 1000
            available_destinations = set()
            for o, d in CITY_DISTANCES.keys():
                if o == origin:
                    available_destinations.add(d)
                elif d == origin:
                    available_destinations.add(o)

            available_list = (
                ", ".join(sorted(available_destinations))
                if available_destinations
                else "None"
            )
            return (
                f"❓ Distance not available for {origin} to {destination}. "
                f"Using default: {default_distance} km. "
                f"Available destinations from {origin}: {available_list}"
            )


if __name__ == "__main__":
    # Test the tool
    tool = DistanceCalculatorTool()
    print(tool.run(None, origin="Mumbai", destination="Berlin"))
    print(tool.run(None, origin="Mumbai", destination="Tokyo"))
    print(tool.run(None, origin="Mumbai", destination="UnknownCity"))
