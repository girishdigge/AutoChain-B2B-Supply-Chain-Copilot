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

# Import blockchain integration components
from blockchain_client import health_check_polygon_integration
from blockchain.config import PolygonConfig


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
        self.blockchain_status = self._check_blockchain_integration()
        self.setup_tools()

    def _check_blockchain_integration(self) -> dict:
        """Check blockchain integration status and configuration"""
        try:
            # Check Polygon integration health
            polygon_health = health_check_polygon_integration()

            # Check configuration
            config_status = "valid"
            config_errors = []

            try:
                polygon_config = PolygonConfig.from_env()
                logger.info(
                    f"Polygon configuration loaded: network={polygon_config.network_name}"
                )
            except Exception as e:
                config_status = "invalid"
                config_errors.append(str(e))
                logger.warning(f"Polygon configuration error: {e}")

            blockchain_status = {
                "polygon_integration": polygon_health,
                "configuration": {"status": config_status, "errors": config_errors},
                "overall_status": (
                    "healthy"
                    if polygon_health.get("status") in ["healthy", "degraded"]
                    else "local_only"
                ),
            }

            logger.info(
                f"Blockchain integration status: {blockchain_status['overall_status']}"
            )
            return blockchain_status

        except Exception as e:
            logger.error(f"Error checking blockchain integration: {e}")
            return {
                "polygon_integration": {"status": "error", "error": str(e)},
                "configuration": {"status": "error", "errors": [str(e)]},
                "overall_status": "local_only",
            }

    def setup_tools(self):
        # Initialize blockchain tool with enhanced configuration
        blockchain_tool = BlockchainTool()

        # Log blockchain tool status
        polygon_status = blockchain_tool.get_polygon_service_status()
        logger.info(
            f"Blockchain tool Polygon status: {polygon_status.get('status', 'unknown')}"
        )

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
            blockchain_tool,  # Use the configured blockchain tool instance
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

    13. Record order on blockchain
    - Call polygon_tool with $final_order (order ID, buyer email, order summary, timestamp)
    - Store returned tx_hash
    Output: $blockchain_tx

    14. Send confirmation email
    - Call built-in Portia Gmail tool (portia:google:gmail:send_email) to email the buyer
    - Include payment link, order summary, and next steps in the email body - Include blockchain transaction as a PolygonScan link in this format:
      https://amoy.polygonscan.com/tx/<0x><Polygon tx hash>
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
    """Enhanced health check with websocket and blockchain statistics"""
    stats = websocket_manager.get_connection_stats()

    # Get blockchain integration status
    blockchain_health = processor.blockchain_status

    # Determine overall system health
    overall_status = "healthy"
    if blockchain_health.get("overall_status") == "local_only":
        overall_status = "degraded"  # System works but without full blockchain features
    elif blockchain_health.get("overall_status") == "error":
        overall_status = "degraded"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "websocket_stats": stats,
        "clarification_stats": clarification_handler.get_stats(),
        "processing_stats": orchestrator.get_session_stats(),
        "blockchain_integration": blockchain_health,
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


@app.get("/blockchain/status")
async def blockchain_status():
    """Get detailed blockchain integration status"""
    try:
        # Get current blockchain tool status
        blockchain_tool = None
        for tool in processor.base_tools:
            if isinstance(tool, BlockchainTool):
                blockchain_tool = tool
                break

        if blockchain_tool:
            polygon_status = blockchain_tool.get_polygon_service_status()

            # Get security audit summary if available
            security_audit = {}
            try:
                security_audit = blockchain_tool.get_security_audit_summary(24)
            except Exception as e:
                security_audit = {"error": f"Security audit unavailable: {e}"}

            # Test network recovery if service is available
            network_recovery = {}
            try:
                network_recovery = blockchain_tool.test_network_recovery()
            except Exception as e:
                network_recovery = {"error": f"Network recovery test failed: {e}"}

            return {
                "integration_status": processor.blockchain_status,
                "polygon_service": polygon_status,
                "security_audit": security_audit,
                "network_recovery": network_recovery,
                "timestamp": datetime.utcnow().isoformat(),
            }
        else:
            return {
                "integration_status": processor.blockchain_status,
                "error": "Blockchain tool not found in processor",
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"Error getting blockchain status: {e}")
        return {
            "integration_status": processor.blockchain_status,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@app.post("/ws/cleanup")
async def cleanup_old_data():
    """Cleanup old clarifications and sessions"""
    await clarification_handler.cleanup_old_clarifications()
    return {"message": "Cleanup completed"}


@app.get("/blockchain/config/validate")
async def validate_blockchain_config():
    """Validate blockchain configuration and connectivity"""
    try:
        # Validate Polygon configuration
        config_validation = {
            "polygon_config": {"status": "unknown", "errors": []},
            "network_connectivity": {"status": "unknown", "errors": []},
            "wallet_status": {"status": "unknown", "errors": []},
            "contract_status": {"status": "unknown", "errors": []},
        }

        # Test configuration loading
        try:
            polygon_config = PolygonConfig.from_env()
            config_validation["polygon_config"]["status"] = "valid"
            config_validation["polygon_config"]["network"] = polygon_config.network_name
            config_validation["polygon_config"]["chain_id"] = polygon_config.chain_id
        except Exception as e:
            config_validation["polygon_config"]["status"] = "invalid"
            config_validation["polygon_config"]["errors"].append(str(e))

        # Test network connectivity and other components
        blockchain_health = health_check_polygon_integration()

        if blockchain_health.get("status") == "healthy":
            config_validation["network_connectivity"]["status"] = "connected"
            config_validation["wallet_status"]["status"] = "accessible"
            config_validation["contract_status"]["status"] = "deployed"
        elif blockchain_health.get("status") == "degraded":
            config_validation["network_connectivity"]["status"] = "degraded"
            config_validation["wallet_status"]["status"] = "accessible"
            config_validation["contract_status"]["status"] = "unknown"
        else:
            config_validation["network_connectivity"]["status"] = "failed"
            config_validation["network_connectivity"]["errors"].append(
                blockchain_health.get("error", "Unknown network error")
            )

        # Determine overall validation status
        overall_status = "valid"
        for component, status in config_validation.items():
            if status["status"] in ["invalid", "failed"]:
                overall_status = "invalid"
                break
            elif status["status"] in ["degraded", "unknown"]:
                overall_status = "degraded"

        return {
            "overall_status": overall_status,
            "validation_details": config_validation,
            "blockchain_health": blockchain_health,
            "timestamp": datetime.utcnow().isoformat(),
            "recommendations": _get_config_recommendations(config_validation),
        }

    except Exception as e:
        logger.error(f"Error validating blockchain configuration: {e}")
        return {
            "overall_status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


def _get_config_recommendations(validation_details: dict) -> list:
    """Generate configuration recommendations based on validation results"""
    recommendations = []

    if validation_details["polygon_config"]["status"] == "invalid":
        recommendations.append(
            {
                "type": "configuration",
                "priority": "high",
                "message": "Fix Polygon configuration errors in .env file",
                "action": "Review blockchain/DEPLOYMENT_GUIDE.md for setup instructions",
            }
        )

    if validation_details["network_connectivity"]["status"] == "failed":
        recommendations.append(
            {
                "type": "network",
                "priority": "high",
                "message": "Network connectivity issues detected",
                "action": "Check RPC URL and network settings, review blockchain/TROUBLESHOOTING.md",
            }
        )

    if validation_details["wallet_status"]["status"] == "unknown":
        recommendations.append(
            {
                "type": "wallet",
                "priority": "medium",
                "message": "Wallet status could not be verified",
                "action": "Ensure private key is valid and wallet has sufficient test MATIC",
            }
        )

    if validation_details["contract_status"]["status"] == "unknown":
        recommendations.append(
            {
                "type": "contract",
                "priority": "medium",
                "message": "Smart contract status unclear",
                "action": "Verify contract deployment with: python blockchain/validate_contract_integration.py",
            }
        )

    return recommendations


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
