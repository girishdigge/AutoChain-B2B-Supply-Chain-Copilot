# tools/blockchain_tool.py
import asyncio
import logging
from typing import Type, Optional
from pydantic import BaseModel, Field
from portia import Tool, ToolRunContext
from blockchain_client import anchor_step
from apps.app.storage import save_step
from datetime import datetime

# Import Polygon integration components
from blockchain.polygon_deployment import PolygonDeploymentService, PolygonResult
from blockchain.config import PolygonConfig

logger = logging.getLogger(__name__)


class BlockchainInput(BaseModel):
    step_name: str = Field(..., description="The step name being anchored")
    data: dict = Field(..., description="The step data being anchored")
    order_id: str = Field("default_order", description="Unique order identifier")


class BlockchainTool(Tool[str]):
    id: str = "blockchain:anchor"
    name: str = "Blockchain Anchor Tool"
    description: str = (
        "Anchors workflow step data onto the blockchain, persists results, and maintains a ledger. "
        "Now includes Polygon Amoy testnet deployment for immutable transaction records."
    )
    args_schema: Type[BaseModel] = BlockchainInput
    output_schema: tuple[str, str] = (
        "string",
        "The combined local, Polygon, and contract transaction hashes (format: local_hash:polygon_tx_hash:contract_tx_hash)",
    )

    def __init__(self):
        super().__init__()
        self._polygon_service: Optional[PolygonDeploymentService] = None
        self._initialize_polygon_service()

    @property
    def polygon_service(self) -> Optional[PolygonDeploymentService]:
        """Get the Polygon deployment service instance"""
        return self._polygon_service

    def _initialize_polygon_service(self) -> None:
        """Initialize Polygon deployment service with comprehensive error handling"""
        try:
            config = PolygonConfig.from_env()
            self._polygon_service = PolygonDeploymentService(config)

            # Test initial connectivity
            health_check = asyncio.run(self._polygon_service.health_check())
            if health_check["overall_status"] in ["unhealthy", "degraded"]:
                logger.warning(
                    f"Polygon service initialized but health check shows: {health_check['overall_status']}"
                )
                logger.info("Service will attempt graceful degradation if needed")
            else:
                logger.info(
                    "Polygon deployment service initialized successfully with healthy status"
                )

        except Exception as e:
            logger.warning(f"Failed to initialize Polygon service: {e}")
            logger.info("Continuing with local-only blockchain operations")
            self._polygon_service = None

    def _deploy_to_polygon_sync_with_metadata(self, block_data: dict) -> Optional[dict]:
        """Synchronous wrapper for async Polygon deployment with retry metadata capture"""
        if not self.polygon_service:
            logger.debug("Polygon service not available, skipping deployment")
            return None

        try:
            # Check if service is in degraded mode
            status = self.polygon_service.get_comprehensive_status()
            if status.get("degradation_active", False):
                logger.info(
                    "Polygon service in degraded mode, attempting local-only operation"
                )
                return None

            # Create new event loop for async operation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                # Validate block data before deployment
                validation_result = self.polygon_service.validate_operation_security(
                    "data_integrity", block_data, {"algorithm": "keccak256"}
                )

                if not validation_result.get("overall_valid", False):
                    logger.error(
                        f"Block data validation failed: {validation_result.get('errors', [])}"
                    )
                    return None

                # Deploy transaction with retry logic
                result: PolygonResult = loop.run_until_complete(
                    self.polygon_service.deploy_transaction_with_retry(block_data)
                )

                if result.success and result.transaction:
                    logger.info(
                        f"Successfully deployed to Polygon: {result.transaction.tx_hash} (after {result.retry_count} retries)"
                    )
                    return {
                        "tx_hash": result.transaction.tx_hash,
                        "retry_count": result.retry_count,
                        "retry_attempts": result.retry_attempts,
                    }
                else:
                    logger.warning(
                        f"Polygon deployment failed after {result.retry_count} retries: {result.error}"
                    )

                    # Test network recovery if deployment failed
                    recovery_result = self.polygon_service.test_network_recovery()
                    if recovery_result.get("recovered", False):
                        logger.info(
                            "Network recovered, deployment may succeed on retry"
                        )

                    return {
                        "tx_hash": None,
                        "retry_count": result.retry_count,
                        "retry_attempts": result.retry_attempts,
                        "error": result.error,
                    }

            finally:
                loop.close()

        except Exception as e:
            logger.error(f"Polygon deployment error: {e}")

            # If we have the service, let it handle the error
            if self.polygon_service:
                try:
                    self.polygon_service.error_handler.handle_network_failure(
                        e,
                        {
                            "operation": "deploy_to_polygon_sync",
                            "block_data_size": len(str(block_data)),
                        },
                    )
                except Exception as handler_error:
                    logger.error(f"Error handler failed: {handler_error}")

            return {
                "tx_hash": None,
                "retry_count": 0,
                "retry_attempts": [],
                "error": str(e),
            }

    def _deploy_to_polygon_sync(self, block_data: dict) -> Optional[str]:
        """Synchronous wrapper for async Polygon deployment with enhanced error handling"""
        if not self.polygon_service:
            logger.debug("Polygon service not available, skipping deployment")
            return None

        try:
            # Check if service is in degraded mode
            status = self.polygon_service.get_comprehensive_status()
            if status.get("degradation_active", False):
                logger.info(
                    "Polygon service in degraded mode, attempting local-only operation"
                )
                return None

            # Create new event loop for async operation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                # Validate block data before deployment
                validation_result = self.polygon_service.validate_operation_security(
                    "data_integrity", block_data, {"algorithm": "keccak256"}
                )

                if not validation_result.get("overall_valid", False):
                    logger.error(
                        f"Block data validation failed: {validation_result.get('errors', [])}"
                    )
                    return None

                # Deploy transaction with retry logic
                result: PolygonResult = loop.run_until_complete(
                    self.polygon_service.deploy_transaction_with_retry(block_data)
                )

                if result.success and result.transaction:
                    logger.info(
                        f"Successfully deployed to Polygon: {result.transaction.tx_hash}"
                    )
                    return result.transaction.tx_hash
                else:
                    logger.warning(f"Polygon deployment failed: {result.error}")

                    # Test network recovery if deployment failed
                    recovery_result = self.polygon_service.test_network_recovery()
                    if recovery_result.get("recovered", False):
                        logger.info(
                            "Network recovered, deployment may succeed on retry"
                        )

                    return None

            finally:
                loop.close()

        except Exception as e:
            logger.error(f"Polygon deployment error: {e}")

            # If we have the service, let it handle the error
            if self.polygon_service:
                try:
                    self.polygon_service.error_handler.handle_network_failure(
                        e,
                        {
                            "operation": "deploy_to_polygon_sync",
                            "block_data_size": len(str(block_data)),
                        },
                    )
                except Exception as handler_error:
                    logger.error(f"Error handler failed: {handler_error}")

            return None

    def _record_order_on_contract_sync_with_metadata(
        self, order_id: str, doc_hash: str, cid: str = ""
    ) -> Optional[dict]:
        """Synchronous wrapper for async smart contract order recording with retry metadata"""
        if not self.polygon_service:
            logger.debug("Polygon service not available, skipping contract recording")
            return None

        try:
            # Check if service is in degraded mode
            status = self.polygon_service.get_comprehensive_status()
            if status.get("degradation_active", False):
                logger.info(
                    "Polygon service in degraded mode, skipping contract recording"
                )
                return None

            # Create new event loop for async operation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                # Record order on smart contract (this doesn't have retry built-in yet)
                result: PolygonResult = loop.run_until_complete(
                    self.polygon_service.record_order_on_contract(
                        order_id, doc_hash, cid
                    )
                )

                if result.success and result.transaction:
                    logger.info(
                        f"Successfully recorded order on contract: {result.transaction.tx_hash}"
                    )
                    return {
                        "tx_hash": result.transaction.tx_hash,
                        "retry_count": result.retry_count,
                        "retry_attempts": (
                            result.retry_attempts
                            if hasattr(result, "retry_attempts")
                            else []
                        ),
                    }
                else:
                    logger.warning(f"Contract recording failed: {result.error}")
                    return {
                        "tx_hash": None,
                        "retry_count": result.retry_count,
                        "retry_attempts": (
                            result.retry_attempts
                            if hasattr(result, "retry_attempts")
                            else []
                        ),
                        "error": result.error,
                    }

            finally:
                loop.close()

        except Exception as e:
            logger.error(f"Contract recording error: {e}")

            # If we have the service, let it handle the error
            if self.polygon_service:
                try:
                    self.polygon_service.error_handler.handle_network_failure(
                        e,
                        {
                            "operation": "record_order_on_contract_sync",
                            "order_id": order_id,
                            "doc_hash": (
                                doc_hash[:10] + "..."
                                if len(doc_hash) > 10
                                else doc_hash
                            ),
                        },
                    )
                except Exception as handler_error:
                    logger.error(f"Error handler failed: {handler_error}")

            return {
                "tx_hash": None,
                "retry_count": 0,
                "retry_attempts": [],
                "error": str(e),
            }

    def _record_order_on_contract_sync(
        self, order_id: str, doc_hash: str, cid: str = ""
    ) -> Optional[str]:
        """Synchronous wrapper for async smart contract order recording"""
        if not self.polygon_service:
            logger.debug("Polygon service not available, skipping contract recording")
            return None

        try:
            # Check if service is in degraded mode
            status = self.polygon_service.get_comprehensive_status()
            if status.get("degradation_active", False):
                logger.info(
                    "Polygon service in degraded mode, skipping contract recording"
                )
                return None

            # Create new event loop for async operation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                # Record order on smart contract
                result: PolygonResult = loop.run_until_complete(
                    self.polygon_service.record_order_on_contract(
                        order_id, doc_hash, cid
                    )
                )

                if result.success and result.transaction:
                    logger.info(
                        f"Successfully recorded order on contract: {result.transaction.tx_hash}"
                    )
                    return result.transaction.tx_hash
                else:
                    logger.warning(f"Contract recording failed: {result.error}")
                    return None

            finally:
                loop.close()

        except Exception as e:
            logger.error(f"Contract recording error: {e}")

            # If we have the service, let it handle the error
            if self.polygon_service:
                try:
                    self.polygon_service.error_handler.handle_network_failure(
                        e,
                        {
                            "operation": "record_order_on_contract_sync",
                            "order_id": order_id,
                            "doc_hash": (
                                doc_hash[:10] + "..."
                                if len(doc_hash) > 10
                                else doc_hash
                            ),
                        },
                    )
                except Exception as handler_error:
                    logger.error(f"Error handler failed: {handler_error}")

            return None

    def _monitor_contract_events_sync(
        self, tx_hash: str, order_id: str, timeout: int = 60
    ) -> list:
        """Monitor for OrderNotarized events after contract interaction with timeout"""
        if not self.polygon_service:
            logger.debug("Polygon service not available, skipping event monitoring")
            return []

        try:
            # Import contract utilities for event parsing
            from blockchain.contract_utils import ContractManager
            from blockchain.config import PolygonConfig

            config = PolygonConfig.from_env()
            contract_manager = ContractManager(config)

            # Wait for transaction to be mined and parse events
            import time

            start_time = time.time()
            events = []

            while time.time() - start_time < timeout:
                try:
                    # Try to parse events from the transaction
                    parsed_events = contract_manager.parse_order_notarized_events(
                        tx_hash
                    )

                    if parsed_events:
                        logger.info(
                            f"Found {len(parsed_events)} OrderNotarized events for transaction {tx_hash}"
                        )
                        events = parsed_events
                        break

                    # Wait before retrying
                    time.sleep(2)

                except Exception as e:
                    logger.debug(f"Event parsing attempt failed: {e}")
                    time.sleep(2)
                    continue

            if not events:
                logger.warning(
                    f"No OrderNotarized events found for transaction {tx_hash} within {timeout} seconds"
                )

            return events

        except Exception as e:
            logger.error(f"Contract event monitoring error: {e}")
            return []

    def _store_contract_events(
        self, order_id: str, step_name: str, events: list
    ) -> None:
        """Store contract events in blockchain records"""
        if not events:
            return

        try:
            # Convert events to serializable format
            event_records = []
            for event in events:
                event_record = {
                    "event_name": event.event_name,
                    "order_id_hash": event.args.get("orderIdHash", ""),
                    "doc_hash": event.args.get("docHash", ""),
                    "cid": event.args.get("cid", ""),
                    "sender": event.args.get("sender", ""),
                    "timestamp": event.args.get("timestamp", 0),
                    "transaction_hash": event.transaction_hash,
                    "block_number": event.block_number,
                    "log_index": event.log_index,
                    "event_timestamp": (
                        event.timestamp.isoformat() if event.timestamp else None
                    ),
                }
                event_records.append(event_record)

            # Store events as part of the blockchain record
            event_storage = {
                "order_id": order_id,
                "step_name": step_name,
                "contract_events": event_records,
                "event_count": len(event_records),
                "stored_at": datetime.utcnow().isoformat(),
            }

            # Save events to disk using the existing storage system
            save_step(order_id, f"{step_name}_contract_events", event_storage)

            logger.info(
                f"Stored {len(event_records)} contract events for order {order_id}"
            )

        except Exception as e:
            logger.error(f"Failed to store contract events: {e}")

    def get_contract_events_for_order(self, order_id: str) -> list:
        """Retrieve stored contract events for a specific order"""
        try:
            # Import storage utilities
            from apps.app.storage import load_step

            # Try to load contract events for this order
            events_data = load_step(order_id, f"*_contract_events")

            if events_data and isinstance(events_data, dict):
                return events_data.get("contract_events", [])

            return []

        except Exception as e:
            logger.error(
                f"Failed to retrieve contract events for order {order_id}: {e}"
            )
            return []

    def verify_contract_recording(
        self, order_id: str, expected_doc_hash: str = None
    ) -> dict:
        """Verify that an order was successfully recorded on the contract"""
        if not self.polygon_service:
            return {"verified": False, "error": "Polygon service not available"}

        try:
            # Import contract utilities
            from blockchain.contract_utils import ContractManager
            from blockchain.config import PolygonConfig

            config = PolygonConfig.from_env()
            contract_manager = ContractManager(config)

            # Check if order is notarized on contract
            is_notarized = contract_manager.is_order_notarized(order_id)

            result = {
                "verified": is_notarized,
                "order_id": order_id,
                "contract_address": config.contract_address,
            }

            if is_notarized:
                # Get order record details
                order_record = contract_manager.get_order_record(order_id)
                if order_record:
                    result.update(
                        {
                            "doc_hash": order_record.doc_hash,
                            "cid": order_record.cid,
                            "notarizer": order_record.notarizer,
                            "timestamp": order_record.timestamp,
                        }
                    )

                    # Verify document hash if provided
                    if expected_doc_hash:
                        hash_verified = contract_manager.verify_document_hash(
                            order_id, expected_doc_hash
                        )
                        result["doc_hash_verified"] = hash_verified

            return result

        except Exception as e:
            logger.error(f"Contract verification failed for order {order_id}: {e}")
            return {"verified": False, "error": str(e)}

    def run(
        self,
        context: ToolRunContext,
        step_name: str,
        data: dict,
        order_id: str = "default_order",
    ) -> str:
        # 1. Anchor to local blockchain first
        local_result = anchor_step(step_name, data)
        local_hash = local_result["hash"]

        logger.info(f"Local blockchain anchor created: {local_hash}")

        # 2. Attempt Polygon deployment asynchronously (non-blocking)
        polygon_tx_hash = None
        contract_tx_hash = None
        contract_events = []
        polygon_retry_metadata = {"retry_count": 0, "retry_attempts": []}
        contract_retry_metadata = {"retry_count": 0, "retry_attempts": []}

        try:
            # Prepare block data for Polygon deployment
            block_data = {
                "step_name": step_name,
                "order_id": order_id,
                "data_hash": local_hash,  # Use local hash as data reference
                "timestamp": datetime.utcnow().isoformat(),
                "local_block_data": local_result.get("data", {}),
            }

            # Deploy to Polygon with retry mechanism
            polygon_result = self._deploy_to_polygon_sync_with_metadata(block_data)
            if polygon_result:
                polygon_tx_hash = polygon_result.get("tx_hash")
                polygon_retry_metadata = {
                    "retry_count": polygon_result.get("retry_count", 0),
                    "retry_attempts": polygon_result.get("retry_attempts", []),
                }

            # 3. Record order on smart contract alongside transaction deployment
            contract_result = self._record_order_on_contract_sync_with_metadata(
                order_id, local_hash, step_name
            )
            if contract_result:
                contract_tx_hash = contract_result.get("tx_hash")
                contract_retry_metadata = {
                    "retry_count": contract_result.get("retry_count", 0),
                    "retry_attempts": contract_result.get("retry_attempts", []),
                }

            # 4. Monitor for contract events if contract recording was successful
            contract_events = []
            if contract_tx_hash:
                contract_events = self._monitor_contract_events_sync(
                    contract_tx_hash, order_id
                )
                if contract_events:
                    self._store_contract_events(order_id, step_name, contract_events)

        except Exception as e:
            logger.error(f"Polygon deployment failed: {e}")
            # Continue with local-only operation

        # 6. Build comprehensive record with retry metadata
        record = {
            "step_name": step_name,
            "data": data,
            "order_id": order_id,
            "local_hash": local_hash,
            "polygon_tx_hash": polygon_tx_hash or "pending",
            "contract_tx_hash": contract_tx_hash or "pending",
            "deployment_status": "deployed" if polygon_tx_hash else "local_only",
            "contract_status": "recorded" if contract_tx_hash else "pending",
            "contract_events_count": len(contract_events),
            "timestamp": datetime.utcnow().isoformat(),
            "local_block_data": local_result.get("data", {}),
            "retry_metadata": {
                "polygon_retry_count": polygon_retry_metadata.get("retry_count", 0),
                "polygon_retry_attempts": polygon_retry_metadata.get(
                    "retry_attempts", []
                ),
                "contract_retry_count": contract_retry_metadata.get("retry_count", 0),
                "contract_retry_attempts": contract_retry_metadata.get(
                    "retry_attempts", []
                ),
            },
        }

        # 7. Persist enhanced record to disk
        save_step(order_id, step_name, record)

        # 8. Return combined hash format including contract transaction hash
        if polygon_tx_hash and contract_tx_hash:
            combined_hash = f"{local_hash}:{polygon_tx_hash}:{contract_tx_hash}"
            logger.info(
                f"Blockchain operation complete - Local: {local_hash}, Polygon: {polygon_tx_hash} "
                f"(retries: {polygon_retry_metadata.get('retry_count', 0)}), "
                f"Contract: {contract_tx_hash} (retries: {contract_retry_metadata.get('retry_count', 0)})"
            )
        elif polygon_tx_hash:
            combined_hash = f"{local_hash}:{polygon_tx_hash}:pending"
            logger.info(
                f"Blockchain operation complete - Local: {local_hash}, "
                f"Polygon: {polygon_tx_hash} (retries: {polygon_retry_metadata.get('retry_count', 0)}), "
                f"Contract: pending"
            )
        else:
            combined_hash = f"{local_hash}:pending:pending"
            logger.info(f"Blockchain operation complete - Local only: {local_hash}")
            if polygon_retry_metadata.get("retry_count", 0) > 0:
                logger.info(
                    f"Polygon deployment failed after {polygon_retry_metadata.get('retry_count', 0)} retries"
                )

        return combined_hash

    def get_polygon_service_status(self) -> dict:
        """Get comprehensive status information about the Polygon service"""
        if not self.polygon_service:
            return {
                "available": False,
                "status": "not_initialized",
                "message": "Polygon service not available",
            }

        try:
            # Get comprehensive status including error handling and security
            comprehensive_status = self.polygon_service.get_comprehensive_status()

            # Get basic network info for backward compatibility
            network_info = self.polygon_service.get_network_info()

            return {
                "available": True,
                "status": (
                    "connected" if network_info.get("connected") else "disconnected"
                ),
                "network": network_info.get("network"),
                "balance": network_info.get("account_balance"),
                "latest_block": network_info.get("latest_block"),
                "comprehensive_status": comprehensive_status,
                "degradation_active": comprehensive_status.get(
                    "degradation_active", False
                ),
                "error_handling": comprehensive_status.get("error_handling", {}),
                "security": comprehensive_status.get("security", {}),
            }
        except Exception as e:
            return {"available": True, "status": "error", "message": str(e)}

    def test_network_recovery(self) -> dict:
        """Test network recovery and return results"""
        if not self.polygon_service:
            return {"available": False, "message": "Polygon service not available"}

        try:
            return self.polygon_service.test_network_recovery()
        except Exception as e:
            logger.error(f"Error testing network recovery: {e}")
            return {"recovered": False, "error": str(e)}

    def get_security_audit_summary(self, hours: int = 24) -> dict:
        """Get security audit summary for specified time period"""
        if not self.polygon_service:
            return {"available": False, "message": "Polygon service not available"}

        try:
            return self.polygon_service.security_validator.auditor.get_audit_summary(
                hours
            )
        except Exception as e:
            logger.error(f"Error getting security audit summary: {e}")
            return {"error": str(e)}
