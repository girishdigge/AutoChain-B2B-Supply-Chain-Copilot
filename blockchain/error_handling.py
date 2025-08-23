# blockchain/error_handling.py
import asyncio
import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
import socket
import requests
from web3 import Web3
from web3.exceptions import Web3Exception

logger = logging.getLogger(__name__)


class NetworkFailureType(Enum):
    """Types of network failures that can occur"""

    CONNECTION_TIMEOUT = "connection_timeout"
    CONNECTION_REFUSED = "connection_refused"
    DNS_RESOLUTION = "dns_resolution"
    RPC_ERROR = "rpc_error"
    INSUFFICIENT_FUNDS = "insufficient_funds"
    HIGH_GAS_PRICE = "high_gas_price"
    NONCE_ERROR = "nonce_error"
    TRANSACTION_UNDERPRICED = "transaction_underpriced"
    NETWORK_CONGESTION = "network_congestion"
    CONTRACT_ERROR = "contract_error"
    UNKNOWN = "unknown"


class FailureSeverity(Enum):
    """Severity levels for network failures"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class NetworkFailure:
    """Represents a network failure with details"""

    failure_type: NetworkFailureType
    severity: FailureSeverity
    message: str
    timestamp: datetime
    suggested_action: str
    retry_recommended: bool = True
    retry_delay_seconds: int = 30
    additional_data: Dict[str, Any] = None

    def __post_init__(self):
        if self.additional_data is None:
            self.additional_data = {}


class NetworkConnectivityTester:
    """Tests network connectivity and diagnoses failures"""

    def __init__(self, rpc_url: str, fallback_urls: List[str] = None):
        self.rpc_url = rpc_url
        self.fallback_urls = fallback_urls or []
        self.timeout = 10  # seconds

    def test_basic_connectivity(self) -> Dict[str, Any]:
        """Test basic internet connectivity"""
        try:
            # Test DNS resolution
            socket.gethostbyname("google.com")

            # Test HTTP connectivity
            response = requests.get(
                "https://httpbin.org/status/200", timeout=self.timeout
            )
            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Basic internet connectivity working",
                }
        except socket.gaierror:
            return {
                "success": False,
                "failure_type": NetworkFailureType.DNS_RESOLUTION,
                "message": "DNS resolution failed",
            }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "failure_type": NetworkFailureType.CONNECTION_TIMEOUT,
                "message": "Connection timeout",
            }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "failure_type": NetworkFailureType.CONNECTION_REFUSED,
                "message": "Connection refused",
            }
        except Exception as e:
            return {
                "success": False,
                "failure_type": NetworkFailureType.UNKNOWN,
                "message": f"Unknown connectivity error: {e}",
            }

    def test_rpc_connectivity(self, rpc_url: str) -> Dict[str, Any]:
        """Test connectivity to a specific RPC endpoint"""
        try:
            w3 = Web3(
                Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": self.timeout})
            )

            # Test basic connection
            if not w3.is_connected():
                return {
                    "success": False,
                    "failure_type": NetworkFailureType.CONNECTION_REFUSED,
                    "message": f"Cannot connect to RPC endpoint: {rpc_url}",
                }

            # Test basic RPC call
            latest_block = w3.eth.block_number

            return {
                "success": True,
                "message": f"RPC endpoint working, latest block: {latest_block}",
                "latest_block": latest_block,
            }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "failure_type": NetworkFailureType.CONNECTION_TIMEOUT,
                "message": f"RPC endpoint timeout: {rpc_url}",
            }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "failure_type": NetworkFailureType.CONNECTION_REFUSED,
                "message": f"RPC endpoint connection refused: {rpc_url}",
            }
        except Web3Exception as e:
            return {
                "success": False,
                "failure_type": NetworkFailureType.RPC_ERROR,
                "message": f"RPC error: {e}",
            }
        except Exception as e:
            return {
                "success": False,
                "failure_type": NetworkFailureType.UNKNOWN,
                "message": f"Unknown RPC error: {e}",
            }

    def test_all_endpoints(self) -> Dict[str, Any]:
        """Test primary and fallback RPC endpoints"""
        results = {"primary": self.test_rpc_connectivity(self.rpc_url), "fallbacks": []}

        for fallback_url in self.fallback_urls:
            fallback_result = self.test_rpc_connectivity(fallback_url)
            results["fallbacks"].append(
                {"url": fallback_url, "result": fallback_result}
            )

        # Determine overall status
        working_endpoints = []
        if results["primary"]["success"]:
            working_endpoints.append(self.rpc_url)

        for fallback in results["fallbacks"]:
            if fallback["result"]["success"]:
                working_endpoints.append(fallback["url"])

        results["summary"] = {
            "working_endpoints": working_endpoints,
            "total_endpoints": 1 + len(self.fallback_urls),
            "has_working_endpoint": len(working_endpoints) > 0,
        }

        return results

    def get_best_endpoint(self) -> Optional[str]:
        """Get the best working RPC endpoint"""
        test_results = self.test_all_endpoints()

        # Prefer primary endpoint if working
        if test_results["primary"]["success"]:
            return self.rpc_url

        # Otherwise use first working fallback
        for fallback in test_results["fallbacks"]:
            if fallback["result"]["success"]:
                return fallback["url"]

        return None


class NetworkFailureDetector:
    """Detects and categorizes network failures"""

    def __init__(self, w3: Web3, account_address: str):
        self.w3 = w3
        self.account_address = account_address

    def detect_failure_from_exception(self, exception: Exception) -> NetworkFailure:
        """Detect failure type from exception"""
        error_str = str(exception).lower()

        # Connection-related errors
        if any(
            keyword in error_str for keyword in ["connection", "timeout", "refused"]
        ):
            if "timeout" in error_str:
                return NetworkFailure(
                    failure_type=NetworkFailureType.CONNECTION_TIMEOUT,
                    severity=FailureSeverity.HIGH,
                    message=f"Connection timeout: {exception}",
                    timestamp=datetime.now(),
                    suggested_action="Check network connectivity and RPC endpoint status",
                    retry_delay_seconds=60,
                )
            else:
                return NetworkFailure(
                    failure_type=NetworkFailureType.CONNECTION_REFUSED,
                    severity=FailureSeverity.HIGH,
                    message=f"Connection refused: {exception}",
                    timestamp=datetime.now(),
                    suggested_action="Verify RPC endpoint URL and network access",
                    retry_delay_seconds=120,
                )

        # Gas-related errors
        if any(
            keyword in error_str
            for keyword in ["gas", "underpriced", "insufficient funds"]
        ):
            if "insufficient funds" in error_str:
                return NetworkFailure(
                    failure_type=NetworkFailureType.INSUFFICIENT_FUNDS,
                    severity=FailureSeverity.CRITICAL,
                    message=f"Insufficient funds: {exception}",
                    timestamp=datetime.now(),
                    suggested_action="Add funds to account",
                    retry_recommended=False,
                )
            elif "underpriced" in error_str:
                return NetworkFailure(
                    failure_type=NetworkFailureType.TRANSACTION_UNDERPRICED,
                    severity=FailureSeverity.MEDIUM,
                    message=f"Transaction underpriced: {exception}",
                    timestamp=datetime.now(),
                    suggested_action="Increase gas price",
                    retry_delay_seconds=30,
                )
            else:
                return NetworkFailure(
                    failure_type=NetworkFailureType.HIGH_GAS_PRICE,
                    severity=FailureSeverity.MEDIUM,
                    message=f"Gas price issue: {exception}",
                    timestamp=datetime.now(),
                    suggested_action="Adjust gas settings or wait for lower prices",
                    retry_delay_seconds=300,
                )

        # Nonce-related errors
        if "nonce" in error_str:
            return NetworkFailure(
                failure_type=NetworkFailureType.NONCE_ERROR,
                severity=FailureSeverity.MEDIUM,
                message=f"Nonce error: {exception}",
                timestamp=datetime.now(),
                suggested_action="Reset nonce and retry transaction",
                retry_delay_seconds=10,
            )

        # Contract-related errors
        if any(keyword in error_str for keyword in ["revert", "contract", "execution"]):
            return NetworkFailure(
                failure_type=NetworkFailureType.CONTRACT_ERROR,
                severity=FailureSeverity.HIGH,
                message=f"Contract execution error: {exception}",
                timestamp=datetime.now(),
                suggested_action="Check contract parameters and state",
                retry_delay_seconds=60,
            )

        # RPC-related errors
        if any(keyword in error_str for keyword in ["rpc", "json", "method"]):
            return NetworkFailure(
                failure_type=NetworkFailureType.RPC_ERROR,
                severity=FailureSeverity.HIGH,
                message=f"RPC error: {exception}",
                timestamp=datetime.now(),
                suggested_action="Check RPC endpoint and try fallback",
                retry_delay_seconds=30,
            )

        # Default to unknown
        return NetworkFailure(
            failure_type=NetworkFailureType.UNKNOWN,
            severity=FailureSeverity.MEDIUM,
            message=f"Unknown error: {exception}",
            timestamp=datetime.now(),
            suggested_action="Check logs and network status",
            retry_delay_seconds=60,
        )

    def check_account_balance(
        self, min_balance_matic: float = 0.001
    ) -> Optional[NetworkFailure]:
        """Check if account has sufficient balance"""
        try:
            balance_wei = self.w3.eth.get_balance(self.account_address)
            balance_matic = Web3.from_wei(balance_wei, "ether")

            if balance_matic < min_balance_matic:
                return NetworkFailure(
                    failure_type=NetworkFailureType.INSUFFICIENT_FUNDS,
                    severity=FailureSeverity.CRITICAL,
                    message=f"Low balance: {balance_matic} MATIC (minimum: {min_balance_matic})",
                    timestamp=datetime.now(),
                    suggested_action="Add funds to account",
                    retry_recommended=False,
                    additional_data={
                        "balance": balance_matic,
                        "minimum": min_balance_matic,
                    },
                )

            return None

        except Exception as e:
            return NetworkFailure(
                failure_type=NetworkFailureType.CONNECTION_TIMEOUT,
                severity=FailureSeverity.HIGH,
                message=f"Cannot check balance: {e}",
                timestamp=datetime.now(),
                suggested_action="Check network connectivity",
                retry_delay_seconds=60,
            )

    def check_gas_prices(
        self, max_gas_price_gwei: int = 100
    ) -> Optional[NetworkFailure]:
        """Check if gas prices are reasonable"""
        try:
            current_gas_price = self.w3.eth.gas_price
            current_gas_gwei = Web3.from_wei(current_gas_price, "gwei")

            if current_gas_gwei > max_gas_price_gwei:
                return NetworkFailure(
                    failure_type=NetworkFailureType.HIGH_GAS_PRICE,
                    severity=FailureSeverity.MEDIUM,
                    message=f"High gas price: {current_gas_gwei} gwei (max: {max_gas_price_gwei})",
                    timestamp=datetime.now(),
                    suggested_action="Wait for lower gas prices or increase max gas price",
                    retry_delay_seconds=600,  # 10 minutes
                    additional_data={
                        "current_gas_gwei": current_gas_gwei,
                        "max_gas_gwei": max_gas_price_gwei,
                    },
                )

            return None

        except Exception as e:
            return NetworkFailure(
                failure_type=NetworkFailureType.RPC_ERROR,
                severity=FailureSeverity.MEDIUM,
                message=f"Cannot check gas prices: {e}",
                timestamp=datetime.now(),
                suggested_action="Check RPC connectivity",
                retry_delay_seconds=30,
            )

    def check_network_congestion(self) -> Optional[NetworkFailure]:
        """Check for network congestion indicators"""
        try:
            # Get recent blocks to check for congestion
            latest_block = self.w3.eth.get_block("latest")
            prev_block = self.w3.eth.get_block(latest_block.number - 1)

            # Check block time (should be ~2 seconds for Polygon)
            block_time = latest_block.timestamp - prev_block.timestamp

            if block_time > 10:  # More than 10 seconds indicates congestion
                return NetworkFailure(
                    failure_type=NetworkFailureType.NETWORK_CONGESTION,
                    severity=FailureSeverity.MEDIUM,
                    message=f"Network congestion detected: {block_time}s block time",
                    timestamp=datetime.now(),
                    suggested_action="Wait for network congestion to reduce",
                    retry_delay_seconds=300,  # 5 minutes
                    additional_data={
                        "block_time": block_time,
                        "latest_block": latest_block.number,
                    },
                )

            return None

        except Exception as e:
            return NetworkFailure(
                failure_type=NetworkFailureType.RPC_ERROR,
                severity=FailureSeverity.LOW,
                message=f"Cannot check network congestion: {e}",
                timestamp=datetime.now(),
                suggested_action="Check RPC connectivity",
                retry_delay_seconds=30,
            )

    def comprehensive_health_check(self) -> List[NetworkFailure]:
        """Perform comprehensive health check and return all detected failures"""
        failures = []

        # Check account balance
        balance_failure = self.check_account_balance()
        if balance_failure:
            failures.append(balance_failure)

        # Check gas prices
        gas_failure = self.check_gas_prices()
        if gas_failure:
            failures.append(gas_failure)

        # Check network congestion
        congestion_failure = self.check_network_congestion()
        if congestion_failure:
            failures.append(congestion_failure)

        return failures


class GracefulDegradationManager:
    """Manages graceful degradation to local-only blockchain storage"""

    def __init__(self):
        self.degradation_active = False
        self.degradation_reason = None
        self.degradation_start_time = None
        self.retry_after = None
        self.failure_history: List[NetworkFailure] = []

    def should_degrade(self, failure: NetworkFailure) -> bool:
        """Determine if system should degrade to local-only mode"""
        # Critical failures always trigger degradation
        if failure.severity == FailureSeverity.CRITICAL:
            return True

        # High severity failures with no retry recommendation
        if failure.severity == FailureSeverity.HIGH and not failure.retry_recommended:
            return True

        # Multiple consecutive failures
        recent_failures = [
            f
            for f in self.failure_history
            if f.timestamp > datetime.now() - timedelta(minutes=10)
        ]
        if len(recent_failures) >= 3:
            return True

        return False

    def activate_degradation(self, failure: NetworkFailure) -> Dict[str, Any]:
        """Activate graceful degradation mode"""
        self.degradation_active = True
        self.degradation_reason = failure
        self.degradation_start_time = datetime.now()
        self.retry_after = datetime.now() + timedelta(
            seconds=failure.retry_delay_seconds
        )

        logger.warning(f"Activating graceful degradation due to: {failure.message}")

        return {
            "degradation_active": True,
            "reason": failure.message,
            "retry_after": self.retry_after.isoformat(),
            "mode": "local_only",
        }

    def deactivate_degradation(self) -> Dict[str, Any]:
        """Deactivate graceful degradation mode"""
        self.degradation_active = False
        self.degradation_reason = None
        self.degradation_start_time = None
        self.retry_after = None

        logger.info("Graceful degradation deactivated - resuming normal operations")

        return {"degradation_active": False, "mode": "normal"}

    def can_retry_network_operations(self) -> bool:
        """Check if network operations can be retried"""
        if not self.degradation_active:
            return True

        if self.retry_after and datetime.now() >= self.retry_after:
            return True

        return False

    def record_failure(self, failure: NetworkFailure) -> None:
        """Record a network failure for analysis"""
        self.failure_history.append(failure)

        # Keep only recent failures (last 24 hours)
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.failure_history = [
            f for f in self.failure_history if f.timestamp > cutoff_time
        ]

    def get_degradation_status(self) -> Dict[str, Any]:
        """Get current degradation status"""
        return {
            "active": self.degradation_active,
            "reason": (
                self.degradation_reason.message if self.degradation_reason else None
            ),
            "start_time": (
                self.degradation_start_time.isoformat()
                if self.degradation_start_time
                else None
            ),
            "retry_after": self.retry_after.isoformat() if self.retry_after else None,
            "can_retry": self.can_retry_network_operations(),
            "recent_failures": len(
                [
                    f
                    for f in self.failure_history
                    if f.timestamp > datetime.now() - timedelta(hours=1)
                ]
            ),
        }


class ErrorLogger:
    """Comprehensive error logging and monitoring"""

    def __init__(self, logger_name: str = "blockchain.error_handling"):
        self.logger = logging.getLogger(logger_name)
        self.error_counts = {}
        self.last_error_times = {}

    def log_network_failure(
        self, failure: NetworkFailure, context: Dict[str, Any] = None
    ) -> None:
        """Log network failure with comprehensive details"""
        context = context or {}

        # Update error counts
        failure_key = f"{failure.failure_type.value}_{failure.severity.value}"
        self.error_counts[failure_key] = self.error_counts.get(failure_key, 0) + 1
        self.last_error_times[failure_key] = failure.timestamp

        # Create log message
        log_data = {
            "failure_type": failure.failure_type.value,
            "severity": failure.severity.value,
            "message": failure.message,
            "timestamp": failure.timestamp.isoformat(),
            "suggested_action": failure.suggested_action,
            "retry_recommended": failure.retry_recommended,
            "retry_delay_seconds": failure.retry_delay_seconds,
            "error_count": self.error_counts[failure_key],
            **context,
            **failure.additional_data,
        }

        # Log at appropriate level based on severity
        if failure.severity == FailureSeverity.CRITICAL:
            self.logger.critical(
                f"CRITICAL network failure: {failure.message}", extra=log_data
            )
        elif failure.severity == FailureSeverity.HIGH:
            self.logger.error(
                f"HIGH severity network failure: {failure.message}", extra=log_data
            )
        elif failure.severity == FailureSeverity.MEDIUM:
            self.logger.warning(
                f"MEDIUM severity network failure: {failure.message}", extra=log_data
            )
        else:
            self.logger.info(
                f"LOW severity network failure: {failure.message}", extra=log_data
            )

    def log_recovery(
        self, failure_type: NetworkFailureType, context: Dict[str, Any] = None
    ) -> None:
        """Log successful recovery from network failure"""
        context = context or {}

        self.logger.info(
            f"Recovered from {failure_type.value} failure",
            extra={
                "event": "recovery",
                "failure_type": failure_type.value,
                "timestamp": datetime.now().isoformat(),
                **context,
            },
        )

    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics for monitoring"""
        return {
            "error_counts": self.error_counts.copy(),
            "last_error_times": {
                k: v.isoformat() for k, v in self.last_error_times.items()
            },
            "total_errors": sum(self.error_counts.values()),
            "unique_error_types": len(self.error_counts),
        }


class NetworkFailureHandler:
    """Main handler for network failures with comprehensive error handling"""

    def __init__(
        self, rpc_url: str, fallback_urls: List[str] = None, account_address: str = ""
    ):
        self.connectivity_tester = NetworkConnectivityTester(rpc_url, fallback_urls)
        self.degradation_manager = GracefulDegradationManager()
        self.error_logger = ErrorLogger()
        self.account_address = account_address
        self.failure_detector = None  # Will be initialized when Web3 is available

    def initialize_with_web3(self, w3: Web3) -> None:
        """Initialize components that require Web3 instance"""
        self.failure_detector = NetworkFailureDetector(w3, self.account_address)

    def handle_network_failure(
        self, exception: Exception, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle network failure with comprehensive error handling"""
        context = context or {}

        # Detect failure type
        if self.failure_detector:
            failure = self.failure_detector.detect_failure_from_exception(exception)
        else:
            # Fallback detection without Web3
            failure = NetworkFailure(
                failure_type=NetworkFailureType.UNKNOWN,
                severity=FailureSeverity.MEDIUM,
                message=str(exception),
                timestamp=datetime.now(),
                suggested_action="Check network connectivity and configuration",
            )

        # Log the failure
        self.error_logger.log_network_failure(failure, context)

        # Record failure for analysis
        self.degradation_manager.record_failure(failure)

        # Determine if degradation is needed
        should_degrade = self.degradation_manager.should_degrade(failure)

        response = {
            "failure": {
                "type": failure.failure_type.value,
                "severity": failure.severity.value,
                "message": failure.message,
                "suggested_action": failure.suggested_action,
                "retry_recommended": failure.retry_recommended,
                "retry_delay_seconds": failure.retry_delay_seconds,
            },
            "degradation_activated": False,
            "fallback_strategy": self._get_fallback_strategy(failure),
        }

        # Activate degradation if needed
        if should_degrade and not self.degradation_manager.degradation_active:
            degradation_status = self.degradation_manager.activate_degradation(failure)
            response["degradation_activated"] = True
            response["degradation_status"] = degradation_status

        return response

    def _get_fallback_strategy(self, failure: NetworkFailure) -> Dict[str, Any]:
        """Get fallback strategy for specific failure type"""
        strategies = {
            NetworkFailureType.CONNECTION_TIMEOUT: {
                "action": "try_fallback_rpc",
                "message": "Try fallback RPC endpoints",
                "local_only": False,
            },
            NetworkFailureType.CONNECTION_REFUSED: {
                "action": "try_fallback_rpc",
                "message": "Try fallback RPC endpoints",
                "local_only": False,
            },
            NetworkFailureType.INSUFFICIENT_FUNDS: {
                "action": "local_only",
                "message": "Continue with local blockchain only",
                "local_only": True,
            },
            NetworkFailureType.HIGH_GAS_PRICE: {
                "action": "delay_and_retry",
                "message": "Wait for lower gas prices",
                "local_only": False,
                "delay_minutes": 10,
            },
            NetworkFailureType.CONTRACT_ERROR: {
                "action": "local_only",
                "message": "Skip contract interaction, continue locally",
                "local_only": True,
            },
        }

        return strategies.get(
            failure.failure_type,
            {
                "action": "local_only",
                "message": "Continue with local blockchain only",
                "local_only": True,
            },
        )

    def test_network_recovery(self) -> Dict[str, Any]:
        """Test if network has recovered and degradation can be lifted"""
        if not self.degradation_manager.degradation_active:
            return {"recovered": True, "message": "No degradation active"}

        if not self.degradation_manager.can_retry_network_operations():
            return {
                "recovered": False,
                "message": "Still in retry delay period",
                "retry_after": self.degradation_manager.retry_after.isoformat(),
            }

        # Test connectivity
        connectivity_results = self.connectivity_tester.test_all_endpoints()

        if connectivity_results["summary"]["has_working_endpoint"]:
            # Network appears to be working, deactivate degradation
            self.degradation_manager.deactivate_degradation()
            self.error_logger.log_recovery(
                self.degradation_manager.degradation_reason.failure_type
                if self.degradation_manager.degradation_reason
                else NetworkFailureType.UNKNOWN
            )

            return {
                "recovered": True,
                "message": "Network connectivity restored",
                "working_endpoints": connectivity_results["summary"][
                    "working_endpoints"
                ],
            }
        else:
            return {
                "recovered": False,
                "message": "Network still unavailable",
                "test_results": connectivity_results,
            }

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive status of network failure handling"""
        return {
            "degradation": self.degradation_manager.get_degradation_status(),
            "error_statistics": self.error_logger.get_error_statistics(),
            "connectivity": self.connectivity_tester.test_all_endpoints()["summary"],
        }
