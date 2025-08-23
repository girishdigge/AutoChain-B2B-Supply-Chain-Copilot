# main.py - Enhanced WebSocket Order Processing System
import json
import os
import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import threading

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from dotenv import load_dotenv
from portia import (
    Config,
    DefaultToolRegistry,
    InMemoryToolRegistry,
    Portia,
    PlanRunState,
    ToolRunContext,
)

# Import existing tools
from tools.validator_tool import ValidatorTool
from tools.inventory_tool import InventoryTool
from tools.pricing_tool import PricingTool
from tools.supplier_tool import SupplierTool
from tools.logistics_tool import LogisticsTool
from tools.finance_tool import FinanceTool
from tools.order_tool import OrderTool
from tools.merge_tool import MergeFieldsTool
from tools.clarification_tool import ClarificationTool
from tools.distance_calculator_tool import DistanceCalculatorTool
from tools.stripe_payment import StripePaymentTool
from tools.blockchain_tool import BlockchainTool
from tools.order_extraction_tool import OrderExtractionTool


# Import new websocket components
from websocket_manager import WebSocketManager
from clarification_handler import ClarificationHandler
from processing_orchestrator import ProcessingOrchestrator
from websocket_tool_wrapper import create_websocket_tool_wrapper

load_dotenv(override=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
ORDERS_FILE = "orders.json"
INBOX_FILE = "inbox.txt"


# Final offer model (keeping for compatibility)
class FinalOffer(BaseModel):
    buyer_email: str
    model: str
    quantity: int
    delivery_location: str
    supplier: Optional[str] = None
    base_price_usd: Optional[float] = None
    shipping_cost_usd: Optional[float] = None
    taxes_usd: Optional[float] = None
    finance_cost_usd: Optional[float] = None
    final_total_usd: Optional[float] = None
    eta_days: Optional[int] = None
    chosen_carrier: Optional[str] = None
    transcript: Optional[dict] = None
    order_id: Optional[str] = None
    status: Optional[str] = None
    payment_link: Optional[str] = None
    notifications_sent: Optional[bool] = None


# Helper: save order locally (atomic + thread-safe)
_orders_file_lock = threading.Lock()


def save_order(order_obj: dict):
    """Append an order to ORDERS_FILE atomically (simple lock + temp file)."""
    with _orders_file_lock:
        if os.path.exists(ORDERS_FILE):
            try:
                with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                    orders = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                orders = []
        else:
            orders = []

        orders.append(order_obj)

        temp_path = ORDERS_FILE + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as tf:
            json.dump(orders, tf, indent=2)
            tf.flush()
            os.fsync(tf.fileno())

        # atomic replace
        os.replace(temp_path, ORDERS_FILE)
    logger.info(f"📝 Order saved to {ORDERS_FILE}")


# Enhanced WebSocket System - Initialize components
websocket_manager = WebSocketManager()
clarification_handler = ClarificationHandler(websocket_manager)
orchestrator = ProcessingOrchestrator(websocket_manager, clarification_handler)


# Function to update event loop references when server starts
def update_event_loop_references():
    """Update event loop references in all components"""
    try:
        main_loop = asyncio.get_running_loop()
        websocket_manager._main_loop = main_loop
        logger.info(f"[Main] Updated websocket manager with main loop: {main_loop}")
    except RuntimeError:
        logger.warning("[Main] No running event loop found during startup")


# Removed EnhancedWebSocketClarificationTool - using WebSocketClarificationToolWrapper instead


# Enhanced Order Processor with WebSocket Integration
class PortiaOrderProcessor:
    def __init__(self):
        self.config = Config.from_default()
        self.setup_tools()

    def setup_tools(self):
        self.base_tools = [
            OrderExtractionTool(),
            ValidatorTool(),
            InventoryTool(),
            PricingTool(),
            SupplierTool(),
            LogisticsTool(),
            FinanceTool(),
            OrderTool(),
            MergeFieldsTool(),
            ClarificationTool(),  # Use base ClarificationTool - will be wrapped with websocket functionality
            DistanceCalculatorTool(),
            StripePaymentTool(),
            BlockchainTool(),
        ]

        self.default_registry = DefaultToolRegistry(config=self.config)

    async def process_order(
        self,
        order_text: str,
        websocket_manager: WebSocketManager,
        client_id: str,
        run_id: str = None,
        orchestrator: ProcessingOrchestrator = None,
    ) -> Dict[str, Any]:
        if not run_id:
            run_id = str(uuid.uuid4())

        try:
            # Write order text to inbox file
            with open(INBOX_FILE, "w", encoding="utf-8") as f:
                f.write(order_text)

            # Websocket context will be handled by WebSocketClarificationToolWrapper

            # Send initialization status
            if orchestrator:
                await orchestrator.send_phase_transition(
                    run_id, "initialization", "Initializing order processing workflow"
                )

            plan_text = """
    Process purchase orders efficiently with complete workflow.

    1. Extract order from inbox.txt
    - Call order_extraction_tool
    Output: $order

    2. Validate order data
    - Call validator_tool with $order
    Output: $validation

    3. Get missing fields (if needed)
    - If $validation.missing_fields is not empty, use clarification_tool to get them
    - Otherwise, skip this step
    Output: $clarified (optional)

    4. Merge order data
    - Call merge_fields_tool with $order and $clarified (if available)
    - This creates the final validated order
    Output: $validated_order

    5. Check inventory
    - Call inventory_tool with $validated_order
    - If out of stock, use clarification_tool for alternatives
    Output: $inventory_result

    6. Get pricing
    - Call pricing_tool with $validated_order and $inventory_result
    Output: $pricing

    7. Find suppliers
    - Call supplier_tool with $validated_order
    Output: $suppliers

    8. Calculate logistics
    - Call logistics_tool with $validated_order and $suppliers
    Output: $logistics

    9. Calculate finance terms
    - Call finance_tool with $validated_order, $pricing, and $logistics
    Output: $finance

    10. Present final offer
    - Use clarification_tool to show complete offer and get confirmation
    Output: $confirmation

    11. Create payment session
    - Call stripe_payment_tool with $finance total amount and order details
    - Generate payment link for customer
    Output: $payment

    12. Finalize order
    - Call order_tool with all data including payment information
    - Create final order record with payment link
    Output: $final_order

    13. Send confirmation email
    - Call built-in Portia Gmail tool (portia:google:gmail:send_email) to email the buyer
    - Include payment link, order summary, and next steps in the email body
    Output: $email_sent

    Execute all steps sequentially. Ensure payment link is generated and email is sent.
    """

            # Send planning step update
            if orchestrator:
                from websocket_models import StepUpdate

                await orchestrator.send_step_update(
                    run_id,
                    StepUpdate(
                        step_id="planning",
                        step_name="Generating execution plan",
                        status="started",
                    ),
                )

            # Create enhanced tool wrappers
            wrapped_tools = []
            for tool in self.base_tools:
                tool_name = getattr(tool, "name", getattr(tool, "id", "unknown"))
                logger.info(f"[PortiaOrderProcessor] Wrapping tool: {tool_name}")
                wrapped_tool = create_websocket_tool_wrapper(
                    tool, orchestrator, websocket_manager, clarification_handler
                )
                wrapped_tools.append(wrapped_tool)

            # Set run_id and client_id in context for tools
            for tool in wrapped_tools:
                if hasattr(tool, "run_id"):
                    tool.run_id = run_id
                if hasattr(tool, "client_id"):
                    tool.client_id = client_id
                # Set global context for clarification tools
                if hasattr(tool, "set_global_context"):
                    tool.set_global_context(run_id, client_id)

            local_tools = InMemoryToolRegistry.from_local_tools(wrapped_tools)

            # Log the tools being registered
            logger.info(
                f"[PortiaOrderProcessor] Registering {len(wrapped_tools)} wrapped tools"
            )
            for tool in wrapped_tools:
                tool_name = getattr(tool, "name", getattr(tool, "id", "unknown"))
                tool_type = type(tool).__name__
                logger.info(f"[PortiaOrderProcessor] - {tool_name} ({tool_type})")

            # Use only local tools to ensure wrapped tools are used
            local_tools = InMemoryToolRegistry.from_local_tools(wrapped_tools)
            tools_for_run = self.default_registry + local_tools
            logger.info(
                "[PortiaOrderProcessor] Using only wrapped local tools (not default registry)"
            )

            portia = Portia(config=self.config, tools=tools_for_run)

            plan = await asyncio.get_event_loop().run_in_executor(
                None, lambda: portia.plan(plan_text)
            )

            # Send planning completed update
            if orchestrator:
                await orchestrator.send_step_update(
                    run_id,
                    StepUpdate(
                        step_id="planning",
                        step_name="Plan generated successfully",
                        status="completed",
                        output={
                            "plan_id": (
                                str(plan.id) if hasattr(plan, "id") else "unknown"
                            )
                        },
                    ),
                )

                # Set estimated total steps for progress tracking
                estimated_steps = 13  # Based on our plan: extract, validate, clarify, merge, inventory, pricing, supplier, logistics, finance, offer, payment, order, email
                if run_id in orchestrator.active_sessions:
                    orchestrator.active_sessions[run_id][
                        "total_steps"
                    ] = estimated_steps

                await orchestrator.send_phase_transition(
                    run_id, "execution", "Executing order processing plan"
                )

            # Execute plan with context
            def run_plan_with_context():
                try:
                    # Set thread-local context for tools in executor thread
                    from websocket_tool_wrapper import set_websocket_context

                    set_websocket_context(
                        run_id, client_id, orchestrator, clarification_handler
                    )
                    logger.info(
                        f"[PortiaOrderProcessor] Set thread-local context in executor thread: run_id={run_id}, client_id={client_id}"
                    )

                    # Run plan with structured output schema
                    plan_run = portia.run_plan(
                        plan, structured_output_schema=FinalOffer
                    )
                    return plan_run
                except Exception as e:
                    logger.error(
                        f"[PortiaOrderProcessor] Error during plan execution: {e}"
                    )
                    raise

            plan_run = await asyncio.get_event_loop().run_in_executor(
                None, run_plan_with_context
            )

            if plan_run.state == PlanRunState.COMPLETE:
                final_output = None

                if (
                    hasattr(plan_run.outputs, "final_output")
                    and plan_run.outputs.final_output
                ):
                    try:
                        final_output_value = plan_run.outputs.final_output.value

                        if isinstance(final_output_value, str):
                            import re

                            json_match = re.search(
                                r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", final_output_value
                            )
                            if json_match:
                                json_str = json_match.group()
                                try:
                                    final_data = json.loads(json_str)
                                    final = FinalOffer.model_validate(final_data)
                                    final_output = final.model_dump()
                                    save_order(final_output)
                                except Exception as e:
                                    print(
                                        f"[PortiaOrderProcessor] Could not parse JSON from final output: {e}"
                                    )
                        else:
                            final = FinalOffer.model_validate(final_output_value)
                            final_output = final.model_dump()
                            save_order(final_output)

                    except Exception as e:
                        print(
                            f"[PortiaOrderProcessor] Error validating final output: {e}"
                        )

                # Send completion notification
                if orchestrator:
                    await orchestrator.complete_processing(
                        run_id,
                        {
                            "status": "completed",
                            "final_output": final_output,
                            "run_id": run_id,
                        },
                    )

                return {
                    "status": "completed",
                    "final_output": final_output,
                    "run_id": run_id,
                }
            else:
                error_msg = f"Plan run ended with state {plan_run.state}"
                if orchestrator:
                    await orchestrator.handle_processing_error(
                        run_id, Exception(error_msg)
                    )
                return {"status": "error", "error": error_msg, "run_id": run_id}

        except Exception as e:
            error_msg = f"Error during order processing: {str(e)}"
            logger.error(f"[PortiaOrderProcessor] {error_msg}")
            if orchestrator:
                await orchestrator.handle_processing_error(run_id, e)
            return {"status": "error", "error": error_msg, "run_id": run_id}


# FastAPI app + endpoints
app = FastAPI(title="Enhanced Portia Order Processing API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processor
processor = PortiaOrderProcessor()


@app.get("/")
async def read_root():
    return {"message": "Portia Order Processing API is running"}


@app.get("/orders")
async def get_orders():
    if os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, "r") as f:
            try:
                orders = json.load(f)
                return {"orders": orders}
            except json.JSONDecodeError:
                return {"orders": []}
    return {"orders": []}


@app.get("/health")
async def health_check():
    """Enhanced health check with websocket statistics"""
    stats = websocket_manager.get_connection_stats()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "websocket_stats": stats,
        "clarification_stats": clarification_handler.get_stats(),
        "processing_stats": orchestrator.get_session_stats(),
    }


@app.get("/ws/stats")
async def websocket_stats():
    """Get detailed websocket statistics"""
    return {
        "connection_stats": websocket_manager.get_connection_stats(),
        "clarification_stats": clarification_handler.get_stats(),
        "processing_stats": orchestrator.get_session_stats(),
        "active_sessions": orchestrator.get_active_sessions(),
    }


@app.post("/ws/cleanup")
async def cleanup_old_data():
    """Cleanup old clarifications and sessions"""
    await clarification_handler.cleanup_old_clarifications()
    return {"message": "Cleanup completed"}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """Enhanced WebSocket endpoint with proper message handling"""

    # Update event loop references
    update_event_loop_references()

    # Connect client
    connected = await websocket_manager.connect(websocket, client_id)
    if not connected:
        logger.error(f"Failed to connect client {client_id}")
        return

    try:
        while True:
            try:
                # Receive message
                raw_message = await websocket.receive_text()

                # Handle message through manager
                await websocket_manager.handle_message(client_id, raw_message)

            except WebSocketDisconnect:
                logger.info(f"Client {client_id} disconnected normally")
                break
            except Exception as e:
                logger.error(f"Error handling message from {client_id}: {e}")
                await websocket_manager.send_error(
                    client_id, "message_error", f"Error processing message: {str(e)}"
                )
                break

    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
    finally:
        # Cleanup connection
        await websocket_manager.disconnect(client_id, "Connection closed")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    logger.info("Shutting down websocket manager...")
    await websocket_manager.shutdown()


if __name__ == "__main__":
    logger.info("Starting Enhanced Portia Order Processing API v2.0.0")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
