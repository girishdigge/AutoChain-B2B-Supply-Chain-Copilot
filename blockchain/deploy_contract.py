#!/usr/bin/env python3
"""
Smart Contract Deployment Script for Polygon Amoy Testnet

This script deploys the Notary.sol contract to Polygon Amoy testnet and generates
the contract ABI and deployment information.
"""

import json
import os
import sys
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

from web3 import Web3

PRIVATE_KEY = os.getenv("PRIVATE_KEY")

from dotenv import load_dotenv
import os

load_dotenv()

private_key = os.getenv("PRIVATE_KEY")
rpc_url = os.getenv("POLYGON_AMOY_RPC_URL")
chain_id = int(os.getenv("CHAIN_ID"))


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
from solcx import compile_source, install_solc, set_solc_version

from config import PolygonConfig


class ContractDeployer:
    """Handles smart contract compilation and deployment to Polygon Amoy"""

    def __init__(self, config: PolygonConfig):
        self.config = config
        self.w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        if geth_poa_middleware:
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        else:
            logger.warning("PoA middleware not available - some operations may fail")
        self.account = Account.from_key(config.private_key)

        print(f"Deployer address: {self.account.address}")
        print(f"Network: {config.network_name} (Chain ID: {config.chain_id})")

    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met for deployment"""
        print("Checking deployment prerequisites...")

        # Check network connection
        if not self.w3.is_connected():
            print("❌ Failed to connect to Polygon network")
            return False
        print("✅ Connected to Polygon network")

        # Check account balance
        balance = self.w3.eth.get_balance(self.account.address)
        balance_matic = Web3.from_wei(balance, "ether")
        print(f"Account balance: {balance_matic:.4f} MATIC")

        if balance_matic < 0.01:  # Need at least 0.01 MATIC for deployment
            print("❌ Insufficient balance for deployment (need at least 0.01 MATIC)")
            return False
        print("✅ Sufficient balance for deployment")

        # Check if solc is available
        try:
            import solcx

            print("✅ Solidity compiler available")
        except ImportError:
            print(
                "❌ Solidity compiler not available. Install with: pip install py-solc-x"
            )
            return False

        return True

    def install_solc_if_needed(self, version: str = "0.8.19") -> bool:
        """Install Solidity compiler if not available"""
        try:
            from solcx import (
                get_installed_solc_versions,
                install_solc,
                set_solc_version,
            )

            installed_versions = get_installed_solc_versions()
            if version not in [str(v) for v in installed_versions]:
                print(f"Installing Solidity compiler version {version}...")
                install_solc(version)

            set_solc_version(version)
            print(f"✅ Using Solidity compiler version {version}")
            return True

        except Exception as e:
            print(f"❌ Failed to install Solidity compiler: {e}")
            return False

    def compile_contract(self, contract_path: str) -> Dict[str, Any]:
        """Compile the Notary smart contract"""
        print(f"Compiling contract: {contract_path}")

        try:
            # Read contract source
            with open(contract_path, "r") as file:
                contract_source = file.read()

            # Compile contract
            compiled_sol = compile_source(
                contract_source, output_values=["abi", "bin"], solc_version="0.8.19"
            )

            # Get contract interface
            contract_id, contract_interface = compiled_sol.popitem()

            print("✅ Contract compiled successfully")
            return {
                "abi": contract_interface["abi"],
                "bytecode": contract_interface["bin"],
                "contract_id": contract_id,
            }

        except Exception as e:
            print(f"❌ Contract compilation failed: {e}")
            raise

    def estimate_deployment_gas(self, contract_data: Dict[str, Any]) -> int:
        """Estimate gas required for contract deployment"""
        try:
            # Create contract instance
            contract = self.w3.eth.contract(
                abi=contract_data["abi"], bytecode=contract_data["bytecode"]
            )

            # Estimate gas for deployment
            gas_estimate = contract.constructor().estimate_gas(
                {"from": self.account.address}
            )

            # Add 20% buffer
            gas_with_buffer = int(gas_estimate * 1.2)

            print(f"Estimated deployment gas: {gas_estimate:,}")
            print(f"Gas with buffer: {gas_with_buffer:,}")

            return gas_with_buffer

        except Exception as e:
            print(f"❌ Gas estimation failed: {e}")
            # Return a reasonable default
            return 1_000_000

    def deploy_contract(self, contract_data: Dict[str, Any]) -> Dict[str, Any]:
        """Deploy the contract to Polygon Amoy testnet"""
        print("Deploying contract to Polygon Amoy testnet...")

        try:
            # Create contract instance
            contract = self.w3.eth.contract(
                abi=contract_data["abi"], bytecode=contract_data["bytecode"]
            )

            # Get current nonce
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            # Estimate gas
            gas_limit = self.estimate_deployment_gas(contract_data)

            # Get current gas price
            gas_price = self.w3.eth.gas_price

            # Build deployment transaction
            constructor_txn = contract.constructor().build_transaction(
                {
                    "chainId": self.config.chain_id,
                    "gas": gas_limit,
                    "gasPrice": gas_price,
                    "nonce": nonce,
                }
            )

            print(f"Gas limit: {gas_limit:,}")
            print(f"Gas price: {Web3.from_wei(gas_price, 'gwei'):.2f} gwei")
            print(
                f"Estimated cost: {Web3.from_wei(gas_limit * gas_price, 'ether'):.6f} MATIC"
            )

            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                constructor_txn, self.config.private_key
            )

            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            print(f"Deployment transaction sent: {tx_hash.hex()}")

            # Wait for transaction receipt
            print("Waiting for transaction confirmation...")
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)

            if tx_receipt.status == 1:
                print("✅ Contract deployed successfully!")
                print(f"Contract address: {tx_receipt.contractAddress}")
                print(f"Gas used: {tx_receipt.gasUsed:,}")
                print(f"Block number: {tx_receipt.blockNumber}")

                return {
                    "success": True,
                    "contract_address": tx_receipt.contractAddress,
                    "transaction_hash": tx_hash.hex(),
                    "gas_used": tx_receipt.gasUsed,
                    "block_number": tx_receipt.blockNumber,
                    "abi": contract_data["abi"],
                }
            else:
                print("❌ Contract deployment failed")
                return {"success": False, "error": "Transaction failed"}

        except Exception as e:
            print(f"❌ Contract deployment failed: {e}")
            return {"success": False, "error": str(e)}

    def verify_deployment(self, contract_address: str, abi: list) -> bool:
        """Verify that the contract was deployed correctly"""
        print(f"Verifying contract deployment at {contract_address}...")

        try:
            # Check if contract code exists
            code = self.w3.eth.get_code(contract_address)
            if len(code) == 0:
                print("❌ No contract code found at address")
                return False

            # Create contract instance
            contract = self.w3.eth.contract(address=contract_address, abi=abi)

            # Test basic contract functionality
            total_orders = contract.functions.getTotalNotarizedOrders().call()
            print(f"✅ Contract verified - Total notarized orders: {total_orders}")

            return True

        except Exception as e:
            print(f"❌ Contract verification failed: {e}")
            return False

    def save_deployment_info(self, deployment_result: Dict[str, Any]) -> None:
        """Save deployment information to JSON file"""
        if not deployment_result["success"]:
            return

        # Create contracts directory if it doesn't exist
        contracts_dir = Path("blockchain/contracts")
        contracts_dir.mkdir(exist_ok=True)

        # Prepare deployment info
        deployment_info = {
            "contractName": "Notary",
            "contractAddress": deployment_result["contract_address"],
            "transactionHash": deployment_result["transaction_hash"],
            "gasUsed": deployment_result["gas_used"],
            "blockNumber": deployment_result["block_number"],
            "network": self.config.network_name,
            "chainId": self.config.chain_id,
            "deployedAt": int(time.time()),
            "deployerAddress": self.account.address,
            "abi": deployment_result["abi"],
        }

        # Save to Notary.json
        notary_json_path = contracts_dir / "Notary.json"
        with open(notary_json_path, "w") as f:
            json.dump(deployment_info, f, indent=2)

        print(f"✅ Deployment info saved to {notary_json_path}")

        # Also save ABI separately for easier access
        abi_path = contracts_dir / "Notary.abi.json"
        with open(abi_path, "w") as f:
            json.dump(deployment_result["abi"], f, indent=2)

        print(f"✅ Contract ABI saved to {abi_path}")

    def test_contract_functionality(self, contract_address: str, abi: list) -> bool:
        """Test basic contract functionality after deployment"""
        print("Testing contract functionality...")

        try:
            # Create contract instance
            contract = self.w3.eth.contract(address=contract_address, abi=abi)

            # Test data
            test_order_id = "test_order_123"
            test_doc_hash = Web3.keccak(text="test_document_content")
            test_cid = "QmTestCID123"

            # Create order ID hash
            order_id_hash = Web3.keccak(text=test_order_id)

            print(f"Testing with order ID: {test_order_id}")
            print(f"Order ID hash: {order_id_hash.hex()}")

            # Build transaction to record order
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            gas_price = self.w3.eth.gas_price

            # Estimate gas for the function call
            gas_estimate = contract.functions.recordOrder(
                order_id_hash, test_doc_hash, test_cid
            ).estimate_gas({"from": self.account.address})

            # Build transaction
            txn = contract.functions.recordOrder(
                order_id_hash, test_doc_hash, test_cid
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
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

            print(f"Test transaction sent: {tx_hash.hex()}")

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt.status == 1:
                print("✅ Test transaction successful")

                # Verify the order was recorded
                stored_order = contract.functions.getNotarizedOrder(
                    order_id_hash
                ).call()
                doc_hash, cid, notarizer, timestamp, exists = stored_order

                if exists and doc_hash == test_doc_hash:
                    print("✅ Order data verified successfully")
                    print(f"Stored CID: {cid}")
                    print(f"Notarizer: {notarizer}")
                    print(f"Timestamp: {timestamp}")

                    # Check total orders
                    total_orders = contract.functions.getTotalNotarizedOrders().call()
                    print(f"Total notarized orders: {total_orders}")

                    return True
                else:
                    print("❌ Order data verification failed")
                    return False
            else:
                print("❌ Test transaction failed")
                return False

        except Exception as e:
            print(f"❌ Contract functionality test failed: {e}")
            return False


def main():
    """Main deployment function"""
    print("🚀 Starting Notary contract deployment to Polygon Amoy testnet")
    print("=" * 60)

    try:
        # Load configuration
        config = PolygonConfig.from_env()

        # Validate configuration
        config.validate()

        # Create deployer
        deployer = ContractDeployer(config)

        # Check prerequisites
        if not deployer.check_prerequisites():
            print("❌ Prerequisites not met. Please fix the issues above.")
            sys.exit(1)

        # Install Solidity compiler if needed
        if not deployer.install_solc_if_needed():
            print("❌ Failed to install Solidity compiler")
            sys.exit(1)

        # Compile contract
        contract_path = "blockchain/contracts/Notary.sol"
        if not os.path.exists(contract_path):
            print(f"❌ Contract file not found: {contract_path}")
            sys.exit(1)

        contract_data = deployer.compile_contract(contract_path)

        # Deploy contract
        deployment_result = deployer.deploy_contract(contract_data)

        if not deployment_result["success"]:
            print(
                f"❌ Deployment failed: {deployment_result.get('error', 'Unknown error')}"
            )
            sys.exit(1)

        # Verify deployment
        contract_address = deployment_result["contract_address"]
        abi = deployment_result["abi"]

        if not deployer.verify_deployment(contract_address, abi):
            print("❌ Contract verification failed")
            sys.exit(1)

        # Save deployment information
        deployer.save_deployment_info(deployment_result)

        # Test contract functionality
        if deployer.test_contract_functionality(contract_address, abi):
            print("✅ Contract functionality test passed")
        else:
            print(
                "⚠️  Contract functionality test failed, but deployment was successful"
            )

        print("\n" + "=" * 60)
        print("🎉 Deployment completed successfully!")
        print(f"Contract Address: {contract_address}")
        print(f"Network: {config.network_name}")
        print(f"Chain ID: {config.chain_id}")
        print("\nNext steps:")
        print(
            f"1. Update your .env file with: NOTARY_CONTRACT_ADDRESS={contract_address}"
        )
        print("2. Test the integration with your application")
        print("3. Monitor the contract on Polygon scan")

    except Exception as e:
        print(f"❌ Deployment failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
