# clarification_tool.py
from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext
import os


class ClarificationInput(BaseModel):
    question: str = Field(..., description="The clarification question to ask")


class ClarificationTool(Tool[str]):
    id: str = "clarification_tool"
    name: str = "ClarificationTool"
    description: str = (
        "Asks the user for missing details when required fields are not provided."
    )
    args_schema: Type[BaseModel] = ClarificationInput
    output_schema: tuple[str, str] = ("string", "User clarification answer")

    def run(self, context: ToolRunContext, question: str) -> str:
        # Add logging to detect if this is being called directly
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[ClarificationTool] DIRECT CALL DETECTED - This should be wrapped! Question: {question}")
        
        # This tool should be wrapped with WebSocketClarificationToolWrapper for websocket functionality
        # If called directly, fall back to environment variable check for CLI usage
        if os.environ.get("PORTIA_ALLOW_BLOCKING_CLARIFICATION", "").lower() in (
            "1",
            "true",
        ):
            logger.warning("[ClarificationTool] Using CLI fallback due to PORTIA_ALLOW_BLOCKING_CLARIFICATION")
            return input(f"❓ Clarification needed: {question}\nYour clarification: ")

        # If no websocket wrapper is present, this indicates a configuration issue
        logger.error("[ClarificationTool] No websocket wrapper and no CLI fallback enabled")
        raise RuntimeError(
            "ClarificationTool requires websocket integration. "
            "Ensure it's wrapped with WebSocketClarificationToolWrapper or set "
            "PORTIA_ALLOW_BLOCKING_CLARIFICATION=1 for CLI fallback (not recommended)."
        )
