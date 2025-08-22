from typing import Type, Optional
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext


class MergeFieldsArgs(BaseModel):
    extracted: dict = Field(..., description="Extracted order fields")
    clarified: Optional[dict] = Field(None, description="Clarified fields (if any)")


class MergeFieldsTool(Tool[str]):
    id: str = "merge_fields_tool"
    name: str = "Merge Fields Tool"
    description: str = (
        "Merges extracted fields with clarified fields. "
        "Clarified values override extracted ones. "
        "Returns a JSON string with buyer_email, model, quantity, delivery_location."
    )
    args_schema: Type[BaseModel] = MergeFieldsArgs
    output_schema: tuple[str, str] = (
        "string",
        "A JSON string with merged order fields.",
    )

    def run(
        self, context: ToolRunContext, extracted: dict, clarified: Optional[dict] = None
    ) -> str:
        merged = {}
        # start from extracted
        for k in ("buyer_email", "model", "quantity", "delivery_location"):
            merged[k] = extracted.get(k) if extracted else None

        # apply clarified values
        if clarified:
            for k, v in clarified.items():
                if v is not None:
                    merged[k] = v

        # coerce quantity if possible
        if merged.get("quantity") is not None:
            try:
                merged["quantity"] = int(merged["quantity"])
            except Exception:
                pass

        import json

        return json.dumps(merged)
