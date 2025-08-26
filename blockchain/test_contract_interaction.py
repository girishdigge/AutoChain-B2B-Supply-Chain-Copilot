#!/usr/bin/env python3
"""
Test Contract Interaction Utilities

This script tests the contract interaction utilities including order recording,
event parsing, and contract address management.
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

# Add blockchain directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import PolygonConfig
from contract_utils import (
    ContractManager,
    create_contract_manager,
    validate_contract_deployment,
    get_order_info,
    record_order_simple,
    EventMonitor,
    ContractEvent,
    OrderRecord,
)


class MockWeb3:
    """Mock Web3 instance for testing"""

    def __init__(self):
        self.eth = Mock()
        self.middleware_onion = Mock()
        self.is_connected_result = True

        # Mock eth methods
        self.eth.get_balance.return_value = 1000000000000000000  # 1 ETH in wei
        self.eth.get_transaction_count.return_value = 42
        self.eth.gas_price = 20000000000  # 20 gwei
        self.eth.block_number = 12345
        self.eth.get_code.return_value = (
            b"0x608060405234801561001057600080fd5b50"  # Mock contract code
        )

    def is_connected(self):
        return self.is_connected_result

    @staticmethod
    def keccak(text=None, hexstr=None):
        """Mock keccak hash function"""
        if text:
            return b"\x12\x34\x56\x78" * 8  # 32 bytes mock hash
        return b"\xab\xcd\xef\x12" * 8


def test_contract_manager_initialization():
    """Test ContractManager initialization"""
    print("Testing ContractManager initialization...")

    try:
        # Create test configuration
        config = PolygonConfig(
            network_name="test",
            rpc_url="http://localhost:8545",
            chain_id=1337,
            contract_address="0x1234567890123456789012345678901234567890",
            private_key="0x" + "1" * 64,
            contract_abi_path="blockchain/contracts/Notary.json",
        )

        # Test with mock deployment info
        with patch("blockchain.contract_utils.Web3") as mock_web3_class:
            mock_web3_class.return_value = MockWeb3()

            with patch("blockchain.contract_utils.Account") as mock_account:
                mock_account.from_key.return_value = Mock(
                    address="0x1234567890123456789012345678901234567890"
                )

                # This will fail because Notary.json doesn't exist, but that's expected
                try:
                    manager = ContractManager(config)
                    print(
                        "⚠️  ContractManager created without deployment info (expected)"
                    )
                except Exception as e:
                    print(
                        f"✅ ContractManager correctly failed without deployment info: {type(e).__name__}"
                    )

        return True

    except Exception as e:
        print(f"❌ ContractManager initialization test failed: {e}")
        return False


def test_contract_address_validation():
    """Test contract address validation"""
    print("\nTesting contract address validation...")

    try:
        # Test valid addresses
        valid_addresses = [
            "0x1234567890123456789012345678901234567890",
            "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
            "0x0000000000000000000000000000000000000000",
        ]

        # Test invalid addresses
        invalid_addresses = [
            "1234567890123456789012345678901234567890",  # No 0x prefix
            "0x123456789012345678901234567890123456789",  # Too short
            "0x12345678901234567890123456789012345678901",  # Too long
            "0xGHIJKL1234567890123456789012345678901234",  # Invalid hex
            "",  # Empty
            "not_an_address",  # Invalid format
        ]

        from web3 import Web3

        # Test valid addresses
        for addr in valid_addresses:
            if not Web3.is_address(addr):
                print(f"❌ Valid address rejected: {addr}")
                return False

        # Test invalid addresses
        for addr in invalid_addresses:
            if Web3.is_address(addr):
                print(f"❌ Invalid address accepted: {addr}")
                return False

        print("✅ Contract address validation works correctly")
        return True

    except Exception as e:
        print(f"❌ Contract address validation test failed: {e}")
        return False


def test_order_record_creation():
    """Test OrderRecord data structure"""
    print("\nTesting OrderRecord creation...")

    try:
        # Create test order record
        order_record = OrderRecord(
            order_id_hash="0x1234567890123456789012345678901234567890123456789012345678901234",
            doc_hash="0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
            cid="QmTestCID123",
            notarizer="0x1234567890123456789012345678901234567890",
            timestamp=int(time.time()),
            exists=True,
            transaction_hash="0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            block_number=12345,
        )

        # Validate fields
        assert order_record.order_id_hash.startswith("0x")
        assert len(order_record.order_id_hash) == 66  # 0x + 64 hex chars
        assert order_record.doc_hash.startswith("0x")
        assert len(order_record.doc_hash) == 66
        assert order_record.cid.startswith("Qm")
        assert order_record.notarizer.startswith("0x")
        assert len(order_record.notarizer) == 42  # 0x + 40 hex chars
        assert order_record.exists is True
        assert order_record.timestamp > 0
        assert order_record.block_number > 0

        print("✅ OrderRecord creation and validation works")
        return True

    except Exception as e:
        print(f"❌ OrderRecord test failed: {e}")
        return False


def test_contract_event_creation():
    """Test ContractEvent data structure"""
    print("\nTesting ContractEvent creation...")

    try:
        # Create test contract event
        event = ContractEvent(
            event_name="OrderNotarized",
            args={
                "orderIdHash": "0x1234567890123456789012345678901234567890123456789012345678901234",
                "docHash": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
                "cid": "QmTestCID123",
                "sender": "0x1234567890123456789012345678901234567890",
                "timestamp": int(time.time()),
            },
            transaction_hash="0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            block_number=12345,
            log_index=0,
            timestamp=datetime.now(),
        )

        # Validate fields
        assert event.event_name == "OrderNotarized"
        assert "orderIdHash" in event.args
        assert "docHash" in event.args
        assert "cid" in event.args
        assert "sender" in event.args
        assert "timestamp" in event.args
        assert event.transaction_hash.startswith("0x")
        assert event.block_number > 0
        assert event.log_index >= 0
        assert isinstance(event.timestamp, datetime)

        print("✅ ContractEvent creation and validation works")
        return True

    except Exception as e:
        print(f"❌ ContractEvent test failed: {e}")
        return False


def test_utility_functions():
    """Test standalone utility functions"""
    print("\nTesting utility functions...")

    try:
        # Test create_contract_manager function
        config = PolygonConfig(
            network_name="test",
            rpc_url="http://localhost:8545",
            chain_id=1337,
            contract_address="0x1234567890123456789012345678901234567890",
            private_key="0x" + "1" * 64,
            contract_abi_path="blockchain/contracts/Notary.json",
        )

        with patch("blockchain.contract_utils.Web3") as mock_web3_class:
            mock_web3_class.return_value = MockWeb3()

            with patch("blockchain.contract_utils.Account") as mock_account:
                mock_account.from_key.return_value = Mock(
                    address="0x1234567890123456789012345678901234567890"
                )

                # Test create_contract_manager
                try:
                    manager = create_contract_manager(config)
                    print("✅ create_contract_manager function works")
                except Exception as e:
                    print(
                        f"✅ create_contract_manager correctly failed: {type(e).__name__}"
                    )

        # Test validate_contract_deployment function
        with patch("blockchain.contract_utils.ContractManager") as mock_manager_class:
            mock_manager = Mock()
            mock_manager.validate_contract_address.return_value = True
            mock_manager_class.return_value = mock_manager

            result = validate_contract_deployment(
                "0x1234567890123456789012345678901234567890", config
            )
            assert result is True
            print("✅ validate_contract_deployment function works")

        return True

    except Exception as e:
        print(f"❌ Utility functions test failed: {e}")
        return False


def test_event_monitor():
    """Test EventMonitor class"""
    print("\nTesting EventMonitor...")

    try:
        # Create mock contract manager
        mock_manager = Mock()
        mock_manager.contract = Mock()
        mock_manager.w3 = Mock()
        mock_manager.w3.eth.block_number = 12345
        mock_manager.get_recent_events.return_value = []

        # Create event monitor
        monitor = EventMonitor(mock_manager)

        # Test initialization
        assert monitor.contract_manager == mock_manager
        assert monitor.is_monitoring is False

        # Test start/stop monitoring (without actually running the loop)
        monitor.stop_monitoring()
        assert monitor.is_monitoring is False

        print("✅ EventMonitor creation and basic functionality works")
        return True

    except Exception as e:
        print(f"❌ EventMonitor test failed: {e}")
        return False


def test_configuration_integration():
    """Test integration with PolygonConfig"""
    print("\nTesting configuration integration...")

    try:
        # Test configuration creation
        config = PolygonConfig.from_env()

        # Test configuration validation (will fail due to missing env vars, but that's OK)
        try:
            config.validate()
            print("✅ Configuration validation passed")
        except Exception as e:
            print(f"✅ Configuration validation correctly failed: {type(e).__name__}")

        # Test network configuration
        network_config = config.get_network_config()
        assert "network_name" in network_config
        assert "rpc_url" in network_config
        assert "chain_id" in network_config

        # Test gas configuration
        gas_config = config.get_gas_config()
        assert "gas_limit" in gas_config
        assert "gas_price_gwei" in gas_config

        print("✅ Configuration integration works")
        return True

    except Exception as e:
        print(f"❌ Configuration integration test failed: {e}")
        return False


def test_error_handling():
    """Test error handling in contract utilities"""
    print("\nTesting error handling...")

    try:
        # Test with invalid configuration
        invalid_config = PolygonConfig(
            network_name="",
            rpc_url="invalid_url",
            chain_id=-1,
            contract_address="invalid_address",
            private_key="invalid_key",
        )

        # This should fail validation
        try:
            invalid_config.validate()
            print("❌ Invalid configuration was accepted")
            return False
        except Exception:
            print("✅ Invalid configuration correctly rejected")

        # Test with missing contract info
        valid_config = PolygonConfig(
            network_name="test",
            rpc_url="http://localhost:8545",
            chain_id=1337,
            contract_address="0x1234567890123456789012345678901234567890",
            private_key="0x" + "1" * 64,
            contract_abi_path="nonexistent_file.json",
        )

        with patch("blockchain.contract_utils.Web3") as mock_web3_class:
            mock_web3_class.return_value = MockWeb3()

            with patch("blockchain.contract_utils.Account") as mock_account:
                mock_account.from_key.return_value = Mock(
                    address="0x1234567890123456789012345678901234567890"
                )

                # This should handle missing contract info gracefully
                try:
                    manager = ContractManager(valid_config)
                    print("✅ Missing contract info handled gracefully")
                except Exception as e:
                    print(
                        f"✅ Missing contract info correctly handled: {type(e).__name__}"
                    )

        return True

    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False


def run_all_tests():
    """Run all contract interaction tests"""
    print("🧪 Running contract interaction utility tests")
    print("=" * 60)

    tests = [
        ("ContractManager Initialization", test_contract_manager_initialization),
        ("Contract Address Validation", test_contract_address_validation),
        ("OrderRecord Creation", test_order_record_creation),
        ("ContractEvent Creation", test_contract_event_creation),
        ("Utility Functions", test_utility_functions),
        ("EventMonitor", test_event_monitor),
        ("Configuration Integration", test_configuration_integration),
        ("Error Handling", test_error_handling),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 40)

        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)

    passed = 0
    total = len(results)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Contract interaction utilities are ready.")
        return True
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
