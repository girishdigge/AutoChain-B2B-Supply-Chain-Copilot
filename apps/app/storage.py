import os
import json
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional

# Import the new Polygon-specific data models
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from blockchain.models import (
    PolygonTransaction,
    BlockchainRecord,
    TransactionStatus,
    validate_transaction_hash,
    validate_address,
)

BASE_DIR = "data/orders"


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def _order_dir(order_id: str) -> str:
    return os.path.join(BASE_DIR, order_id)


# -----------------------------
# Enhanced Step + Ledger persistence with Polygon support
# -----------------------------
def save_step(order_id: str, step_name: str, record: Dict[str, Any]):
    """
    Save result of a workflow step and append to ledger.json.
    Enhanced to support Polygon transaction data.
    """
    order_dir = _order_dir(order_id)
    ensure_dir(order_dir)

    # Enhance record with metadata
    enhanced_record = {
        **record,
        "saved_at": datetime.utcnow().isoformat(),
        "order_id": order_id,
        "step_name": step_name,
    }

    # step file
    file_path = os.path.join(order_dir, f"{step_name}.json")
    with open(file_path, "w") as f:
        json.dump(enhanced_record, f, indent=2)

    # ledger append with enhanced data
    ledger_path = os.path.join(order_dir, "ledger.json")
    ledger: List[Dict[str, Any]] = []
    if os.path.exists(ledger_path):
        with open(ledger_path, "r") as f:
            ledger = json.load(f)

    ledger_entry = {
        "step": step_name,
        "local_hash": record.get("hash") or record.get("local_hash"),
        "polygon_tx_hash": record.get("polygon_tx_hash"),
        "deployment_status": record.get("deployment_status", "unknown"),
        "timestamp": record.get("timestamp", datetime.utcnow().isoformat()),
        "saved_at": enhanced_record["saved_at"],
    }

    # Maintain backward compatibility
    if "tx_hash" in record:
        ledger_entry["tx_hash"] = record["tx_hash"]

    ledger.append(ledger_entry)

    with open(ledger_path, "w") as f:
        json.dump(ledger, f, indent=2)


def load_step(order_id: str, step_name: str) -> Optional[Dict[str, Any]]:
    """Load a specific workflow step record."""
    file_path = os.path.join(_order_dir(order_id), f"{step_name}.json")
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r") as f:
        return json.load(f)


def load_ledger(order_id: str) -> List[Dict[str, Any]]:
    """Load the complete ledger for an order."""
    ledger_path = os.path.join(_order_dir(order_id), "ledger.json")
    if not os.path.exists(ledger_path):
        return []
    with open(ledger_path, "r") as f:
        return json.load(f)


def get_blockchain_records(order_id: str) -> List[Dict[str, Any]]:
    """
    Get all blockchain records for an order with enhanced Polygon data.
    """
    ledger = load_ledger(order_id)

    # Enhance ledger entries with additional blockchain data
    enhanced_records = []
    for entry in ledger:
        enhanced_entry = {
            **entry,
            "has_local_hash": bool(entry.get("local_hash") or entry.get("hash")),
            "has_polygon_tx": bool(entry.get("polygon_tx_hash")),
            "is_deployed": entry.get("deployment_status") == "deployed",
        }
        enhanced_records.append(enhanced_entry)

    return enhanced_records


def update_polygon_transaction_status(
    order_id: str,
    step_name: str,
    tx_hash: str,
    status: str,
    additional_data: Optional[Dict[str, Any]] = None,
):
    """
    Update the Polygon transaction status for a specific step.
    """
    # Load existing step record
    step_record = load_step(order_id, step_name)
    if not step_record:
        return False

    # Update with new Polygon data
    step_record.update(
        {
            "polygon_tx_hash": tx_hash,
            "polygon_status": status,
            "polygon_updated_at": datetime.utcnow().isoformat(),
        }
    )

    if additional_data:
        step_record.update(additional_data)

    # Save updated record
    save_step(order_id, step_name, step_record)
    return True


def get_pending_polygon_transactions(order_id: str) -> List[Dict[str, Any]]:
    """
    Get all steps that have pending Polygon transactions.
    """
    ledger = load_ledger(order_id)
    pending_transactions = []

    for entry in ledger:
        if entry.get("deployment_status") in ["pending", "local_only"] and entry.get(
            "polygon_tx_hash"
        ) in [None, "pending"]:
            pending_transactions.append(entry)

    return pending_transactions


# -----------------------------
# Clarification persistence (existing functionality)
# -----------------------------
def _clarifications_path(run_id: str) -> str:
    return os.path.join(_order_dir(run_id), "clarifications.json")


def save_clarification(run_id: str, clarification: Dict[str, Any]):
    """
    Persist a clarification request to disk.
    Each clarification is appended into clarifications.json.
    """
    ensure_dir(_order_dir(run_id))
    path = _clarifications_path(run_id)

    data: List[Dict[str, Any]] = []
    if os.path.exists(path):
        with open(path, "r") as f:
            data = json.load(f)

    data.append(clarification)

    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def load_clarifications(run_id: str) -> List[Dict[str, Any]]:
    """Load all clarifications for a run."""
    path = _clarifications_path(run_id)
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)


def resolve_clarification(run_id: str, clarification_id: str, response: str) -> bool:
    """
    Mark a clarification as resolved and persist.
    """
    path = _clarifications_path(run_id)
    if not os.path.exists(path):
        return False

    with open(path, "r") as f:
        data: List[Dict[str, Any]] = json.load(f)

    for item in data:
        if item.get("id") == clarification_id:
            item["resolved"] = True
            item["response"] = response
            item["resolved_at"] = datetime.utcnow().isoformat()
            break

    with open(path, "w") as f:
        json.dump(data, f, indent=2)

    return True


# -----------------------------
# Enhanced Polygon Blockchain Storage
# -----------------------------


def save_blockchain_record(record: BlockchainRecord) -> bool:
    """
    Save a comprehensive blockchain record with Polygon transaction data.

    Args:
        record: BlockchainRecord instance to save

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        order_dir = _order_dir(record.order_id)
        ensure_dir(order_dir)

        # Save the blockchain record as a separate file
        blockchain_file = os.path.join(order_dir, f"blockchain_{record.step_name}.json")
        with open(blockchain_file, "w") as f:
            json.dump(record.to_dict(), f, indent=2)

        # Also update the step file with blockchain data
        step_data = {
            "step_name": record.step_name,
            "order_id": record.order_id,
            "local_hash": record.local_hash,
            "data_hash": record.data_hash,
            "metadata": record.metadata,
            "polygon_tx_hash": record.polygon_tx.tx_hash if record.polygon_tx else None,
            "deployment_status": record.get_deployment_status(),
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
            "retry_count": record.retry_count,
        }

        save_step(record.order_id, record.step_name, step_data)
        return True

    except Exception as e:
        print(f"Error saving blockchain record: {e}")
        return False


def load_blockchain_record(order_id: str, step_name: str) -> Optional[BlockchainRecord]:
    """
    Load a blockchain record for a specific order and step.

    Args:
        order_id: The order identifier
        step_name: The workflow step name

    Returns:
        BlockchainRecord instance or None if not found
    """
    try:
        blockchain_file = os.path.join(
            _order_dir(order_id), f"blockchain_{step_name}.json"
        )
        if not os.path.exists(blockchain_file):
            return None

        with open(blockchain_file, "r") as f:
            data = json.load(f)

        return BlockchainRecord.from_dict(data)

    except Exception as e:
        print(f"Error loading blockchain record: {e}")
        return None


def update_polygon_transaction_data(
    order_id: str, step_name: str, polygon_tx: PolygonTransaction
) -> bool:
    """
    Update blockchain record with Polygon transaction data.

    Args:
        order_id: The order identifier
        step_name: The workflow step name
        polygon_tx: PolygonTransaction instance with updated data

    Returns:
        True if updated successfully, False otherwise
    """
    try:
        # Load existing blockchain record
        record = load_blockchain_record(order_id, step_name)
        if not record:
            print(f"No blockchain record found for {order_id}/{step_name}")
            return False

        # Update with new Polygon transaction data
        record.update_polygon_transaction(polygon_tx)

        # Save updated record
        return save_blockchain_record(record)

    except Exception as e:
        print(f"Error updating Polygon transaction data: {e}")
        return False


def create_blockchain_record_from_step(
    order_id: str,
    step_name: str,
    step_data: Dict[str, Any],
    local_hash: str,
    sensitive_keys: Optional[List[str]] = None,
) -> BlockchainRecord:
    """
    Create a blockchain record from workflow step data.

    Args:
        order_id: The order identifier
        step_name: The workflow step name
        step_data: The step data dictionary
        local_hash: Hash from local blockchain
        sensitive_keys: Keys to exclude when hashing sensitive data

    Returns:
        New BlockchainRecord instance
    """
    # Hash sensitive data for blockchain storage
    data_hash = BlockchainRecord.hash_sensitive_data(step_data, sensitive_keys)

    # Create metadata from step data (excluding sensitive information)
    metadata = {
        "step_type": step_data.get("type", "unknown"),
        "data_size": len(json.dumps(step_data)),
        "has_sensitive_data": bool(sensitive_keys),
        "original_timestamp": step_data.get("timestamp"),
    }

    return BlockchainRecord(
        step_name=step_name,
        order_id=order_id,
        local_hash=local_hash,
        data_hash=data_hash,
        metadata=metadata,
    )


def get_all_blockchain_records(order_id: str) -> List[BlockchainRecord]:
    """
    Get all blockchain records for an order.

    Args:
        order_id: The order identifier

    Returns:
        List of BlockchainRecord instances
    """
    records = []
    order_dir = _order_dir(order_id)

    if not os.path.exists(order_dir):
        return records

    try:
        # Find all blockchain record files
        for filename in os.listdir(order_dir):
            if filename.startswith("blockchain_") and filename.endswith(".json"):
                step_name = filename[
                    11:-5
                ]  # Remove "blockchain_" prefix and ".json" suffix
                record = load_blockchain_record(order_id, step_name)
                if record:
                    records.append(record)

    except Exception as e:
        print(f"Error loading blockchain records: {e}")

    return records


def get_pending_polygon_deployments(
    order_id: Optional[str] = None,
) -> List[BlockchainRecord]:
    """
    Get all blockchain records with pending Polygon deployments.

    Args:
        order_id: Optional order ID to filter by

    Returns:
        List of BlockchainRecord instances with pending deployments
    """
    pending_records = []

    if order_id:
        # Get pending records for specific order
        records = get_all_blockchain_records(order_id)
        pending_records = [
            r
            for r in records
            if not r.has_polygon_transaction()
            or (r.polygon_tx and r.polygon_tx.is_pending())
        ]
    else:
        # Get pending records for all orders
        if os.path.exists(BASE_DIR):
            for order_dir in os.listdir(BASE_DIR):
                order_path = os.path.join(BASE_DIR, order_dir)
                if os.path.isdir(order_path):
                    records = get_all_blockchain_records(order_dir)
                    order_pending = [
                        r
                        for r in records
                        if not r.has_polygon_transaction()
                        or (r.polygon_tx and r.polygon_tx.is_pending())
                    ]
                    pending_records.extend(order_pending)

    return pending_records


def add_deployment_attempt(
    order_id: str, step_name: str, attempt_data: Dict[str, Any]
) -> bool:
    """
    Add a deployment attempt record to a blockchain record.

    Args:
        order_id: The order identifier
        step_name: The workflow step name
        attempt_data: Data about the deployment attempt

    Returns:
        True if added successfully, False otherwise
    """
    try:
        record = load_blockchain_record(order_id, step_name)
        if not record:
            return False

        record.add_deployment_attempt(attempt_data)
        return save_blockchain_record(record)

    except Exception as e:
        print(f"Error adding deployment attempt: {e}")
        return False


def hash_sensitive_order_data(
    order_data: Dict[str, Any], sensitive_fields: Optional[List[str]] = None
) -> str:
    """
    Hash sensitive order data before blockchain storage.

    Args:
        order_data: The order data to hash
        sensitive_fields: List of sensitive field names to exclude

    Returns:
        SHA-256 hash of the non-sensitive data
    """
    if sensitive_fields is None:
        # Default sensitive fields for order data
        sensitive_fields = [
            "customer_email",
            "customer_phone",
            "customer_address",
            "payment_info",
            "credit_card",
            "billing_address",
            "personal_info",
            "private_notes",
            "internal_comments",
        ]

    return BlockchainRecord.hash_sensitive_data(order_data, sensitive_fields)


def validate_polygon_transaction_data(tx_data: Dict[str, Any]) -> List[str]:
    """
    Validate Polygon transaction data and return list of validation errors.

    Args:
        tx_data: Transaction data dictionary

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []

    # Validate required fields
    required_fields = ["tx_hash", "block_number", "gas_used", "status"]
    for field in required_fields:
        if field not in tx_data:
            errors.append(f"Missing required field: {field}")

    # Validate transaction hash format
    if "tx_hash" in tx_data and not validate_transaction_hash(tx_data["tx_hash"]):
        errors.append("Invalid transaction hash format")

    # Validate addresses if present
    for addr_field in ["contract_address", "from_address", "to_address"]:
        if addr_field in tx_data and tx_data[addr_field]:
            if not validate_address(tx_data[addr_field]):
                errors.append(f"Invalid address format for {addr_field}")

    # Validate numeric fields
    numeric_fields = ["block_number", "gas_used", "gas_price", "value", "nonce"]
    for field in numeric_fields:
        if field in tx_data and tx_data[field] is not None:
            if not isinstance(tx_data[field], (int, float)) or tx_data[field] < 0:
                errors.append(f"Invalid numeric value for {field}")

    # Validate status
    if "status" in tx_data:
        try:
            TransactionStatus(tx_data["status"])
        except ValueError:
            errors.append(f"Invalid transaction status: {tx_data['status']}")

    return errors


# -----------------------------
# Blockchain Analytics and Reporting
# -----------------------------
def get_blockchain_summary(order_id: str) -> Dict[str, Any]:
    """
    Get a comprehensive summary of blockchain operations for an order.
    Enhanced to work with new BlockchainRecord data models.
    """
    # Get both legacy records and new blockchain records
    legacy_records = get_blockchain_records(order_id)
    blockchain_records = get_all_blockchain_records(order_id)

    # Combine data from both sources
    total_steps = len(legacy_records)
    total_blockchain_records = len(blockchain_records)

    # Count deployment statuses from blockchain records
    deployed_steps = sum(1 for r in blockchain_records if r.is_deployed_successfully())
    pending_steps = sum(
        1
        for r in blockchain_records
        if r.has_polygon_transaction() and r.polygon_tx.is_pending()
    )
    failed_steps = sum(
        1
        for r in blockchain_records
        if r.has_polygon_transaction()
        and r.polygon_tx.status == TransactionStatus.FAILED
    )
    local_only_steps = sum(
        1 for r in blockchain_records if not r.has_polygon_transaction()
    )

    # Calculate retry statistics
    total_retries = sum(r.retry_count for r in blockchain_records)
    max_retries = max((r.retry_count for r in blockchain_records), default=0)

    # Calculate gas usage statistics
    gas_used_list = [
        r.polygon_tx.gas_used
        for r in blockchain_records
        if r.polygon_tx and r.polygon_tx.gas_used
    ]
    total_gas_used = sum(gas_used_list)
    avg_gas_used = sum(gas_used_list) / len(gas_used_list) if gas_used_list else 0

    return {
        "order_id": order_id,
        "total_steps": total_steps,
        "blockchain_records": total_blockchain_records,
        "deployed_to_polygon": deployed_steps,
        "pending_deployment": pending_steps,
        "failed_deployment": failed_steps,
        "local_only": local_only_steps,
        "deployment_rate": (
            (deployed_steps / total_blockchain_records * 100)
            if total_blockchain_records > 0
            else 0
        ),
        "retry_statistics": {
            "total_retries": total_retries,
            "max_retries": max_retries,
            "avg_retries": (
                total_retries / total_blockchain_records
                if total_blockchain_records > 0
                else 0
            ),
        },
        "gas_statistics": {
            "total_gas_used": total_gas_used,
            "average_gas_used": avg_gas_used,
            "transactions_with_gas_data": len(gas_used_list),
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


def export_blockchain_audit_trail(order_id: str) -> Dict[str, Any]:
    """
    Export a comprehensive audit trail for blockchain operations.
    Enhanced to include detailed Polygon transaction data.
    """
    ledger = load_ledger(order_id)
    summary = get_blockchain_summary(order_id)
    blockchain_records = get_all_blockchain_records(order_id)

    # Load detailed step data with blockchain records
    detailed_steps = []
    for entry in ledger:
        step_name = entry.get("step")
        if step_name:
            step_data = load_step(order_id, step_name)
            blockchain_record = load_blockchain_record(order_id, step_name)

            step_detail = {
                "step_name": step_name,
                "ledger_entry": entry,
                "full_data": step_data,
                "blockchain_record": (
                    blockchain_record.to_dict() if blockchain_record else None
                ),
            }
            detailed_steps.append(step_detail)

    # Create comprehensive blockchain analysis
    blockchain_analysis = {
        "total_records": len(blockchain_records),
        "deployment_timeline": [
            {
                "step_name": r.step_name,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat(),
                "deployment_status": r.get_deployment_status(),
                "retry_count": r.retry_count,
                "polygon_tx_hash": r.polygon_tx.tx_hash if r.polygon_tx else None,
            }
            for r in sorted(blockchain_records, key=lambda x: x.created_at)
        ],
        "failed_deployments": [
            {
                "step_name": r.step_name,
                "retry_count": r.retry_count,
                "deployment_attempts": r.deployment_attempts,
                "error_info": r.polygon_tx.to_dict() if r.polygon_tx else None,
            }
            for r in blockchain_records
            if r.polygon_tx and r.polygon_tx.status == TransactionStatus.FAILED
        ],
    }

    return {
        "audit_trail": {
            "order_id": order_id,
            "summary": summary,
            "ledger": ledger,
            "detailed_steps": detailed_steps,
            "blockchain_records": [r.to_dict() for r in blockchain_records],
            "blockchain_analysis": blockchain_analysis,
            "exported_at": datetime.utcnow().isoformat(),
        }
    }


def get_system_wide_blockchain_metrics() -> Dict[str, Any]:
    """
    Get system-wide blockchain metrics across all orders.

    Returns:
        Dictionary containing comprehensive blockchain metrics
    """
    if not os.path.exists(BASE_DIR):
        return {"error": "No orders directory found"}

    all_records = []
    order_summaries = []

    # Collect data from all orders
    for order_dir in os.listdir(BASE_DIR):
        order_path = os.path.join(BASE_DIR, order_dir)
        if os.path.isdir(order_path):
            records = get_all_blockchain_records(order_dir)
            all_records.extend(records)

            if records:  # Only include orders with blockchain records
                summary = get_blockchain_summary(order_dir)
                order_summaries.append(summary)

    if not all_records:
        return {"message": "No blockchain records found"}

    # Calculate system-wide metrics
    total_records = len(all_records)
    successful_deployments = sum(1 for r in all_records if r.is_deployed_successfully())
    pending_deployments = sum(
        1
        for r in all_records
        if r.has_polygon_transaction() and r.polygon_tx.is_pending()
    )
    failed_deployments = sum(
        1
        for r in all_records
        if r.has_polygon_transaction()
        and r.polygon_tx.status == TransactionStatus.FAILED
    )

    # Gas usage metrics
    gas_data = [
        r.polygon_tx.gas_used
        for r in all_records
        if r.polygon_tx and r.polygon_tx.gas_used
    ]
    total_gas = sum(gas_data)
    avg_gas = total_gas / len(gas_data) if gas_data else 0

    # Retry metrics
    total_retries = sum(r.retry_count for r in all_records)
    records_with_retries = sum(1 for r in all_records if r.retry_count > 0)

    return {
        "system_metrics": {
            "total_orders_with_blockchain": len(order_summaries),
            "total_blockchain_records": total_records,
            "successful_deployments": successful_deployments,
            "pending_deployments": pending_deployments,
            "failed_deployments": failed_deployments,
            "success_rate": (
                (successful_deployments / total_records * 100)
                if total_records > 0
                else 0
            ),
            "gas_metrics": {
                "total_gas_used": total_gas,
                "average_gas_per_transaction": avg_gas,
                "transactions_with_gas_data": len(gas_data),
            },
            "retry_metrics": {
                "total_retries": total_retries,
                "records_requiring_retries": records_with_retries,
                "average_retries_per_record": (
                    total_retries / total_records if total_records > 0 else 0
                ),
            },
        },
        "order_summaries": order_summaries,
        "generated_at": datetime.utcnow().isoformat(),
    }
