#!/usr/bin/env python3
"""
Contract Interaction Utilities

This module provides utility functions for interacting with the deployed Notary contract,
including order recording, event parsing, and contract address management.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

from web3 import Web3


# Handle different web3 versions for PoA middleware
def get_poa_middleware():
    """Get the appropriate PoA middleware for the current web3 version"""
    try:
        # For web3.py >= 6.0.0
        from web3.middleware import ExtraDataToPOAMiddleware

        return ExtraDataToPOAMiddleware
    except ImportError:
        try:
            # For web3.py < 6.0.0
            from web3.middleware import geth_poa_middleware

            return geth_poa_middleware
        except ImportError:
            try:
                # Fallback for very old versions
                from web3.middleware.geth_poa import geth_poa_middleware

                return geth_poa_middleware
            except ImportError:
                # If all imports fail, return None and handle gracefully
                return None


geth_poa_middleware = get_poa_middleware()
from eth_account import Account

from .config import PolygonConfig
from .polygon_deployment import PolygonDeploymentService, TransactionStatus


logger = logging.getLogger(__name__)


@dataclass
class ContractInfo:
    """Container for contract deployment information"""

    address: str
    abi: List[Dict[str, Any]]
    network: str
    chain_id: int
    deployed_at: int
    deployer_address: str
    transaction_hash: str
    block_number: int


@dataclass
class OrderRecord:
    """Container for order record information"""

    order_id_hash: str
    doc_hash: str
    cid: str
    notarizer: str
    timestamp: int
    exists: bool
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None


@dataclass
class ContractEvent:
    """Container for contract event information"""

    event_name: str
    args: Dict[str, Any]
    transaction_hash: str
    block_number: int
    log_index: int
    timestamp: Optional[datetime] = None


class ContractManager:
    """Manages contract interactions and utilities"""

    def __init__(self, config: PolygonConfig):
        self.config = config
        self.w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        if geth_poa_middleware:
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        else:
            logger.warning("PoA middleware not available - some operations may fail")
        self.account = Account.from_key(config.private_key)

        # Load contract info
        self.contract_info = self._load_contract_info()
        self.contract = self._create_contract_instance()

        logger.info(f"Contract manager initialized for {config.network_name}")

    def _load_contract_info(self) -> Optional[ContractInfo]:
        """Load contract information from deployment artifacts"""
        try:
            contract_json_path = Path(self.config.contract_abi_path)

            if not contract_json_path.exists():
                logger.warning(f"Contract info file not found: {contract_json_path}")
                return None

            with open(contract_json_path, "r") as f:
                contract_data = json.load(f)

            return ContractInfo(
                address=contract_data["contractAddress"],
                abi=contract_data["abi"],
                network=contract_data["network"],
                chain_id=contract_data["chainId"],
                deployed_at=contract_data["deployedAt"],
                deployer_address=contract_data["deployerAddress"],
                transaction_hash=contract_data["transactionHash"],
                block_number=contract_data["blockNumber"],
            )

        except Exception as e:
            logger.error(f"Failed to load contract info: {e}")
            return None

    def _create_contract_instance(self):
        """Create Web3 contract instance"""
        if not self.contract_info:
            logger.error("Cannot create contract instance without contract info")
            return None

        try:
            return self.w3.eth.contract(
                address=self.contract_info.address, abi=self.contract_info.abi
            )
        except Exception as e:
            logger.error(f"Failed to create contract instance: {e}")
            return None

    def validate_contract_address(self, address: str = None) -> bool:
        """Validate that a contract is deployed at the given address"""
        contract_address = address or (
            self.contract_info.address if self.contract_info else None
        )

        if not contract_address:
            logger.error("No contract address provided")
            return False

        try:
            # Check if address format is valid
            if not Web3.is_address(contract_address):
                logger.error(f"Invalid contract address format: {contract_address}")
                return False

            # Check if contract code exists at address
            code = self.w3.eth.get_code(contract_address)
            if len(code) == 0:
                logger.error(f"No contract code found at address: {contract_address}")
                return False

            logger.info(f"Contract validated at address: {contract_address}")
            return True

        except Exception as e:
            logger.error(f"Contract validation failed: {e}")
            return False

    def get_contract_info(self) -> Optional[ContractInfo]:
        """Get contract deployment information"""
        return self.contract_info

    def update_contract_address(self, new_address: str) -> bool:
        """Update the contract address and recreate contract instance"""
        try:
            if not self.validate_contract_address(new_address):
                return False

            # Update config
            self.config.contract_address = new_address

            # Update contract info if it exists
            if self.contract_info:
                self.contract_info.address = new_address

            # Recreate contract instance
            self.contract = self._create_contract_instance()

            logger.info(f"Contract address updated to: {new_address}")
            return True

        except Exception as e:
            logger.error(f"Failed to update contract address: {e}")
            return False

    # Order Recording Methods

    def record_order(
        self, order_id: str, doc_hash: str, cid: str = ""
    ) -> Dict[str, Any]:
        """Record an order on the contract (synchronous version)"""
        if not self.contract:
            return {"success": False, "error": "Contract not initialized"}

        try:
            # Convert order ID to hash
            order_id_hash = Web3.keccak(text=order_id)

            # Convert doc_hash to bytes32 if it's a string
            if isinstance(doc_hash, str):
                doc_hash_bytes = Web3.keccak(text=doc_hash)
            else:
                doc_hash_bytes = doc_hash

            # Get current nonce and gas price
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            gas_price = self.w3.eth.gas_price

            # Estimate gas
            gas_estimate = self.contract.functions.recordOrder(
                order_id_hash, doc_hash_bytes, cid
            ).estimate_gas({"from": self.account.address})

            # Build transaction
            txn = self.contract.functions.recordOrder(
                order_id_hash, doc_hash_bytes, cid
            ).build_transaction(
                {
                    "chainId": self.config.chain_id,
                    "gas": int(gas_estimate * 1.2),
                    "gasPrice": gas_price,
                    "nonce": nonce,
                }
            )

            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                txn, self.config.private_key
            )
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)

            logger.info(f"Order recording transaction sent: {tx_hash.hex()}")

            return {
                "success": True,
                "transaction_hash": tx_hash.hex(),
                "order_id": order_id,
                "order_id_hash": order_id_hash.hex(),
                "doc_hash": doc_hash_bytes.hex(),
                "cid": cid,
            }

        except Exception as e:
            error_msg = f"Failed to record order: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def get_order_record(self, order_id: str) -> Optional[OrderRecord]:
        """Get order record from the contract"""
        if not self.contract:
            logger.error("Contract not initialized")
            return None

        try:
            # Convert order ID to hash
            order_id_hash = Web3.keccak(text=order_id)

            # Call contract function
            result = self.contract.functions.getNotarizedOrder(order_id_hash).call()
            doc_hash, cid, notarizer, timestamp, exists = result

            if not exists:
                logger.info(f"Order not found: {order_id}")
                return None

            return OrderRecord(
                order_id_hash=order_id_hash.hex(),
                doc_hash=doc_hash.hex(),
                cid=cid,
                notarizer=notarizer,
                timestamp=timestamp,
                exists=exists,
            )

        except Exception as e:
            logger.error(f"Failed to get order record: {e}")
            return None

    def is_order_notarized(self, order_id: str) -> bool:
        """Check if an order has been notarized"""
        if not self.contract:
            return False

        try:
            order_id_hash = Web3.keccak(text=order_id)
            return self.contract.functions.isOrderNotarized(order_id_hash).call()
        except Exception as e:
            logger.error(f"Failed to check order notarization: {e}")
            return False

    def verify_document_hash(self, order_id: str, doc_hash: str) -> bool:
        """Verify that a document hash matches the stored hash for an order"""
        if not self.contract:
            return False

        try:
            order_id_hash = Web3.keccak(text=order_id)

            # Convert doc_hash to bytes32 if it's a string
            if isinstance(doc_hash, str):
                doc_hash_bytes = Web3.keccak(text=doc_hash)
            else:
                doc_hash_bytes = doc_hash

            return self.contract.functions.verifyDocumentHash(
                order_id_hash, doc_hash_bytes
            ).call()

        except Exception as e:
            logger.error(f"Failed to verify document hash: {e}")
            return False

    def get_total_notarized_orders(self) -> int:
        """Get the total number of notarized orders"""
        if not self.contract:
            return 0

        try:
            return self.contract.functions.getTotalNotarizedOrders().call()
        except Exception as e:
            logger.error(f"Failed to get total notarized orders: {e}")
            return 0

    # Event Parsing Methods

    def parse_order_notarized_events(self, tx_hash: str) -> List[ContractEvent]:
        """Parse OrderNotarized events from a transaction"""
        if not self.contract:
            return []

        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            if not receipt:
                logger.warning(f"Transaction receipt not found: {tx_hash}")
                return []

            events = []
            for log in receipt.logs:
                try:
                    # Try to decode the log as an OrderNotarized event
                    decoded_log = self.contract.events.OrderNotarized().process_log(log)

                    event = ContractEvent(
                        event_name="OrderNotarized",
                        args={
                            "orderIdHash": decoded_log.args.orderIdHash.hex(),
                            "docHash": decoded_log.args.docHash.hex(),
                            "cid": decoded_log.args.cid,
                            "sender": decoded_log.args.sender,
                            "timestamp": decoded_log.args.timestamp,
                        },
                        transaction_hash=decoded_log.transactionHash.hex(),
                        block_number=decoded_log.blockNumber,
                        log_index=decoded_log.logIndex,
                        timestamp=datetime.fromtimestamp(decoded_log.args.timestamp),
                    )

                    events.append(event)

                except Exception:
                    # Log might not be from our contract or not an OrderNotarized event
                    continue

            logger.info(
                f"Parsed {len(events)} OrderNotarized events from transaction {tx_hash}"
            )
            return events

        except Exception as e:
            logger.error(f"Failed to parse events from transaction {tx_hash}: {e}")
            return []

    def get_events_by_order_id(
        self, order_id: str, from_block: int = 0
    ) -> List[ContractEvent]:
        """Get all events for a specific order ID"""
        if not self.contract:
            return []

        try:
            order_id_hash = Web3.keccak(text=order_id)

            # Create event filter for this specific order
            event_filter = self.contract.events.OrderNotarized.create_filter(
                fromBlock=from_block,
                toBlock="latest",
                argument_filters={"orderIdHash": order_id_hash},
            )

            events = []
            for event in event_filter.get_all_entries():
                contract_event = ContractEvent(
                    event_name="OrderNotarized",
                    args={
                        "orderIdHash": event.args.orderIdHash.hex(),
                        "docHash": event.args.docHash.hex(),
                        "cid": event.args.cid,
                        "sender": event.args.sender,
                        "timestamp": event.args.timestamp,
                    },
                    transaction_hash=event.transactionHash.hex(),
                    block_number=event.blockNumber,
                    log_index=event.logIndex,
                    timestamp=datetime.fromtimestamp(event.args.timestamp),
                )
                events.append(contract_event)

            logger.info(f"Found {len(events)} events for order ID: {order_id}")
            return events

        except Exception as e:
            logger.error(f"Failed to get events for order ID {order_id}: {e}")
            return []

    def get_recent_events(self, block_count: int = 1000) -> List[ContractEvent]:
        """Get recent OrderNotarized events"""
        if not self.contract:
            return []

        try:
            latest_block = self.w3.eth.block_number
            from_block = max(0, latest_block - block_count)

            event_filter = self.contract.events.OrderNotarized.create_filter(
                fromBlock=from_block, toBlock="latest"
            )

            events = []
            for event in event_filter.get_all_entries():
                contract_event = ContractEvent(
                    event_name="OrderNotarized",
                    args={
                        "orderIdHash": event.args.orderIdHash.hex(),
                        "docHash": event.args.docHash.hex(),
                        "cid": event.args.cid,
                        "sender": event.args.sender,
                        "timestamp": event.args.timestamp,
                    },
                    transaction_hash=event.transactionHash.hex(),
                    block_number=event.blockNumber,
                    log_index=event.logIndex,
                    timestamp=datetime.fromtimestamp(event.args.timestamp),
                )
                events.append(contract_event)

            # Sort by block number and log index
            events.sort(key=lambda x: (x.block_number, x.log_index))

            logger.info(
                f"Retrieved {len(events)} recent events from last {block_count} blocks"
            )
            return events

        except Exception as e:
            logger.error(f"Failed to get recent events: {e}")
            return []

    # Testing and Validation Methods

    def test_contract_interaction(self) -> Dict[str, Any]:
        """Test contract interaction with a sample order"""
        test_results = {
            "contract_validation": False,
            "order_recording": False,
            "order_retrieval": False,
            "event_parsing": False,
            "overall_success": False,
            "details": {},
        }

        try:
            # Test 1: Contract validation
            if self.validate_contract_address():
                test_results["contract_validation"] = True
                test_results["details"]["contract_address"] = (
                    self.contract_info.address if self.contract_info else "Unknown"
                )

            # Test 2: Order recording
            test_order_id = f"test_order_{int(datetime.now().timestamp())}"
            test_doc_hash = "test_document_content"
            test_cid = "QmTestCID123"

            record_result = self.record_order(test_order_id, test_doc_hash, test_cid)
            if record_result["success"]:
                test_results["order_recording"] = True
                test_results["details"]["test_transaction"] = record_result[
                    "transaction_hash"
                ]

                # Wait a moment for transaction to be mined
                import time

                time.sleep(5)

                # Test 3: Order retrieval
                order_record = self.get_order_record(test_order_id)
                if order_record and order_record.exists:
                    test_results["order_retrieval"] = True
                    test_results["details"]["retrieved_order"] = {
                        "cid": order_record.cid,
                        "notarizer": order_record.notarizer,
                        "timestamp": order_record.timestamp,
                    }

                # Test 4: Event parsing
                events = self.parse_order_notarized_events(
                    record_result["transaction_hash"]
                )
                if events:
                    test_results["event_parsing"] = True
                    test_results["details"]["parsed_events"] = len(events)

            # Overall success
            test_results["overall_success"] = all(
                [
                    test_results["contract_validation"],
                    test_results["order_recording"],
                    test_results["order_retrieval"],
                    test_results["event_parsing"],
                ]
            )

            logger.info(
                f"Contract interaction test completed. Success: {test_results['overall_success']}"
            )
            return test_results

        except Exception as e:
            logger.error(f"Contract interaction test failed: {e}")
            test_results["details"]["error"] = str(e)
            return test_results

    def get_contract_statistics(self) -> Dict[str, Any]:
        """Get contract usage statistics"""
        try:
            stats = {
                "total_notarized_orders": self.get_total_notarized_orders(),
                "contract_address": (
                    self.contract_info.address if self.contract_info else None
                ),
                "network": self.config.network_name,
                "chain_id": self.config.chain_id,
                "deployment_info": None,
            }

            if self.contract_info:
                stats["deployment_info"] = {
                    "deployed_at": datetime.fromtimestamp(
                        self.contract_info.deployed_at
                    ).isoformat(),
                    "deployer_address": self.contract_info.deployer_address,
                    "deployment_transaction": self.contract_info.transaction_hash,
                    "deployment_block": self.contract_info.block_number,
                }

            # Get recent activity
            recent_events = self.get_recent_events(block_count=1000)
            stats["recent_activity"] = {
                "events_last_1000_blocks": len(recent_events),
                "latest_event_block": (
                    max([e.block_number for e in recent_events])
                    if recent_events
                    else None
                ),
            }

            return stats

        except Exception as e:
            logger.error(f"Failed to get contract statistics: {e}")
            return {"error": str(e)}


# Utility Functions


def create_contract_manager(config: PolygonConfig = None) -> ContractManager:
    """Create a contract manager instance with configuration"""
    if config is None:
        config = PolygonConfig.from_env()

    return ContractManager(config)


def validate_contract_deployment(
    contract_address: str, config: PolygonConfig = None
) -> bool:
    """Standalone function to validate contract deployment"""
    if config is None:
        config = PolygonConfig.from_env()

    manager = ContractManager(config)
    return manager.validate_contract_address(contract_address)


def get_order_info(
    order_id: str, config: PolygonConfig = None
) -> Optional[OrderRecord]:
    """Standalone function to get order information"""
    if config is None:
        config = PolygonConfig.from_env()

    manager = ContractManager(config)
    return manager.get_order_record(order_id)


def record_order_simple(
    order_id: str, doc_hash: str, cid: str = "", config: PolygonConfig = None
) -> Dict[str, Any]:
    """Standalone function to record an order"""
    if config is None:
        config = PolygonConfig.from_env()

    manager = ContractManager(config)
    return manager.record_order(order_id, doc_hash, cid)


# Event monitoring utilities


class EventMonitor:
    """Monitor contract events in real-time"""

    def __init__(self, contract_manager: ContractManager):
        self.contract_manager = contract_manager
        self.is_monitoring = False

    def start_monitoring(self, callback=None, poll_interval: int = 10):
        """Start monitoring for new events"""
        if not self.contract_manager.contract:
            logger.error("Cannot start monitoring without contract instance")
            return

        self.is_monitoring = True
        latest_block = self.contract_manager.w3.eth.block_number

        logger.info(f"Starting event monitoring from block {latest_block}")

        while self.is_monitoring:
            try:
                current_block = self.contract_manager.w3.eth.block_number

                if current_block > latest_block:
                    # Check for new events
                    events = self.contract_manager.get_recent_events(
                        block_count=current_block - latest_block
                    )

                    if events and callback:
                        callback(events)

                    latest_block = current_block

                import time

                time.sleep(poll_interval)

            except Exception as e:
                logger.error(f"Event monitoring error: {e}")
                import time

                time.sleep(poll_interval)

    def stop_monitoring(self):
        """Stop event monitoring"""
        self.is_monitoring = False
        logger.info("Event monitoring stopped")


if __name__ == "__main__":
    # Example usage
    config = PolygonConfig.from_env()
    manager = create_contract_manager(config)

    # Test contract interaction
    test_results = manager.test_contract_interaction()
    print(f"Contract interaction test results: {test_results}")

    # Get contract statistics
    stats = manager.get_contract_statistics()
    print(f"Contract statistics: {stats}")
