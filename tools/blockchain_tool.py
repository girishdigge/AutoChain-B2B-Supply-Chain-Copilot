# tools/blockchain_tool.py
from typing import Type
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext
from blockchain_client import anchor_step
from storage import save_step
from datetime import datetime


class BlockchainInput(BaseModel):
    step_name: str = Field(..., description="The step name being anchored")
    data: dict = Field(..., description="The step data being anchored")
    order_id: str = Field("default_order", description="Unique order identifier")


class BlockchainTool(Tool[str]):
    id: str = "blockchain:anchor"
    name: str = "Blockchain Anchor Tool"
    description: str = (
        "Anchors workflow step data onto the blockchain, persists results, and maintains a ledger"
    )
    args_schema: Type[BaseModel] = BlockchainInput
    output_schema: tuple[str, str] = (
        "string",
        "The blockchain hash of the anchored data",
    )

    def run(
        self,
        context: ToolRunContext,
        step_name: str,
        data: dict,
        order_id: str = "default_order",
    ) -> str:
        # 1. Anchor to blockchain
        result = anchor_step(step_name, data)

        # 2. Build record
        record = {
            "step_name": step_name,
            "data": data,
            "hash": result["hash"],
            "tx_hash": result.get("tx_hash", "pending"),  # from Polygon later
            "timestamp": datetime.utcnow().isoformat(),
        }

        # 3. Persist to disk
        save_step(order_id, step_name, record)

        # 4. Return just the hash for workflow continuity
        return result["hash"]
