# blockchain_client.py
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from blockchain.anchor import Anchor
from blockchain.polygon_deployment import PolygonDeploymentService, PolygonResult
from blockchain.config import PolygonConfig

logger = logging.getLogger(__name__)


def anchor_step(
    step_name: str, data: dict, order_id: str = "default_order"
) -> Dict[str, Any]:
    """
    Anchors a workflow step onto the local blockchain and returns the hash + serialized data.
    Enhanced to support Polygon deployment integration while maintaining backward compatibility.
    """
    # Create local blockchain anchor (existing functionality)
    anchor = Anchor(step_name, data)
    local_hash = anchor.hash()
    local_data = anchor.to_dict()

    logger.info(f"Local blockchain anchor created for step '{step_name}': {local_hash}")

    # Return enhanced result with local blockchain data
    return {
        "hash": local_hash,
        "data": local_data,
        "step_name": step_name,
        "order_id": order_id,
        "timestamp": datetime.utcnow().isoformat(),
        "local_block_data": local_data,
    }


async def anchor_step_with_polygon(
    step_name: str,
    data: dict,
    order_id: str = "default_order",
    polygon_service: Optional[PolygonDeploymentService] = None,
) -> Dict[str, Any]:
    """
    Enhanced anchor_step function that includes Polygon deployment.
    This is an async version for direct Polygon integration.
    """
    # 1. Create local blockchain anchor first
    local_result = anchor_step(step_name, data, order_id)
    local_hash = local_result["hash"]

    # 2. Attempt Polygon deployment if service is available
    polygon_tx_hash = None
    polygon_status = "local_only"
    polygon_error = None

    if polygon_service:
        try:
            # Prepare block data for Polygon deployment
            block_data = {
                "step_name": step_name,
                "order_id": order_id,
                "data_hash": local_hash,
                "timestamp": local_result["timestamp"],
                "local_block_data": local_result["local_block_data"],
            }

            # Deploy to Polygon with retry logic
            polygon_result: PolygonResult = (
                await polygon_service.deploy_transaction_with_retry(block_data)
            )

            if polygon_result.success and polygon_result.transaction:
                polygon_tx_hash = polygon_result.transaction.tx_hash
                polygon_status = "deployed"
                logger.info(f"Successfully deployed to Polygon: {polygon_tx_hash}")
            else:
                polygon_error = polygon_result.error
                polygon_status = "failed"
                logger.warning(f"Polygon deployment failed: {polygon_error}")

        except Exception as e:
            polygon_error = str(e)
            polygon_status = "error"
            logger.error(f"Polygon deployment error: {e}")

    # 3. Return comprehensive result
    return {
        **local_result,
        "polygon_tx_hash": polygon_tx_hash,
        "polygon_status": polygon_status,
        "polygon_error": polygon_error,
        "combined_hash": (
            f"{local_hash}:{polygon_tx_hash}"
            if polygon_tx_hash
            else f"{local_hash}:pending"
        ),
    }


def get_polygon_service() -> Optional[PolygonDeploymentService]:
    """
    Factory function to create and return a Polygon deployment service instance.
    Returns None if configuration is invalid or service cannot be initialized.
    """
    try:
        config = PolygonConfig.from_env()
        service = PolygonDeploymentService(config)
        logger.info("Polygon deployment service created successfully")
        return service
    except Exception as e:
        logger.warning(f"Failed to create Polygon service: {e}")
        return None


def anchor_step_sync_with_polygon(
    step_name: str, data: dict, order_id: str = "default_order"
) -> Dict[str, Any]:
    """
    Synchronous wrapper for anchor_step_with_polygon.
    Maintains backward compatibility while adding Polygon support.
    """
    polygon_service = get_polygon_service()

    if not polygon_service:
        # Fallback to local-only operation
        logger.info("Polygon service not available, using local-only blockchain")
        local_result = anchor_step(step_name, data, order_id)
        return {
            **local_result,
            "polygon_tx_hash": None,
            "polygon_status": "service_unavailable",
            "combined_hash": f"{local_result['hash']}:pending",
        }

    # Run async operation in sync context
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                anchor_step_with_polygon(step_name, data, order_id, polygon_service)
            )
            return result
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Sync Polygon operation failed: {e}")
        # Fallback to local-only
        local_result = anchor_step(step_name, data, order_id)
        return {
            **local_result,
            "polygon_tx_hash": None,
            "polygon_status": "error",
            "polygon_error": str(e),
            "combined_hash": f"{local_result['hash']}:pending",
        }


def verify_polygon_transaction(tx_hash: str) -> Dict[str, Any]:
    """
    Verify the status of a Polygon transaction.
    """
    polygon_service = get_polygon_service()

    if not polygon_service:
        return {
            "success": False,
            "error": "Polygon service not available",
            "status": "service_unavailable",
        }

    try:
        status = polygon_service.verify_transaction_status(tx_hash)
        return {
            "success": True,
            "tx_hash": tx_hash,
            "status": status.value,
            "verified_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "success": False,
            "tx_hash": tx_hash,
            "error": str(e),
            "status": "verification_failed",
        }


def get_blockchain_record(
    order_id: str, step_name: str, include_polygon_data: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Retrieve a comprehensive blockchain record including both local and Polygon data.
    """
    try:
        # This would integrate with the storage system to retrieve records
        # For now, return a placeholder structure
        return {
            "order_id": order_id,
            "step_name": step_name,
            "local_hash": "placeholder_local_hash",
            "polygon_tx_hash": (
                "placeholder_polygon_hash" if include_polygon_data else None
            ),
            "status": "placeholder_status",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to retrieve blockchain record: {e}")
        return None


def health_check_polygon_integration() -> Dict[str, Any]:
    """
    Perform a health check of the Polygon integration.
    """
    polygon_service = get_polygon_service()

    if not polygon_service:
        return {
            "status": "unhealthy",
            "polygon_service": "unavailable",
            "local_blockchain": "available",
            "message": "Polygon service not initialized, local-only mode active",
        }

    try:
        # Run async health check in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            health_status = loop.run_until_complete(polygon_service.health_check())

            return {
                "status": health_status.get("overall_status", "unknown"),
                "polygon_service": "available",
                "local_blockchain": "available",
                "polygon_health": health_status,
                "message": "Full blockchain integration active",
            }
        finally:
            loop.close()

    except Exception as e:
        return {
            "status": "degraded",
            "polygon_service": "error",
            "local_blockchain": "available",
            "error": str(e),
            "message": "Polygon service error, local-only mode active",
        }
