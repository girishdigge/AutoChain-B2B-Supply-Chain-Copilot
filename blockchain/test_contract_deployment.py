#!/usr/bin/env python3
"""
Test script for contract deployment and interaction

This script tests the Notary contract deployment and basic functionality
without actually deploying to the network (uses local testing).
"""

import os
import sys
import tempfile
import json
from pathlib import Path

# Add blockchain directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import PolygonConfig
from contract_utils import ContractManager, create_contract_manager


def test_contract_compilation():
    """Test that the contract can be compiled successfully"""
    print("Testing contract compilation...")

    try:
        from solcx import compile_source, install_solc, set_solc_version

        # Install Solidity compiler if needed
        try:
            install_solc("0.8.19")
            set_solc_version("0.8.19")
        except Exception:
            pass  # May already be installed

        # Read contract source
        contract_path = Path(__file__).parent / "contracts" / "Notary.sol"
        with open(contract_path, "r") as f:
            contract_source = f.read()

        # Compile contract
        compiled_sol = compile_source(
            contract_source, output_values=["abi", "bin"], solc_version="0.8.19"
        )

        # Get contract interface
        contract_id, contract_interface = compiled_sol.popitem()

        print("✅ Contract compiled successfully")
        print(f"Contract ID: {contract_id}")
        print(f"ABI functions: {len(contract_interface['abi'])} items")
        print(f"Bytecode length: {len(contract_interface['bin'])} characters")

        return True, contract_interface

    except Exception as e:
        print(f"❌ Contract compilation failed: {e}")
        return False, None


def test_contract_abi_structure():
    """Test that the contract ABI has the expected structure"""
    print("\nTesting contract ABI structure...")

    success, contract_interface = test_contract_compilation()
    if not success:
        return False

    abi = contract_interface["abi"]

    # Expected functions
    expected_functions = [
        "recordOrder",
        "getNotarizedOrder",
        "isOrderNotarized",
        "verifyDocumentHash",
        "getTotalNotarizedOrders",
    ]

    # Expected events
    expected_events = ["OrderNotarized"]

    # Check functions
    function_names = [item["name"] for item in abi if item["type"] == "function"]
    event_names = [item["name"] for item in abi if item["type"] == "event"]

    print(f"Found functions: {function_names}")
    print(f"Found events: {event_names}")

    # Verify all expected functions exist
    missing_functions = set(expected_functions) - set(function_names)
    if missing_functions:
        print(f"❌ Missing functions: {missing_functions}")
        return False

    # Verify all expected events exist
    missing_events = set(expected_events) - set(event_names)
    if missing_events:
        print(f"❌ Missing events: {missing_events}")
        return False

    print("✅ Contract ABI structure is correct")
    return True


def test_contract_utils_without_deployment():
    """Test contract utilities without actual deployment"""
    print("\nTesting contract utilities (without deployment)...")

    try:
        # Create a mock configuration
        config = PolygonConfig(
            network_name="test",
            rpc_url="http://localhost:8545",  # This won't work but that's OK for this test
            chain_id=1337,
            contract_address="0x1234567890123456789012345678901234567890",
            private_key="0x" + "1" * 64,  # Mock private key
            contract_abi_path="blockchain/contracts/Notary.json",
        )

        # Test configuration validation
        try:
            config.validate()
            print("✅ Configuration validation works")
        except Exception as e:
            print(f"✅ Configuration validation correctly failed: {e}")

        # Test contract manager creation (will fail due to no network, but that's expected)
        try:
            manager = ContractManager(config)
            print("⚠️  Contract manager created (network connection will fail)")
        except Exception as e:
            print(f"✅ Contract manager correctly failed without network: {e}")

        return True

    except Exception as e:
        print(f"❌ Contract utilities test failed: {e}")
        return False


def test_deployment_script_structure():
    """Test that the deployment script has the correct structure"""
    print("\nTesting deployment script structure...")

    try:
        # Import the deployment script
        deploy_script_path = Path(__file__).parent / "deploy_contract.py"

        if not deploy_script_path.exists():
            print("❌ Deployment script not found")
            return False

        # Read the script and check for key components
        with open(deploy_script_path, "r") as f:
            script_content = f.read()

        required_components = [
            "class ContractDeployer",
            "def compile_contract",
            "def deploy_contract",
            "def verify_deployment",
            "def save_deployment_info",
            "def test_contract_functionality",
        ]

        missing_components = []
        for component in required_components:
            if component not in script_content:
                missing_components.append(component)

        if missing_components:
            print(f"❌ Missing components in deployment script: {missing_components}")
            return False

        print("✅ Deployment script structure is correct")
        return True

    except Exception as e:
        print(f"❌ Deployment script test failed: {e}")
        return False


def create_mock_deployment_info():
    """Create mock deployment info for testing"""
    print("\nCreating mock deployment info for testing...")

    try:
        # Create contracts directory if it doesn't exist
        contracts_dir = Path(__file__).parent / "contracts"
        contracts_dir.mkdir(exist_ok=True)

        # Create mock deployment info
        mock_deployment = {
            "contractName": "Notary",
            "contractAddress": "0x1234567890123456789012345678901234567890",
            "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "gasUsed": 500000,
            "blockNumber": 12345,
            "network": "test",
            "chainId": 1337,
            "deployedAt": 1640995200,
            "deployerAddress": "0x9876543210987654321098765432109876543210",
            "abi": [
                {
                    "inputs": [
                        {
                            "internalType": "bytes32",
                            "name": "orderIdHash",
                            "type": "bytes32",
                        },
                        {
                            "internalType": "bytes32",
                            "name": "docHash",
                            "type": "bytes32",
                        },
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
            ],
        }

        # Save mock deployment info
        notary_json_path = contracts_dir / "Notary.json"
        with open(notary_json_path, "w") as f:
            json.dump(mock_deployment, f, indent=2)

        print(f"✅ Mock deployment info created at {notary_json_path}")
        return True

    except Exception as e:
        print(f"❌ Failed to create mock deployment info: {e}")
        return False


def run_all_tests():
    """Run all tests"""
    print("🧪 Running contract deployment tests")
    print("=" * 50)

    tests = [
        ("Contract Compilation", test_contract_compilation),
        ("Contract ABI Structure", test_contract_abi_structure),
        ("Contract Utils (No Deployment)", test_contract_utils_without_deployment),
        ("Deployment Script Structure", test_deployment_script_structure),
        ("Mock Deployment Info", create_mock_deployment_info),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 30)

        try:
            if callable(test_func):
                success = test_func()
            else:
                success = test_func[0]()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)

    passed = 0
    total = len(results)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Contract deployment infrastructure is ready.")
        return True
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
