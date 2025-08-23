"""
Polygon-specific data models for blockchain integration.

This module provides data models for handling Polygon blockchain transactions,
blockchain records, and transaction status tracking with proper serialization
and validation capabilities.
"""

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from decimal import Decimal


class TransactionStatus(Enum):
    """Enumeration for transaction status tracking."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class PolygonTransaction:
    """
    Represents a Polygon blockchain transaction with comprehensive metadata.

    Attributes:
        tx_hash: Polygon transaction hash
        block_number: Block number where transaction was included
        gas_used: Amount of gas consumed by the transaction
        status: Current transaction status
        contract_events: List of smart contract events emitted
        timestamp: When the transaction was created
        gas_price: Gas price used for the transaction (in wei)
        contract_address: Address of the smart contract interacted with
        from_address: Address that initiated the transaction
        to_address: Address that received the transaction
        value: Value transferred in the transaction (in wei)
        nonce: Transaction nonce
        confirmation_count: Number of confirmations received
    """

    tx_hash: str
    block_number: int
    gas_used: int
    status: TransactionStatus
    contract_events: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    gas_price: Optional[int] = None
    contract_address: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    value: int = 0
    nonce: Optional[int] = None
    confirmation_count: int = 0

    def __post_init__(self):
        """Validate transaction data after initialization."""
        if not self.tx_hash or not isinstance(self.tx_hash, str):
            raise ValueError("tx_hash must be a non-empty string")

        if self.block_number < 0:
            raise ValueError("block_number must be non-negative")

        if self.gas_used < 0:
            raise ValueError("gas_used must be non-negative")

        if not isinstance(self.status, TransactionStatus):
            if isinstance(self.status, str):
                try:
                    self.status = TransactionStatus(self.status)
                except ValueError:
                    raise ValueError(f"Invalid transaction status: {self.status}")
            else:
                raise ValueError(
                    "status must be a TransactionStatus enum or valid string"
                )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with proper serialization."""
        data = asdict(self)
        data["status"] = self.status.value
        data["timestamp"] = self.timestamp.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PolygonTransaction":
        """Create instance from dictionary with proper deserialization."""
        # Handle timestamp conversion
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])

        # Handle status conversion
        if isinstance(data.get("status"), str):
            data["status"] = TransactionStatus(data["status"])

        return cls(**data)

    def is_successful(self) -> bool:
        """Check if transaction was successful."""
        return self.status == TransactionStatus.CONFIRMED

    def is_pending(self) -> bool:
        """Check if transaction is still pending."""
        return self.status == TransactionStatus.PENDING

    def add_event(self, event: Dict[str, Any]) -> None:
        """Add a contract event to the transaction."""
        if not isinstance(event, dict):
            raise ValueError("Event must be a dictionary")
        self.contract_events.append(event)

    def get_events_by_name(self, event_name: str) -> List[Dict[str, Any]]:
        """Get all events with a specific name."""
        return [
            event for event in self.contract_events if event.get("event") == event_name
        ]


@dataclass
class BlockchainRecord:
    """
    Comprehensive blockchain record combining local and Polygon data.

    Attributes:
        step_name: Name of the workflow step
        order_id: Associated order identifier
        local_hash: Hash from local blockchain
        polygon_tx: Polygon transaction data (optional)
        data_hash: Hash of the original data (for privacy)
        metadata: Additional metadata
        created_at: When the record was created
        updated_at: When the record was last updated
        retry_count: Number of deployment retry attempts
        deployment_attempts: List of deployment attempt details
    """

    step_name: str
    order_id: str
    local_hash: str
    data_hash: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    polygon_tx: Optional[PolygonTransaction] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    retry_count: int = 0
    deployment_attempts: List[Dict[str, Any]] = field(default_factory=list)

    def __post_init__(self):
        """Validate record data after initialization."""
        if not self.step_name or not isinstance(self.step_name, str):
            raise ValueError("step_name must be a non-empty string")

        if not self.order_id or not isinstance(self.order_id, str):
            raise ValueError("order_id must be a non-empty string")

        if not self.local_hash or not isinstance(self.local_hash, str):
            raise ValueError("local_hash must be a non-empty string")

        if not self.data_hash or not isinstance(self.data_hash, str):
            raise ValueError("data_hash must be a non-empty string")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with proper serialization."""
        data = {
            "step_name": self.step_name,
            "order_id": self.order_id,
            "local_hash": self.local_hash,
            "data_hash": self.data_hash,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "retry_count": self.retry_count,
            "deployment_attempts": self.deployment_attempts,
            "polygon_tx": self.polygon_tx.to_dict() if self.polygon_tx else None,
        }
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BlockchainRecord":
        """Create instance from dictionary with proper deserialization."""
        # Handle datetime conversion
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if isinstance(data.get("updated_at"), str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])

        # Handle PolygonTransaction conversion
        if data.get("polygon_tx") and isinstance(data["polygon_tx"], dict):
            data["polygon_tx"] = PolygonTransaction.from_dict(data["polygon_tx"])

        return cls(**data)

    def update_polygon_transaction(self, polygon_tx: PolygonTransaction) -> None:
        """Update the Polygon transaction and timestamp."""
        self.polygon_tx = polygon_tx
        self.updated_at = datetime.utcnow()

    def add_deployment_attempt(self, attempt_data: Dict[str, Any]) -> None:
        """Add a deployment attempt record."""
        attempt = {
            "timestamp": datetime.utcnow().isoformat(),
            "retry_number": self.retry_count + 1,
            **attempt_data,
        }
        self.deployment_attempts.append(attempt)
        self.retry_count += 1
        self.updated_at = datetime.utcnow()

    def has_polygon_transaction(self) -> bool:
        """Check if record has associated Polygon transaction."""
        return self.polygon_tx is not None

    def is_deployed_successfully(self) -> bool:
        """Check if record was successfully deployed to Polygon."""
        return self.polygon_tx is not None and self.polygon_tx.is_successful()

    def get_deployment_status(self) -> str:
        """Get human-readable deployment status."""
        if not self.polygon_tx:
            return "local_only"
        elif self.polygon_tx.is_pending():
            return "pending"
        elif self.polygon_tx.is_successful():
            return "deployed"
        else:
            return "failed"

    @staticmethod
    def hash_sensitive_data(
        data: Dict[str, Any], sensitive_keys: Optional[List[str]] = None
    ) -> str:
        """
        Create a hash of sensitive data for blockchain storage.

        Args:
            data: The data dictionary to hash
            sensitive_keys: List of keys to exclude from hashing (optional)

        Returns:
            SHA-256 hash of the data
        """
        if sensitive_keys:
            # Create a copy excluding sensitive keys
            filtered_data = {k: v for k, v in data.items() if k not in sensitive_keys}
        else:
            filtered_data = data.copy()

        # Sort keys for consistent hashing
        json_str = json.dumps(filtered_data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()


def validate_transaction_hash(tx_hash: str) -> bool:
    """
    Validate that a transaction hash has the correct format.

    Args:
        tx_hash: The transaction hash to validate

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(tx_hash, str):
        return False

    # Ethereum/Polygon transaction hashes are 66 characters (0x + 64 hex chars)
    if len(tx_hash) != 66:
        return False

    if not tx_hash.startswith("0x"):
        return False

    try:
        # Check if the remaining 64 characters are valid hex
        int(tx_hash[2:], 16)
        return True
    except ValueError:
        return False


def validate_address(address: str) -> bool:
    """
    Validate that an Ethereum/Polygon address has the correct format.

    Args:
        address: The address to validate

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(address, str):
        return False

    # Ethereum addresses are 42 characters (0x + 40 hex chars)
    if len(address) != 42:
        return False

    if not address.startswith("0x"):
        return False

    try:
        # Check if the remaining 40 characters are valid hex
        int(address[2:], 16)
        return True
    except ValueError:
        return False


# Type aliases for better code readability
TransactionHash = str
BlockHash = str
ContractAddress = str
WalletAddress = str
