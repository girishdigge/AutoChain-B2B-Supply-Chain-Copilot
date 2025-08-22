# tools/inventory_check.py
from portia import Tool
from blockchain.hash_tool import emit_with_hash


class InventoryCheckTool(Tool):
    def run(self, order_details, **kwargs):
        inventory_status = {
            "in_stock": True,
            "available_quantity": 20,
            "requested_quantity": order_details["quantity"],
        }
        return emit_with_hash(self, "inventory_check_tool", inventory_status)
