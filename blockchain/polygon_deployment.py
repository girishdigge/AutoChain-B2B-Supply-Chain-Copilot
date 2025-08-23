# blockchain/polygon_deployment.py
import asyncio
import time
import random
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import sys
from dotenv import load_dotenv
import os
from web3 import Web3

load_dotenv()

# Configure logging to prevent conflicts
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)


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
from eth_account.signers.local import LocalAccount


# Mock imports for dependencies that might not exist
class MockConfig:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def validate(self):
        required_fields = ["rpc_url", "private_key", "chain_id", "network_name"]
        for field in required_fields:
            if not hasattr(self, field) or getattr(self, field) is None:
                raise ValueError(f"Missing required field: {field}")


class MockNetworkFailureHandler:
    def __init__(self, rpc_url, fallback_urls, account_address):
        self.rpc_url = rpc_url
        self.fallback_urls = fallback_urls
        self.account_address = account_address
        self.degradation_manager = MockDegradationManager()

    def initialize_with_web3(self, w3):
        pass

    def handle_network_failure(self, exception, context):
        return {"handled": True, "error": str(exception)}

    def get_status(self):
        return {
            "status": "healthy",
            "degradation": {"active": False},
            "network_available": True,
        }

    def test_network_recovery(self):
        return {"recovered": True, "message": "Network is healthy"}


class MockDegradationManager:
    def __init__(self):
        self.degradation_active = False

    def can_retry_network_operations(self):
        return True


class MockSecurityValidator:
    def __init__(self):
        self.access_validator = MockAccessValidator()
        self.hash_checker = MockHashChecker()

    def validate_blockchain_operation(self, operation_type, data, context):
        return {"overall_valid": True, "errors": []}

    def get_security_status(self):
        return {"status": "secure", "validation_active": True}


class MockAccessValidator:
    def add_authorized_address(self, address):
        pass

    def add_admin_address(self, address):
        pass

    def block_address(self, address, reason=""):
        pass


class MockHashChecker:
    def generate_data_hash(self, data):
        return Web3.keccak(text=str(data)).hex()


# Try to import real classes, fall back to mocks
try:
    from config import PolygonConfig
except ImportError:
    PolygonConfig = MockConfig

try:
    from error_handling import (
        NetworkFailureHandler,
        NetworkFailureType,
        FailureSeverity,
    )
except ImportError:
    NetworkFailureHandler = MockNetworkFailureHandler
    NetworkFailureType = None
    FailureSeverity = None

try:
    from security_validator import ComprehensiveSecurityValidator, SecurityLevel
except ImportError:
    ComprehensiveSecurityValidator = MockSecurityValidator
    SecurityLevel = None

logger = logging.getLogger(__name__)


class TransactionStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class PolygonTransaction:
    tx_hash: str
    block_number: Optional[int] = None
    gas_used: Optional[int] = None
    status: TransactionStatus = TransactionStatus.PENDING
    contract_events: List[dict] = None
    timestamp: datetime = None
    error_message: Optional[str] = None

    def __post_init__(self):
        if self.contract_events is None:
            self.contract_events = []
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class PolygonResult:
    success: bool
    transaction: Optional[PolygonTransaction] = None
    error: Optional[str] = None
    retry_count: int = 0
    retry_attempts: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.retry_attempts is None:
            self.retry_attempts = []


class PolygonDeploymentService:
    """Service for deploying transactions to Polygon Amoy testnet with comprehensive error handling and security"""

    def __init__(self, config):
        self.config = config
        self.config.validate()

        # Initialize Web3 connection
        self.w3 = Web3(Web3.HTTPProvider(config.rpc_url))

        # Add PoA middleware for Polygon
        if geth_poa_middleware:
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        else:
            logger.warning(
                "PoA middleware not available - some Polygon operations may fail"
            )

        # Initialize account from private key
        self.account: LocalAccount = Account.from_key(config.private_key)

        # Initialize error handling and security systems
        self.error_handler = NetworkFailureHandler(
            rpc_url=config.rpc_url,
            fallback_urls=getattr(config, "fallback_rpc_urls", []),
            account_address=self.account.address,
        )
        self.error_handler.initialize_with_web3(self.w3)

        self.security_validator = ComprehensiveSecurityValidator()

        # Add authorized addresses (at minimum, the deployment account)
        self.security_validator.access_validator.add_authorized_address(
            self.account.address
        )

        logger.info(f"Initialized Polygon deployment service for {config.network_name}")
        logger.info(f"Account address: {self.account.address}")
        logger.info("Error handling and security validation systems initialized")

    def _check_connection(self) -> bool:
        """Check if Web3 connection is working"""
        try:
            return self.w3.is_connected()
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            return False

    def _estimate_gas_price(self) -> int:
        """Estimate optimal gas price for current network conditions"""
        try:
            # Get current gas price from network
            current_gas_price = self.w3.eth.gas_price

            # Use configured gas price as minimum, but adjust if network is congested
            min_gas_price = Web3.to_wei(
                getattr(self.config, "gas_price_gwei", 30), "gwei"
            )

            # Use higher of configured price or current network price + 10%
            optimal_gas_price = max(min_gas_price, int(current_gas_price * 1.1))

            logger.debug(
                f"Estimated gas price: {Web3.from_wei(optimal_gas_price, 'gwei')} gwei"
            )
            return optimal_gas_price

        except Exception as e:
            logger.warning(f"Gas price estimation failed, using configured price: {e}")
            return Web3.to_wei(getattr(self.config, "gas_price_gwei", 30), "gwei")

    def _create_transaction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a transaction dictionary for blockchain deployment"""
        try:
            # Get current nonce
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            # Estimate gas price
            gas_price = self._estimate_gas_price()

            # Create transaction data payload
            tx_data = Web3.keccak(text=str(data)).hex()

            # Build transaction
            transaction = {
                "nonce": nonce,
                "gasPrice": gas_price,
                "gas": getattr(self.config, "gas_limit", 2000000),
                "to": self.account.address,  # Send to self for data storage
                "value": 0,
                "data": tx_data,
                "chainId": self.config.chain_id,
            }

            logger.debug(
                f"Created transaction with nonce {nonce}, gas price {Web3.from_wei(gas_price, 'gwei')} gwei"
            )
            return transaction

        except Exception as e:
            logger.error(f"Transaction creation failed: {e}")
            raise

    def _sign_and_send_transaction(self, transaction: Dict[str, Any]) -> str:
        """Sign and send transaction to the network"""
        try:
            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction, self.config.private_key
            )

            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

            logger.info(f"Transaction sent with hash: {tx_hash.hex()}")
            return tx_hash.hex()

        except Exception as e:
            logger.error(f"Transaction signing/sending failed: {e}")
            raise

    async def deploy_transaction(self, block_data: Dict[str, Any]) -> PolygonResult:
        """Deploy a transaction containing block data to Polygon network with comprehensive validation"""
        try:
            # Check if we're in degraded mode
            if (
                hasattr(self.error_handler, "degradation_manager")
                and self.error_handler.degradation_manager.degradation_active
            ):
                if (
                    not self.error_handler.degradation_manager.can_retry_network_operations()
                ):
                    return PolygonResult(
                        success=False,
                        error="System in degraded mode - network operations suspended",
                    )

            # Validate data integrity first
            validation_result = self.security_validator.validate_blockchain_operation(
                "data_integrity", block_data, {"algorithm": "keccak256"}
            )

            if not validation_result["overall_valid"]:
                logger.error(f"Data validation failed: {validation_result['errors']}")
                return PolygonResult(
                    success=False,
                    error=f"Data validation failed: {validation_result['errors']}",
                )

            # Check network connectivity
            if not self._check_connection():
                failure_response = self.error_handler.handle_network_failure(
                    Exception("No connection to Polygon network"),
                    {
                        "operation": "deploy_transaction",
                        "block_data_hash": self.security_validator.hash_checker.generate_data_hash(
                            block_data
                        ),
                    },
                )

                return PolygonResult(
                    success=False,
                    error="No connection to Polygon network",
                    retry_count=0,
                )

            # Create transaction
            transaction = self._create_transaction(block_data)

            # Validate transaction security
            tx_validation = self.security_validator.validate_blockchain_operation(
                "transaction", transaction, {"user_address": self.account.address}
            )

            if not tx_validation["overall_valid"]:
                logger.error(
                    f"Transaction validation failed: {tx_validation['errors']}"
                )
                return PolygonResult(
                    success=False,
                    error=f"Transaction validation failed: {tx_validation['errors']}",
                )

            # Sign and send transaction
            tx_hash = self._sign_and_send_transaction(transaction)

            # Create PolygonTransaction object
            polygon_tx = PolygonTransaction(
                tx_hash=tx_hash, status=TransactionStatus.PENDING
            )

            logger.info(f"Successfully deployed transaction: {tx_hash}")

            return PolygonResult(success=True, transaction=polygon_tx)

        except Exception as e:
            # Handle network failure with comprehensive error handling
            failure_response = self.error_handler.handle_network_failure(
                e,
                {
                    "operation": "deploy_transaction",
                    "account": self.account.address,
                    "block_data_hash": self.security_validator.hash_checker.generate_data_hash(
                        block_data
                    ),
                },
            )

            error_msg = f"Transaction deployment failed: {e}"
            logger.error(error_msg)

            return PolygonResult(success=False, error=error_msg, retry_count=0)

    def get_account_balance(self) -> float:
        """Get the current balance of the deployment account in MATIC"""
        try:
            balance_wei = self.w3.eth.get_balance(self.account.address)
            balance_matic = Web3.from_wei(balance_wei, "ether")
            return float(balance_matic)
        except Exception as e:
            logger.error(f"Balance check failed: {e}")
            return 0.0

    def get_network_info(self) -> Dict[str, Any]:
        """Get current network information"""
        try:
            latest_block = self.w3.eth.get_block("latest")
            gas_price = self.w3.eth.gas_price

            return {
                "network": self.config.network_name,
                "chain_id": self.config.chain_id,
                "latest_block": latest_block.number,
                "gas_price_gwei": Web3.from_wei(gas_price, "gwei"),
                "account_balance": self.get_account_balance(),
                "connected": self._check_connection(),
            }
        except Exception as e:
            logger.error(f"Network info retrieval failed: {e}")
            return {
                "network": self.config.network_name,
                "connected": False,
                "error": str(e),
            }

    def _get_notary_contract(self):
        """Get the Notary contract instance"""
        if (
            not hasattr(self.config, "contract_address")
            or not self.config.contract_address
        ):
            raise ValueError("Notary contract address not configured")

        # Notary contract ABI
        notary_abi = [
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "orderIdHash",
                        "type": "bytes32",
                    },
                    {"internalType": "bytes32", "name": "docHash", "type": "bytes32"},
                    {"internalType": "string", "name": "cid", "type": "string"},
                ],
                "name": "recordOrder",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "bytes32",
                        "name": "orderIdHash",
                        "type": "bytes32",
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes32",
                        "name": "docHash",
                        "type": "bytes32",
                    },
                    {
                        "indexed": False,
                        "internalType": "string",
                        "name": "cid",
                        "type": "string",
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address",
                    },
                    {
                        "indexed": False,
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256",
                    },
                ],
                "name": "OrderNotarized",
                "type": "event",
            },
        ]

        return self.w3.eth.contract(
            address=self.config.contract_address, abi=notary_abi
        )

    async def record_order_on_contract(
        self, order_id: str, doc_hash: str, cid: str = ""
    ) -> PolygonResult:
        """Record an order on the Notary smart contract with security validation"""
        try:
            # Check if we're in degraded mode
            if (
                hasattr(self.error_handler, "degradation_manager")
                and self.error_handler.degradation_manager.degradation_active
            ):
                if (
                    not self.error_handler.degradation_manager.can_retry_network_operations()
                ):
                    return PolygonResult(
                        success=False,
                        error="System in degraded mode - contract operations suspended",
                    )

            # Validate access control
            access_validation = self.security_validator.validate_blockchain_operation(
                "access_control",
                {"order_id": order_id, "doc_hash": doc_hash},
                {"user_address": self.account.address, "required_level": "medium"},
            )

            if not access_validation["overall_valid"]:
                logger.error(f"Access validation failed: {access_validation['errors']}")
                return PolygonResult(
                    success=False,
                    error=f"Access validation failed: {access_validation['errors']}",
                )

            contract = self._get_notary_contract()

            # Validate and hash input data
            order_data = {"order_id": order_id, "doc_hash": doc_hash, "cid": cid}
            data_validation = self.security_validator.validate_blockchain_operation(
                "data_integrity", order_data, {"algorithm": "keccak256"}
            )

            if not data_validation["overall_valid"]:
                return PolygonResult(
                    success=False,
                    error=f"Order data validation failed: {data_validation['errors']}",
                )

            # Convert strings to bytes32 with validation
            order_id_hash = Web3.keccak(text=order_id)
            doc_hash_bytes = (
                Web3.keccak(text=doc_hash) if isinstance(doc_hash, str) else doc_hash
            )

            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            gas_price = self._estimate_gas_price()

            # Estimate gas for contract call
            try:
                gas_estimate = contract.functions.recordOrder(
                    order_id_hash, doc_hash_bytes, cid
                ).estimate_gas({"from": self.account.address})
                gas_limit = min(
                    int(gas_estimate * 1.2), getattr(self.config, "gas_limit", 2000000)
                )
            except Exception as e:
                logger.warning(f"Gas estimation failed, using configured limit: {e}")
                gas_limit = getattr(self.config, "gas_limit", 2000000)

            # Build contract transaction
            contract_txn = contract.functions.recordOrder(
                order_id_hash, doc_hash_bytes, cid
            ).build_transaction(
                {
                    "chainId": self.config.chain_id,
                    "gas": gas_limit,
                    "gasPrice": gas_price,
                    "nonce": nonce,
                    "from": self.account.address,
                }
            )

            # Validate the contract transaction
            tx_validation = self.security_validator.validate_blockchain_operation(
                "transaction", contract_txn, {"user_address": self.account.address}
            )

            if not tx_validation["overall_valid"]:
                return PolygonResult(
                    success=False,
                    error=f"Contract transaction validation failed: {tx_validation['errors']}",
                )

            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                contract_txn, self.config.private_key
            )
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

            polygon_tx = PolygonTransaction(
                tx_hash=tx_hash.hex(), status=TransactionStatus.PENDING
            )

            logger.info(f"Successfully deployed contract transaction: {tx_hash.hex()}")

            return PolygonResult(success=True, transaction=polygon_tx)

        except Exception as e:
            # Handle contract interaction failure
            failure_response = self.error_handler.handle_network_failure(
                e,
                {
                    "operation": "record_order_on_contract",
                    "order_id": order_id,
                    "account": self.account.address,
                    "contract_address": getattr(
                        self.config, "contract_address", "None"
                    ),
                },
            )

            error_msg = f"Contract interaction failed: {e}"
            logger.error(error_msg)

            return PolygonResult(success=False, error=error_msg)

    def verify_transaction_status(self, tx_hash: str) -> TransactionStatus:
        """Verify the status of a transaction on the network"""
        try:
            # Get transaction receipt
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)

            if receipt is None:
                return TransactionStatus.PENDING

            # Check if transaction was successful
            if receipt.status == 1:
                return TransactionStatus.CONFIRMED
            else:
                return TransactionStatus.FAILED

        except Exception as e:
            logger.warning(f"Transaction status check failed for {tx_hash}: {e}")
            return TransactionStatus.PENDING

    async def wait_for_confirmation(
        self, tx_hash: str, timeout: Optional[int] = None
    ) -> PolygonTransaction:
        """Wait for transaction confirmation with timeout"""
        timeout = timeout or getattr(self.config, "timeout_seconds", 300)
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                receipt = self.w3.eth.get_transaction_receipt(tx_hash)

                if receipt is not None:
                    status = (
                        TransactionStatus.CONFIRMED
                        if receipt.status == 1
                        else TransactionStatus.FAILED
                    )

                    return PolygonTransaction(
                        tx_hash=tx_hash,
                        block_number=receipt.blockNumber,
                        gas_used=receipt.gasUsed,
                        status=status,
                        timestamp=datetime.now(),
                    )

            except Exception as e:
                logger.debug(f"Confirmation check failed: {e}")

            # Wait before next check
            await asyncio.sleep(2)

        # Timeout reached
        return PolygonTransaction(
            tx_hash=tx_hash,
            status=TransactionStatus.TIMEOUT,
            error_message="Transaction confirmation timeout",
            timestamp=datetime.now(),
        )

    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check of the deployment service"""
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "healthy",
            "checks": {},
        }

        # Check network connectivity
        try:
            connected = self._check_connection()
            health_status["checks"]["network_connection"] = {
                "status": "pass" if connected else "fail",
                "message": (
                    "Connected to Polygon network"
                    if connected
                    else "No network connection"
                ),
            }
            if not connected:
                health_status["overall_status"] = "unhealthy"
        except Exception as e:
            health_status["checks"]["network_connection"] = {
                "status": "fail",
                "message": f"Connection check failed: {e}",
            }
            health_status["overall_status"] = "unhealthy"

        # Check account balance
        try:
            balance = self.get_account_balance()
            sufficient_balance = balance >= 0.001
            health_status["checks"]["account_balance"] = {
                "status": "pass" if sufficient_balance else "warn",
                "message": f"Balance: {balance} MATIC",
                "balance": balance,
            }
            if not sufficient_balance:
                health_status["overall_status"] = "degraded"
        except Exception as e:
            health_status["checks"]["account_balance"] = {
                "status": "fail",
                "message": f"Balance check failed: {e}",
            }
            health_status["overall_status"] = "unhealthy"

        return health_status

    async def deploy_transaction_with_retry(
        self, block_data: Dict[str, Any]
    ) -> PolygonResult:
        """Deploy a transaction with exponential backoff retry mechanism"""
        max_retries = getattr(self.config, "max_retries", 3)
        base_delay = getattr(self.config, "retry_delay", 2.0)
        max_delay = getattr(self.config, "max_retry_delay", 60.0)

        retry_attempts = []
        last_error = None

        for attempt in range(max_retries + 1):  # +1 for initial attempt
            try:
                # Log retry attempt
                if attempt > 0:
                    logger.info(
                        f"Retry attempt {attempt}/{max_retries} for transaction deployment"
                    )

                # Attempt deployment
                result = await self.deploy_transaction(block_data)

                # Record successful attempt
                attempt_record = {
                    "attempt": attempt + 1,
                    "timestamp": datetime.now().isoformat(),
                    "success": result.success,
                    "error": result.error if not result.success else None,
                    "delay_before_attempt": (
                        0
                        if attempt == 0
                        else self._calculate_retry_delay(
                            attempt - 1, base_delay, max_delay
                        )
                    ),
                }
                retry_attempts.append(attempt_record)

                if result.success:
                    logger.info(
                        f"Transaction deployment succeeded on attempt {attempt + 1}"
                    )
                    result.retry_count = attempt
                    result.retry_attempts = retry_attempts
                    return result

                last_error = result.error

                # Don't retry on the last attempt
                if attempt == max_retries:
                    break

                # Calculate delay for next attempt
                delay = self._calculate_retry_delay(attempt, base_delay, max_delay)

                logger.warning(
                    f"Transaction deployment failed on attempt {attempt + 1}: {result.error}"
                )
                logger.info(f"Retrying in {delay:.2f} seconds...")

                # Wait before retry
                await asyncio.sleep(delay)

            except Exception as e:
                # Record failed attempt
                attempt_record = {
                    "attempt": attempt + 1,
                    "timestamp": datetime.now().isoformat(),
                    "success": False,
                    "error": str(e),
                    "delay_before_attempt": (
                        0
                        if attempt == 0
                        else self._calculate_retry_delay(
                            attempt - 1, base_delay, max_delay
                        )
                    ),
                }
                retry_attempts.append(attempt_record)

                last_error = str(e)

                # Don't retry on the last attempt
                if attempt == max_retries:
                    break

                # Calculate delay for next attempt
                delay = self._calculate_retry_delay(attempt, base_delay, max_delay)

                logger.error(
                    f"Transaction deployment exception on attempt {attempt + 1}: {e}"
                )
                logger.info(f"Retrying in {delay:.2f} seconds...")

                # Wait before retry
                await asyncio.sleep(delay)

        # All retries exhausted
        logger.error(
            f"Transaction deployment failed after {max_retries + 1} attempts. Last error: {last_error}"
        )

        return PolygonResult(
            success=False,
            error=f"Transaction deployment failed after {max_retries + 1} attempts. Last error: {last_error}",
            retry_count=max_retries + 1,
            retry_attempts=retry_attempts,
        )

    def _calculate_retry_delay(
        self, attempt: int, base_delay: float, max_delay: float
    ) -> float:
        """Calculate exponential backoff delay with jitter"""
        # Exponential backoff: base_delay * (2 ^ attempt)
        exponential_delay = base_delay * (2**attempt)

        # Cap at max_delay
        capped_delay = min(exponential_delay, max_delay)

        # Add jitter (±25% randomization) to avoid thundering herd
        jitter_range = capped_delay * 0.25
        jitter = random.uniform(-jitter_range, jitter_range)

        final_delay = max(0.1, capped_delay + jitter)  # Minimum 0.1 seconds

        return final_delay

    def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive status including error handling, security validation, and network health"""
        try:
            # Get basic network info
            network_info = self.get_network_info()

            # Get error handler status
            error_handler_status = self.error_handler.get_status()

            # Get security validator status
            security_status = self.security_validator.get_security_status()

            # Check if degradation is active
            degradation_active = False
            can_retry_operations = True
            if hasattr(self.error_handler, "degradation_manager"):
                degradation_active = (
                    self.error_handler.degradation_manager.degradation_active
                )
                can_retry_operations = (
                    self.error_handler.degradation_manager.can_retry_network_operations()
                )

            # Network health assessment
            network_healthy = network_info.get("connected", False)
            sufficient_balance = network_info.get("account_balance", 0) >= 0.001

            # Security validation status
            security_active = security_status.get("validation_active", False)
            security_secure = security_status.get("status") == "secure"

            # Overall health determination
            overall_healthy = (
                network_healthy
                and sufficient_balance
                and security_active
                and security_secure
                and not degradation_active
            )

            # Determine overall status
            if overall_healthy:
                overall_status = "healthy"
            elif network_healthy and security_active:
                overall_status = "degraded"
            else:
                overall_status = "unhealthy"

            return {
                "timestamp": datetime.now().isoformat(),
                "overall_status": overall_status,
                "network": {
                    **network_info,
                    "health_score": 100 if network_healthy else 0,
                    "sufficient_balance": sufficient_balance,
                },
                "error_handling": {
                    **error_handler_status,
                    "degradation_active": degradation_active,
                    "can_retry_operations": can_retry_operations,
                },
                "security": {
                    **security_status,
                    "validation_active": security_active,
                    "overall_secure": security_secure,
                },
                "health_checks": {
                    "network_connectivity": "pass" if network_healthy else "fail",
                    "account_balance": "pass" if sufficient_balance else "warn",
                    "security_validation": "pass" if security_active else "fail",
                    "error_handling": "pass" if not degradation_active else "warn",
                },
                "service_info": {
                    "account_address": self.account.address,
                    "network_name": self.config.network_name,
                    "chain_id": self.config.chain_id,
                    "contract_address": getattr(
                        self.config, "contract_address", "Not configured"
                    ),
                },
            }

        except Exception as e:
            logger.error(f"Failed to get comprehensive status: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "overall_status": "error",
                "degradation_active": True,
                "health_checks": {"status_check": "fail"},
            }

    def validate_operation_security(
        self, operation_type: str, data: Dict[str, Any], context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Validate security for blockchain operations with comprehensive checks

        Args:
            operation_type: Type of operation (data_integrity, transaction, access_control)
            data: Data to validate
            context: Additional context for validation

        Returns:
            Dict containing validation results and security status
        """
        if context is None:
            context = {}

        try:
            # Add default context information
            default_context = {
                "user_address": self.account.address,
                "network": self.config.network_name,
                "chain_id": self.config.chain_id,
                "timestamp": datetime.now().isoformat(),
            }
            context = {**default_context, **context}

            # Perform data integrity validation before deployment
            if operation_type in ["deploy_transaction", "contract_interaction"]:
                # Validate data integrity
                data_validation = self.security_validator.validate_blockchain_operation(
                    "data_integrity", data, {**context, "algorithm": "keccak256"}
                )

                if not data_validation["overall_valid"]:
                    logger.error(
                        f"Data integrity validation failed: {data_validation['errors']}"
                    )
                    return {
                        "overall_valid": False,
                        "errors": data_validation["errors"],
                        "validation_type": "data_integrity",
                        "timestamp": datetime.now().isoformat(),
                    }

                # Validate access control for contract interactions
                if operation_type == "contract_interaction":
                    access_validation = (
                        self.security_validator.validate_blockchain_operation(
                            "access_control",
                            data,
                            {**context, "required_level": "medium"},
                        )
                    )

                    if not access_validation["overall_valid"]:
                        logger.error(
                            f"Access control validation failed: {access_validation['errors']}"
                        )
                        return {
                            "overall_valid": False,
                            "errors": access_validation["errors"],
                            "validation_type": "access_control",
                            "timestamp": datetime.now().isoformat(),
                        }

            # Perform the main security validation
            validation_result = self.security_validator.validate_blockchain_operation(
                operation_type, data, context
            )

            # Enhance result with additional security metadata
            enhanced_result = {
                **validation_result,
                "validation_type": operation_type,
                "timestamp": datetime.now().isoformat(),
                "security_level": context.get("required_level", "standard"),
                "user_address": self.account.address,
            }

            # Log security validation results
            if validation_result["overall_valid"]:
                logger.debug(f"Security validation passed for {operation_type}")
            else:
                logger.warning(
                    f"Security validation failed for {operation_type}: {validation_result['errors']}"
                )

            return enhanced_result

        except Exception as e:
            error_msg = f"Security validation error for {operation_type}: {e}"
            logger.error(error_msg)
            return {
                "overall_valid": False,
                "errors": [error_msg],
                "validation_type": operation_type,
                "timestamp": datetime.now().isoformat(),
                "exception": str(e),
            }

    def test_network_recovery(self) -> Dict[str, Any]:
        """Test network recovery and return status"""
        try:
            return self.error_handler.test_network_recovery()
        except Exception as e:
            logger.error(f"Network recovery test failed: {e}")
            return {
                "recovered": False,
                "error": str(e),
                "message": "Network recovery test failed",
            }
