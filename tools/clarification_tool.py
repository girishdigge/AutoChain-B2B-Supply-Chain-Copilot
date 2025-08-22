# clarification_tool.py
from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext


class ClarificationInput(BaseModel):
    question: str = Field(..., description="The clarification question to ask")


class ClarificationTool(Tool[str]):
    id: str = "clarification_tool"
    # CORRECTED NAME
    name: str = "ClarificationTool"
    description: str = (
        "Asks the user for missing details when required fields are not provided."
    )
    args_schema: Type[BaseModel] = ClarificationInput
    output_schema: tuple[str, str] = ("string", "User clarification answer")

    def run(self, context: ToolRunContext, question: str) -> str:
        return input(f"❓ Clarification needed: {question}\nYour clarification: ")
