from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext


class OrderInput(BaseModel):
    buyer_email: str = Field(..., description="The email of the buyer")
    model: str = Field(..., description="The car model being ordered")
    quantity: int = Field(..., description="The number of cars being ordered")
    delivery_location: str = Field(..., description="The delivery address")


class OrderTool(Tool[str]):
    id: str = "order_tool"
    name: str = "Order Tool"
    description: str = "Places a car order with all required details"
    args_schema: Type[BaseModel] = OrderInput
    output_schema: tuple[str, str] = ("string", "Confirmation of the placed order")

    def run(
        self,
        context: ToolRunContext,
        buyer_email: str,
        model: str,
        quantity: int,
        delivery_location: str,
    ) -> str:
        return (
            f"✅ Order placed: {quantity}x {model} for {buyer_email}, "
            f"delivering to {delivery_location}."
        )
