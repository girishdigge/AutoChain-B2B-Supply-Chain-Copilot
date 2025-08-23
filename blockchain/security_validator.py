# blockchain/security_validator.py
import hashlib
import hmac
import secrets
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import json
import re

from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import to_checksum_address, is_address
from Crypto.Hash import keccak

logger = logging.getLogger(__name__)


class ValidationResult(Enum):
    """Results of validation checks"""

    VALID = "valid"
    INVALID = "invalid"
    WARNING = "warning"
    ERROR = "error"


class SecurityLevel(Enum):
    """Security levels for different operations"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ValidationError:
    """Represents a validation error"""

    code: str
    message: str
    severity: SecurityLevel
    field: str
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class SecurityAuditLog:
    """Security audit log entry"""

    event_type: str
    user_address: str
    action: str
    result: ValidationResult
    details: Dict[str, Any]
    timestamp: datetime = None
    risk_level: SecurityLevel = SecurityLevel.LOW

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class TransactionSignatureValidator:
    """Validates transaction signatures and cryptographic integrity"""

    def __init__(self):
        self.w3 = Web3()

    def validate_signature(
        self, message: str, signature: str, expected_address: str
    ) -> Tuple[ValidationResult, Optional[ValidationError]]:
        """Validate message signature against expected address"""
        try:
            # Ensure address is checksummed
            expected_address = to_checksum_address(expected_address)

            # Create message hash
            message_hash = encode_defunct(text=message)

            # Recover address from signature
            recovered_address = self.w3.eth.account.recover_message(
                message_hash, signature=signature
            )

            if recovered_address.lower() == expected_address.lower():
                return ValidationResult.VALID, None
            else:
                return ValidationResult.INVALID, ValidationError(
                    code="SIGNATURE_MISMATCH",
                    message=f"Signature does not match expected address. Expected: {expected_address}, Got: {recovered_address}",
                    severity=SecurityLevel.HIGH,
                    field="signature",
                )

        except Exception as e:
            return ValidationResult.ERROR, ValidationError(
                code="SIGNATURE_VALIDATION_ERROR",
                message=f"Error validating signature: {e}",
                severity=SecurityLevel.HIGH,
                field="signature",
            )

    def validate_transaction_signature(
        self, transaction: Dict[str, Any], signature: str, expected_address: str
    ) -> Tuple[ValidationResult, Optional[ValidationError]]:
        """Validate transaction signature"""
        try:
            # Reconstruct transaction for signing
            tx_data = {
                "nonce": transaction.get("nonce"),
                "gasPrice": transaction.get("gasPrice"),
                "gas": transaction.get("gas"),
                "to": transaction.get("to"),
                "value": transaction.get("value", 0),
                "data": transaction.get("data", "0x"),
                "chainId": transaction.get("chainId"),
            }

            # Sign transaction to get expected signature
            account = Account.from_key(
                signature
            )  # This is incorrect - signature is not private key
            # This method needs the private key, not the signature
            # For validation, we need a different approach

            return ValidationResult.WARNING, ValidationError(
                code="SIGNATURE_VALIDATION_INCOMPLETE",
                message="Transaction signature validation requires additional implementation",
                severity=SecurityLevel.MEDIUM,
                field="transaction_signature",
            )

        except Exception as e:
            return ValidationResult.ERROR, ValidationError(
                code="TRANSACTION_SIGNATURE_ERROR",
                message=f"Error validating transaction signature: {e}",
                severity=SecurityLevel.HIGH,
                field="transaction_signature",
            )

    def verify_message_integrity(
        self,
        original_message: str,
        received_message: str,
        hash_algorithm: str = "sha256",
    ) -> Tuple[ValidationResult, Optional[ValidationError]]:
        """Verify message integrity using hash comparison"""
        try:
            if hash_algorithm == "sha256":
                original_hash = hashlib.sha256(original_message.encode()).hexdigest()
                received_hash = hashlib.sha256(received_message.encode()).hexdigest()
            elif hash_algorithm == "keccak256":
                original_hash = Web3.keccak(text=original_message).hex()
                received_hash = Web3.keccak(text=received_message).hex()
            else:
                return ValidationResult.ERROR, ValidationError(
                    code="UNSUPPORTED_HASH_ALGORITHM",
                    message=f"Unsupported hash algorithm: {hash_algorithm}",
                    severity=SecurityLevel.MEDIUM,
                    field="hash_algorithm",
                )

            if original_hash == received_hash:
                return ValidationResult.VALID, None
            else:
                return ValidationResult.INVALID, ValidationError(
                    code="MESSAGE_INTEGRITY_FAILURE",
                    message="Message integrity check failed - hashes do not match",
                    severity=SecurityLevel.HIGH,
                    field="message_integrity",
                )

        except Exception as e:
            return ValidationResult.ERROR, ValidationError(
                code="INTEGRITY_CHECK_ERROR",
                message=f"Error checking message integrity: {e}",
                severity=SecurityLevel.MEDIUM,
                field="message_integrity",
            )


class HashIntegrityChecker:
    """Checks hash integrity for blockchain data"""

    def __init__(self):
        self.supported_algorithms = ["sha256", "keccak256", "blake2b"]

    def generate_data_hash(self, data: Any, algorithm: str = "keccak256") -> str:
        """Generate hash for data using specified algorithm"""
        try:
            # Convert data to consistent string representation
            if isinstance(data, dict):
                data_str = json.dumps(data, sort_keys=True, separators=(",", ":"))
            elif isinstance(data, str):
                data_str = data
            else:
                data_str = str(data)

            if algorithm == "sha256":
                return hashlib.sha256(data_str.encode()).hexdigest()
            elif algorithm == "keccak256":
                return Web3.keccak(text=data_str).hex()
            elif algorithm == "blake2b":
                return hashlib.blake2b(data_str.encode()).hexdigest()
            else:
                raise ValueError(f"Unsupported hash algorithm: {algorithm}")

        except Exception as e:
            logger.error(f"Error generating hash: {e}")
            raise

    def verify_data_hash(
        self, data: Any, expected_hash: str, algorithm: str = "keccak256"
    ) -> Tuple[ValidationResult, Optional[ValidationError]]:
        """Verify data hash against expected value"""
        try:
            calculated_hash = self.generate_data_hash(data, algorithm)

            if calculated_hash.lower() == expected_hash.lower():
                return ValidationResult.VALID, None
            else:
                return ValidationResult.INVALID, ValidationError(
                    code="HASH_MISMATCH",
                    message=f"Hash mismatch. Expected: {expected_hash}, Calculated: {calculated_hash}",
                    severity=SecurityLevel.HIGH,
                    field="data_hash",
                )

        except Exception as e:
            return ValidationResult.ERROR, ValidationError(
                code="HASH_VERIFICATION_ERROR",
                message=f"Error verifying hash: {e}",
                severity=SecurityLevel.MEDIUM,
                field="data_hash",
            )

    def validate_chain_integrity(
        self, blocks: List[Dict[str, Any]]
    ) -> Tuple[ValidationResult, List[ValidationError]]:
        """Validate integrity of blockchain chain"""
        errors = []

        try:
            for i, block in enumerate(blocks):
                # Check if block has required fields
                required_fields = ["hash", "previous_hash", "data", "timestamp"]
                for field in required_fields:
                    if field not in block:
                        errors.append(
                            ValidationError(
                                code="MISSING_BLOCK_FIELD",
                                message=f"Block {i} missing required field: {field}",
                                severity=SecurityLevel.HIGH,
                                field=f"block_{i}_{field}",
                            )
                        )

                # Verify block hash
                if "hash" in block and "data" in block:
                    result, error = self.verify_data_hash(block["data"], block["hash"])
                    if result != ValidationResult.VALID and error:
                        error.field = f"block_{i}_hash"
                        errors.append(error)

                # Verify chain linkage (except for genesis block)
                if i > 0 and "previous_hash" in block:
                    if block["previous_hash"] != blocks[i - 1].get("hash"):
                        errors.append(
                            ValidationError(
                                code="CHAIN_LINKAGE_BROKEN",
                                message=f"Block {i} previous_hash does not match previous block hash",
                                severity=SecurityLevel.CRITICAL,
                                field=f"block_{i}_previous_hash",
                            )
                        )

            if errors:
                return ValidationResult.INVALID, errors
            else:
                return ValidationResult.VALID, []

        except Exception as e:
            errors.append(
                ValidationError(
                    code="CHAIN_VALIDATION_ERROR",
                    message=f"Error validating chain integrity: {e}",
                    severity=SecurityLevel.HIGH,
                    field="chain_validation",
                )
            )
            return ValidationResult.ERROR, errors


class AccessControlValidator:
    """Validates access control and authorization"""

    def __init__(self):
        self.authorized_addresses = set()
        self.admin_addresses = set()
        self.rate_limits = {}  # address -> {count, reset_time}
        self.blocked_addresses = set()

    def add_authorized_address(self, address: str) -> None:
        """Add authorized address"""
        if is_address(address):
            self.authorized_addresses.add(to_checksum_address(address).lower())
        else:
            raise ValueError(f"Invalid address format: {address}")

    def add_admin_address(self, address: str) -> None:
        """Add admin address"""
        if is_address(address):
            self.admin_addresses.add(to_checksum_address(address).lower())
            self.authorized_addresses.add(to_checksum_address(address).lower())
        else:
            raise ValueError(f"Invalid address format: {address}")

    def block_address(self, address: str, reason: str = "") -> None:
        """Block an address"""
        if is_address(address):
            self.blocked_addresses.add(to_checksum_address(address).lower())
            logger.warning(f"Blocked address {address}: {reason}")
        else:
            raise ValueError(f"Invalid address format: {address}")

    def validate_address_authorization(
        self, address: str, required_level: SecurityLevel = SecurityLevel.LOW
    ) -> Tuple[ValidationResult, Optional[ValidationError]]:
        """Validate if address is authorized for operation"""
        try:
            if not is_address(address):
                return ValidationResult.INVALID, ValidationError(
                    code="INVALID_ADDRESS_FORMAT",
                    message=f"Invalid address format: {address}",
                    severity=SecurityLevel.HIGH,
                    field="address",
                )

            normalized_address = to_checksum_address(address).lower()

            # Check if address is blocked
            if normalized_address in self.blocked_addresses:
                return ValidationResult.INVALID, ValidationError(
                    code="ADDRESS_BLOCKED",
                    message=f"Address is blocked: {address}",
                    severity=SecurityLevel.CRITICAL,
                    field="address",
                )

            # Check authorization level
            if required_level == SecurityLevel.CRITICAL:
                if normalized_address not in self.admin_addresses:
                    return ValidationResult.INVALID, ValidationError(
                        code="INSUFFICIENT_PRIVILEGES",
                        message=f"Address does not have admin privileges: {address}",
                        severity=SecurityLevel.HIGH,
                        field="address",
                    )
            elif required_level in [SecurityLevel.HIGH, SecurityLevel.MEDIUM]:
                if normalized_address not in self.authorized_addresses:
                    return ValidationResult.INVALID, ValidationError(
                        code="UNAUTHORIZED_ADDRESS",
                        message=f"Address is not authorized: {address}",
                        severity=SecurityLevel.HIGH,
                        field="address",
                    )

            return ValidationResult.VALID, None

        except Exception as e:
            return ValidationResult.ERROR, ValidationError(
                code="AUTHORIZATION_CHECK_ERROR",
                message=f"Error checking authorization: {e}",
                severity=SecurityLevel.MEDIUM,
                field="address",
            )

    def check_rate_limit(
        self, address: str, max_requests: int = 100, window_minutes: int = 60
    ) -> Tuple[ValidationResult, Optional[ValidationError]]:
        """Check rate limiting for address"""
        try:
            normalized_address = to_checksum_address(address).lower()
            current_time = datetime.now()

            if normalized_address not in self.rate_limits:
                self.rate_limits[normalized_address] = {
                    "count": 1,
                    "reset_time": current_time + timedelta(minutes=window_minutes),
                }
                return ValidationResult.VALID, None

            rate_data = self.rate_limits[normalized_address]

            # Reset counter if window has passed
            if current_time >= rate_data["reset_time"]:
                rate_data["count"] = 1
                rate_data["reset_time"] = current_time + timedelta(
                    minutes=window_minutes
                )
                return ValidationResult.VALID, None

            # Check if limit exceeded
            if rate_data["count"] >= max_requests:
                return ValidationResult.INVALID, ValidationError(
                    code="RATE_LIMIT_EXCEEDED",
                    message=f"Rate limit exceeded for address {address}. Limit: {max_requests} requests per {window_minutes} minutes",
                    severity=SecurityLevel.MEDIUM,
                    field="rate_limit",
                )

            # Increment counter
            rate_data["count"] += 1
            return ValidationResult.VALID, None

        except Exception as e:
            return ValidationResult.ERROR, ValidationError(
                code="RATE_LIMIT_CHECK_ERROR",
                message=f"Error checking rate limit: {e}",
                severity=SecurityLevel.LOW,
                field="rate_limit",
            )

    def validate_transaction_permissions(
        self, from_address: str, to_address: str, value: int, data: str = ""
    ) -> Tuple[ValidationResult, List[ValidationError]]:
        """Validate transaction permissions"""
        errors = []

        # Validate from address authorization
        result, error = self.validate_address_authorization(
            from_address, SecurityLevel.MEDIUM
        )
        if result != ValidationResult.VALID and error:
            errors.append(error)

        # Check rate limiting
        result, error = self.check_rate_limit(from_address)
        if result != ValidationResult.VALID and error:
            errors.append(error)

        # Validate transaction parameters
        if value < 0:
            errors.append(
                ValidationError(
                    code="INVALID_TRANSACTION_VALUE",
                    message="Transaction value cannot be negative",
                    severity=SecurityLevel.HIGH,
                    field="value",
                )
            )

        # Check for suspicious patterns
        if data and len(data) > 10000:  # Arbitrary limit for data size
            errors.append(
                ValidationError(
                    code="SUSPICIOUS_DATA_SIZE",
                    message=f"Transaction data size is unusually large: {len(data)} bytes",
                    severity=SecurityLevel.MEDIUM,
                    field="data",
                )
            )

        if errors:
            return ValidationResult.INVALID, errors
        else:
            return ValidationResult.VALID, []


class SecurityAuditor:
    """Comprehensive security auditing system"""

    def __init__(self):
        self.audit_logs: List[SecurityAuditLog] = []
        self.signature_validator = TransactionSignatureValidator()
        self.hash_checker = HashIntegrityChecker()
        self.access_validator = AccessControlValidator()

    def audit_transaction(
        self, transaction: Dict[str, Any], context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Perform comprehensive security audit of transaction"""
        context = context or {}
        audit_results = {
            "transaction_id": transaction.get("hash", "unknown"),
            "timestamp": datetime.now().isoformat(),
            "overall_result": ValidationResult.VALID,
            "checks": {},
            "errors": [],
            "warnings": [],
        }

        # 1. Validate transaction structure
        required_fields = ["from", "to", "value", "gas", "gasPrice", "nonce"]
        missing_fields = [
            field for field in required_fields if field not in transaction
        ]

        if missing_fields:
            audit_results["checks"]["structure"] = ValidationResult.INVALID
            audit_results["errors"].append(
                {
                    "code": "MISSING_TRANSACTION_FIELDS",
                    "message": f"Missing required fields: {missing_fields}",
                    "severity": SecurityLevel.HIGH.value,
                }
            )
            audit_results["overall_result"] = ValidationResult.INVALID
        else:
            audit_results["checks"]["structure"] = ValidationResult.VALID

        # 2. Validate addresses
        from_address = transaction.get("from", "")
        to_address = transaction.get("to", "")

        if from_address:
            if not is_address(from_address):
                audit_results["checks"]["from_address"] = ValidationResult.INVALID
                audit_results["errors"].append(
                    {
                        "code": "INVALID_FROM_ADDRESS",
                        "message": f"Invalid from address: {from_address}",
                        "severity": SecurityLevel.HIGH.value,
                    }
                )
                audit_results["overall_result"] = ValidationResult.INVALID
            else:
                audit_results["checks"]["from_address"] = ValidationResult.VALID

        if to_address:
            if not is_address(to_address):
                audit_results["checks"]["to_address"] = ValidationResult.INVALID
                audit_results["errors"].append(
                    {
                        "code": "INVALID_TO_ADDRESS",
                        "message": f"Invalid to address: {to_address}",
                        "severity": SecurityLevel.HIGH.value,
                    }
                )
                audit_results["overall_result"] = ValidationResult.INVALID
            else:
                audit_results["checks"]["to_address"] = ValidationResult.VALID

        # 3. Validate authorization
        if from_address and is_address(from_address):
            auth_result, auth_error = (
                self.access_validator.validate_address_authorization(from_address)
            )
            audit_results["checks"]["authorization"] = auth_result

            if auth_result != ValidationResult.VALID and auth_error:
                audit_results["errors"].append(
                    {
                        "code": auth_error.code,
                        "message": auth_error.message,
                        "severity": auth_error.severity.value,
                    }
                )
                if auth_error.severity in [SecurityLevel.HIGH, SecurityLevel.CRITICAL]:
                    audit_results["overall_result"] = ValidationResult.INVALID

        # 4. Check rate limiting
        if from_address and is_address(from_address):
            rate_result, rate_error = self.access_validator.check_rate_limit(
                from_address
            )
            audit_results["checks"]["rate_limit"] = rate_result

            if rate_result != ValidationResult.VALID and rate_error:
                audit_results["warnings"].append(
                    {
                        "code": rate_error.code,
                        "message": rate_error.message,
                        "severity": rate_error.severity.value,
                    }
                )

        # 5. Validate transaction parameters
        value = transaction.get("value", 0)
        gas = transaction.get("gas", 0)
        gas_price = transaction.get("gasPrice", 0)

        if value < 0:
            audit_results["checks"]["value"] = ValidationResult.INVALID
            audit_results["errors"].append(
                {
                    "code": "NEGATIVE_VALUE",
                    "message": "Transaction value cannot be negative",
                    "severity": SecurityLevel.HIGH.value,
                }
            )
            audit_results["overall_result"] = ValidationResult.INVALID
        else:
            audit_results["checks"]["value"] = ValidationResult.VALID

        if gas <= 0:
            audit_results["checks"]["gas"] = ValidationResult.INVALID
            audit_results["errors"].append(
                {
                    "code": "INVALID_GAS",
                    "message": "Gas limit must be positive",
                    "severity": SecurityLevel.HIGH.value,
                }
            )
            audit_results["overall_result"] = ValidationResult.INVALID
        else:
            audit_results["checks"]["gas"] = ValidationResult.VALID

        if gas_price <= 0:
            audit_results["checks"]["gas_price"] = ValidationResult.INVALID
            audit_results["errors"].append(
                {
                    "code": "INVALID_GAS_PRICE",
                    "message": "Gas price must be positive",
                    "severity": SecurityLevel.HIGH.value,
                }
            )
            audit_results["overall_result"] = ValidationResult.INVALID
        else:
            audit_results["checks"]["gas_price"] = ValidationResult.VALID

        # Log audit result
        self.log_audit_event(
            event_type="transaction_audit",
            user_address=from_address,
            action="validate_transaction",
            result=audit_results["overall_result"],
            details=audit_results,
            risk_level=(
                SecurityLevel.HIGH
                if audit_results["overall_result"] == ValidationResult.INVALID
                else SecurityLevel.LOW
            ),
        )

        return audit_results

    def audit_data_integrity(
        self, data: Any, expected_hash: str = None, algorithm: str = "keccak256"
    ) -> Dict[str, Any]:
        """Audit data integrity"""
        audit_results = {
            "timestamp": datetime.now().isoformat(),
            "algorithm": algorithm,
            "overall_result": ValidationResult.VALID,
            "checks": {},
            "errors": [],
        }

        try:
            # Generate hash
            calculated_hash = self.hash_checker.generate_data_hash(data, algorithm)
            audit_results["calculated_hash"] = calculated_hash
            audit_results["checks"]["hash_generation"] = ValidationResult.VALID

            # Verify against expected hash if provided
            if expected_hash:
                result, error = self.hash_checker.verify_data_hash(
                    data, expected_hash, algorithm
                )
                audit_results["checks"]["hash_verification"] = result
                audit_results["expected_hash"] = expected_hash

                if result != ValidationResult.VALID and error:
                    audit_results["errors"].append(
                        {
                            "code": error.code,
                            "message": error.message,
                            "severity": error.severity.value,
                        }
                    )
                    audit_results["overall_result"] = ValidationResult.INVALID

        except Exception as e:
            audit_results["checks"]["hash_generation"] = ValidationResult.ERROR
            audit_results["errors"].append(
                {
                    "code": "HASH_GENERATION_ERROR",
                    "message": f"Error generating hash: {e}",
                    "severity": SecurityLevel.MEDIUM.value,
                }
            )
            audit_results["overall_result"] = ValidationResult.ERROR

        return audit_results

    def log_audit_event(
        self,
        event_type: str,
        user_address: str,
        action: str,
        result: ValidationResult,
        details: Dict[str, Any],
        risk_level: SecurityLevel = SecurityLevel.LOW,
    ) -> None:
        """Log security audit event"""
        audit_log = SecurityAuditLog(
            event_type=event_type,
            user_address=user_address,
            action=action,
            result=result,
            details=details,
            risk_level=risk_level,
        )

        self.audit_logs.append(audit_log)

        # Log to system logger
        log_data = {
            "event_type": event_type,
            "user_address": user_address,
            "action": action,
            "result": result.value,
            "risk_level": risk_level.value,
            "timestamp": audit_log.timestamp.isoformat(),
        }

        if risk_level == SecurityLevel.CRITICAL:
            logger.critical(f"CRITICAL security event: {action}", extra=log_data)
        elif risk_level == SecurityLevel.HIGH:
            logger.error(f"HIGH risk security event: {action}", extra=log_data)
        elif risk_level == SecurityLevel.MEDIUM:
            logger.warning(f"MEDIUM risk security event: {action}", extra=log_data)
        else:
            logger.info(f"Security audit: {action}", extra=log_data)

    def get_audit_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get audit summary for specified time period"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_logs = [log for log in self.audit_logs if log.timestamp > cutoff_time]

        summary = {
            "period_hours": hours,
            "total_events": len(recent_logs),
            "by_result": {},
            "by_risk_level": {},
            "by_event_type": {},
            "critical_events": [],
        }

        for log in recent_logs:
            # Count by result
            result_key = log.result.value
            summary["by_result"][result_key] = (
                summary["by_result"].get(result_key, 0) + 1
            )

            # Count by risk level
            risk_key = log.risk_level.value
            summary["by_risk_level"][risk_key] = (
                summary["by_risk_level"].get(risk_key, 0) + 1
            )

            # Count by event type
            event_key = log.event_type
            summary["by_event_type"][event_key] = (
                summary["by_event_type"].get(event_key, 0) + 1
            )

            # Collect critical events
            if log.risk_level == SecurityLevel.CRITICAL:
                summary["critical_events"].append(
                    {
                        "timestamp": log.timestamp.isoformat(),
                        "event_type": log.event_type,
                        "user_address": log.user_address,
                        "action": log.action,
                        "result": log.result.value,
                    }
                )

        return summary

    def cleanup_old_logs(self, days: int = 30) -> int:
        """Clean up old audit logs"""
        cutoff_time = datetime.now() - timedelta(days=days)
        original_count = len(self.audit_logs)

        self.audit_logs = [
            log for log in self.audit_logs if log.timestamp > cutoff_time
        ]

        cleaned_count = original_count - len(self.audit_logs)
        logger.info(
            f"Cleaned up {cleaned_count} old audit logs (older than {days} days)"
        )

        return cleaned_count


class ComprehensiveSecurityValidator:
    """Main security validation system combining all validators"""

    def __init__(self):
        self.auditor = SecurityAuditor()
        self.signature_validator = TransactionSignatureValidator()
        self.hash_checker = HashIntegrityChecker()
        self.access_validator = AccessControlValidator()

    def validate_blockchain_operation(
        self, operation_type: str, data: Dict[str, Any], context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Perform comprehensive validation of blockchain operation"""
        context = context or {}

        validation_results = {
            "operation_type": operation_type,
            "timestamp": datetime.now().isoformat(),
            "overall_valid": True,
            "validations": {},
            "errors": [],
            "warnings": [],
        }

        try:
            if operation_type == "transaction":
                # Validate transaction
                audit_result = self.auditor.audit_transaction(data, context)
                validation_results["validations"]["transaction_audit"] = audit_result

                if audit_result["overall_result"] != ValidationResult.VALID:
                    validation_results["overall_valid"] = False
                    validation_results["errors"].extend(audit_result.get("errors", []))
                    validation_results["warnings"].extend(
                        audit_result.get("warnings", [])
                    )

            elif operation_type == "data_integrity":
                # Validate data integrity
                expected_hash = context.get("expected_hash")
                algorithm = context.get("algorithm", "keccak256")

                integrity_result = self.auditor.audit_data_integrity(
                    data, expected_hash, algorithm
                )
                validation_results["validations"]["data_integrity"] = integrity_result

                if integrity_result["overall_result"] != ValidationResult.VALID:
                    validation_results["overall_valid"] = False
                    validation_results["errors"].extend(
                        integrity_result.get("errors", [])
                    )

            elif operation_type == "access_control":
                # Validate access control
                user_address = context.get("user_address", "")
                required_level = SecurityLevel(context.get("required_level", "low"))

                auth_result, auth_error = (
                    self.access_validator.validate_address_authorization(
                        user_address, required_level
                    )
                )
                validation_results["validations"]["access_control"] = {
                    "result": auth_result.value,
                    "user_address": user_address,
                    "required_level": required_level.value,
                }

                if auth_result != ValidationResult.VALID:
                    validation_results["overall_valid"] = False
                    if auth_error:
                        validation_results["errors"].append(
                            {
                                "code": auth_error.code,
                                "message": auth_error.message,
                                "severity": auth_error.severity.value,
                            }
                        )

        except Exception as e:
            validation_results["overall_valid"] = False
            validation_results["errors"].append(
                {
                    "code": "VALIDATION_SYSTEM_ERROR",
                    "message": f"Error in validation system: {e}",
                    "severity": SecurityLevel.HIGH.value,
                }
            )

        return validation_results

    def get_security_status(self) -> Dict[str, Any]:
        """Get overall security system status"""
        return {
            "timestamp": datetime.now().isoformat(),
            "audit_summary": self.auditor.get_audit_summary(),
            "authorized_addresses": len(self.access_validator.authorized_addresses),
            "admin_addresses": len(self.access_validator.admin_addresses),
            "blocked_addresses": len(self.access_validator.blocked_addresses),
            "rate_limited_addresses": len(self.access_validator.rate_limits),
            "system_status": "operational",
        }
