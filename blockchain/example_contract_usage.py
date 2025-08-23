#!/usr/bin/env python3
"""
Example Contract Usage

This script demonstrates how to use the contract interaction utilities
for recording orders, parsing events, and managing contract interactions.
"""

import os
import sys
import time
import asyncio
from pathlib import Path
from datetime import datetime

# Add blockchain directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import PolygonConfig
from contract_utils import (
    create_contract_manager,
    ContractManager,
    EventMonitor,
    validate_contract_deployment,
    get_order_info,
    record_order_simple,
)
from polygon_deployment import PolygonDeploymentService


async def example_basic_usage():
    """Example of basic contract usage"""
    print("🔧 Basic Contract Usage Example")
    print("=" * 50)

    try:
        # Load configuration from environment
        config = PolygonConfig.from_env()
        print(f"Network: {config.network_name}")
        print(f"Chain ID: {config.chain_id}")
        print(f"Contract Address: {config.contract_address or 'Not set'}")

        # Create contract manager
        manager = create_contract_manager(config)

        # Validate contract deployment
        if config.contract_address:
            is_valid = manager.validate_contract_address()
            print(f"Contract validation: {'✅ Valid' if is_valid else '❌ Invalid'}")
        else:
            print("⚠️  No contract address configured")
            return

        # Get contract statistics
        stats = manager.get_contract_statistics()
        print(
            f"Total notarized orders: {stats.get('total_notarized_orders', 'Unknown')}"
        )

        # Example order data
        order_id = f"example_order_{int(time.time())}"
        doc_content = f"Order document content for {order_id}"
        ipfs_cid = "QmExampleCID123"

        print(f"\nRecording order: {order_id}")

        # Record order on contract
        result = manager.record_order(order_id, doc_content, ipfs_cid)

        if result["success"]:
            tx_hash = result["transaction_hash"]
            print(f"✅ Order recorded successfully!")
            print(f"Transaction hash: {tx_hash}")

            # Wait for transaction confirmation
            print("Waiting for transaction confirmation...")
            time.sleep(10)  # Wait for block confirmation

            # Retrieve order information
            order_record = manager.get_order_record(order_id)
            if order_record and order_record.exists:
                print(f"✅ Order retrieved successfully!")
                print(f"CID: {order_record.cid}")
                print(f"Notarizer: {order_record.notarizer}")
                print(f"Timestamp: {datetime.fromtimestamp(order_record.timestamp)}")

                # Parse events from transaction
                events = manager.parse_order_notarized_events(tx_hash)
                print(f"Events parsed: {len(events)}")

                for event in events:
                    print(f"Event: {event.event_name}")
                    print(f"Order ID Hash: {event.args['orderIdHash']}")
                    print(f"CID: {event.args['cid']}")
            else:
                print("❌ Failed to retrieve order")
        else:
            print(f"❌ Failed to record order: {result['error']}")

    except Exception as e:
        print(f"❌ Example failed: {e}")


async def example_advanced_usage():
    """Example of advanced contract usage with Polygon deployment service"""
    print("\n🚀 Advanced Contract Usage Example")
    print("=" * 50)

    try:
        # Load configuration
        config = PolygonConfig.from_env()

        # Create both contract manager and deployment service
        manager = create_contract_manager(config)
        deployment_service = PolygonDeploymentService(config)

        # Check network health
        health_status = await deployment_service.health_check()
        print(f"Network health: {health_status['overall_status']}")

        # Get network information
        network_info = deployment_service.get_network_info()
        print(f"Latest block: {network_info.get('latest_block', 'Unknown')}")
        print(f"Gas price: {network_info.get('gas_price_gwei', 'Unknown')} gwei")
        print(
            f"Account balance: {network_info.get('account_balance', 'Unknown')} MATIC"
        )

        if not network_info.get("connected", False):
            print("❌ Not connected to network")
            return

        # Example: Record order using deployment service
        order_id = f"advanced_order_{int(time.time())}"
        doc_content = f"Advanced order document for {order_id}"
        ipfs_cid = "QmAdvancedCID456"

        print(f"\nRecording order using deployment service: {order_id}")

        # Record order on smart contract
        result = await deployment_service.record_order_with_retry(
            order_id, doc_content, ipfs_cid
        )

        if result.success and result.transaction:
            tx_hash = result.transaction.tx_hash
            print(f"✅ Order recorded with retry logic!")
            print(f"Transaction hash: {tx_hash}")
            print(f"Retry count: {result.retry_count}")

            # Monitor transaction status
            print("Monitoring transaction status...")
            final_tx = await deployment_service.monitor_transaction_status(tx_hash)

            print(f"Final status: {final_tx.status.value}")
            if final_tx.block_number:
                print(f"Block number: {final_tx.block_number}")
                print(f"Gas used: {final_tx.gas_used}")

            # Get contract events
            events = deployment_service.get_contract_events(tx_hash)
            print(f"Contract events: {len(events)}")

        else:
            print(f"❌ Failed to record order: {result.error}")

    except Exception as e:
        print(f"❌ Advanced example failed: {e}")


async def example_event_monitoring():
    """Example of event monitoring"""
    print("\n👁️  Event Monitoring Example")
    print("=" * 50)

    try:
        # Create contract manager
        config = PolygonConfig.from_env()
        manager = create_contract_manager(config)

        if not manager.contract:
            print("❌ Contract not available for monitoring")
            return

        # Get recent events
        print("Getting recent events...")
        recent_events = manager.get_recent_events(block_count=100)

        print(f"Found {len(recent_events)} recent events")

        for i, event in enumerate(recent_events[-5:]):  # Show last 5 events
            print(f"\nEvent {i+1}:")
            print(f"  Order ID Hash: {event.args['orderIdHash']}")
            print(f"  CID: {event.args['cid']}")
            print(f"  Sender: {event.args['sender']}")
            print(f"  Block: {event.block_number}")
            print(f"  Timestamp: {event.timestamp}")

        # Example of real-time monitoring (commented out to avoid infinite loop)
        """
        print("Starting real-time event monitoring...")
        
        def event_callback(events):
            print(f"New events detected: {len(events)}")
            for event in events:
                print(f"  New order: {event.args['orderIdHash']}")
        
        monitor = EventMonitor(manager)
        # monitor.start_monitoring(callback=event_callback, poll_interval=10)
        """

    except Exception as e:
        print(f"❌ Event monitoring example failed: {e}")


async def example_contract_validation():
    """Example of contract validation and management"""
    print("\n🔍 Contract Validation Example")
    print("=" * 50)

    try:
        config = PolygonConfig.from_env()
        manager = create_contract_manager(config)

        # Test contract validation
        if config.contract_address:
            print(f"Validating contract at: {config.contract_address}")
            is_valid = manager.validate_contract_address()
            print(f"Validation result: {'✅ Valid' if is_valid else '❌ Invalid'}")

            if is_valid:
                # Get contract info
                contract_info = manager.get_contract_info()
                if contract_info:
                    print(f"Contract network: {contract_info.network}")
                    print(
                        f"Deployed at: {datetime.fromtimestamp(contract_info.deployed_at)}"
                    )
                    print(f"Deployer: {contract_info.deployer_address}")
                    print(f"Deployment tx: {contract_info.transaction_hash}")

                # Test contract functionality
                print("\nTesting contract functionality...")
                test_results = manager.test_contract_interaction()

                print(
                    f"Contract validation: {'✅' if test_results['contract_validation'] else '❌'}"
                )
                print(
                    f"Order recording: {'✅' if test_results['order_recording'] else '❌'}"
                )
                print(
                    f"Order retrieval: {'✅' if test_results['order_retrieval'] else '❌'}"
                )
                print(
                    f"Event parsing: {'✅' if test_results['event_parsing'] else '❌'}"
                )
                print(
                    f"Overall success: {'✅' if test_results['overall_success'] else '❌'}"
                )
        else:
            print("❌ No contract address configured")

    except Exception as e:
        print(f"❌ Contract validation example failed: {e}")


async def example_error_handling():
    """Example of error handling and fallback strategies"""
    print("\n⚠️  Error Handling Example")
    print("=" * 50)

    try:
        config = PolygonConfig.from_env()
        deployment_service = PolygonDeploymentService(config)

        # Test network failure detection
        print("Testing network failure detection...")
        failure_info = deployment_service._detect_network_failure()

        print(f"Failure type: {failure_info['failure_type']}")
        print(f"Severity: {failure_info['severity']}")
        print(f"Message: {failure_info['message']}")

        if "suggested_action" in failure_info:
            print(f"Suggested action: {failure_info['suggested_action']}")

        # Test fallback strategy
        fallback_strategy = deployment_service.get_fallback_strategy(
            failure_info["failure_type"]
        )
        print(f"\nFallback strategy:")
        print(f"Action: {fallback_strategy['action']}")
        print(f"Message: {fallback_strategy['message']}")
        print(f"Retry later: {fallback_strategy['retry_later']}")

        # Example of handling different error scenarios
        error_scenarios = [
            "connection",
            "insufficient_funds",
            "high_gas_price",
            "contract_error",
            "unknown",
        ]

        print("\nFallback strategies for different errors:")
        for error_type in error_scenarios:
            strategy = deployment_service.get_fallback_strategy(error_type)
            print(f"{error_type}: {strategy['action']}")

    except Exception as e:
        print(f"❌ Error handling example failed: {e}")


async def main():
    """Run all examples"""
    print("🎯 Contract Interaction Examples")
    print("=" * 60)

    # Check if environment is configured
    config = PolygonConfig.from_env()

    if not config.private_key or config.private_key == "":
        print("⚠️  Environment not configured. Please set up your .env file with:")
        print("   POLYGON_PRIVATE_KEY=your_private_key")
        print("   POLYGON_RPC_URL=your_rpc_url")
        print("   NOTARY_CONTRACT_ADDRESS=your_contract_address")
        print("\nRunning examples with mock data...")

    examples = [
        ("Basic Usage", example_basic_usage),
        ("Advanced Usage", example_advanced_usage),
        ("Event Monitoring", example_event_monitoring),
        ("Contract Validation", example_contract_validation),
        ("Error Handling", example_error_handling),
    ]

    for example_name, example_func in examples:
        try:
            print(f"\n{'='*20} {example_name} {'='*20}")
            await example_func()
        except Exception as e:
            print(f"❌ {example_name} failed: {e}")

        print("\n" + "-" * 60)

    print("\n🎉 All examples completed!")
    print("\nNext steps:")
    print("1. Deploy your contract using: python blockchain/deploy_contract.py")
    print("2. Update your .env file with the contract address")
    print("3. Test the integration with your application")
    print("4. Monitor contract events and transactions")


if __name__ == "__main__":
    asyncio.run(main())
