#!/usr/bin/env python3
# tools/order_extraction.py

from portia import Tool
import hashlib
import json


class OrderExtractionTool(Tool):
    """
    Extract order details (buyer_email, model, quantity, delivery_location)
    from inbox.txt or similar input.
    """

    def run(self, **kwargs):
        # Example: Replace with actual extraction logic
        extracted = {
            "buyer_email": "buyer@example.com",
            "model": "Model-X",
            "quantity": 10,
            "delivery_location": "Mumbai, India",
        }

        # ✅ Create a reproducible hash for the output (for frontend viz)
        hash_input = json.dumps(extracted, sort_keys=True).encode()
        step_hash = hashlib.sha256(hash_input).hexdigest()

        # ✅ Record provenance (traceability only, doesn't forward result)
        self.record_provenance(
            "order_extraction_tool", {"output": extracted, "hash": step_hash}
        )

        # ✅ Emit result so plan can continue
        return {"order_details": extracted, "step_hash": step_hash}
