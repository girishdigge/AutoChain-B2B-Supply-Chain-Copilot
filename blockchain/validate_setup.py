#!/usr/bin/env python3
"""
Validation script to check if Polygon development environment is properly set up
"""

import sys
import os
from pathlib import Path


def check_dependencies():
    """Check if required dependencies are available"""
    required_packages = ["web3", "eth_account", "dotenv", "dataclasses"]

    missing_packages = []

    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package} is available")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} is missing")

    return len(missing_packages) == 0


def check_configuration():
    """Check if configuration files exist and are valid"""
    config_files = [
        "blockchain/config.py",
        "blockchain/requirements.txt",
        "blockchain/.env.example",
    ]

    all_exist = True

    for config_file in config_files:
        if os.path.exists(config_file):
            print(f"✓ {config_file} exists")
        else:
            print(f"✗ {config_file} is missing")
            all_exist = False

    return all_exist


def check_env_variables():
    """Check if required environment variables are set"""
    from dotenv import load_dotenv

    load_dotenv()

    required_vars = ["CHAIN_ID", "RPC_URL", "PRIVATE_KEY"]

    all_set = True

    for var in required_vars:
        value = os.getenv(var)
        if value and value != "xxx" and not value.startswith("0xYour"):
            print(f"✓ {var} is set")
        else:
            print(f"⚠ {var} needs to be configured with actual values")
            all_set = False

    return all_set


def main():
    """Main validation function"""
    print("Validating Polygon development environment setup...\n")

    print("1. Checking dependencies:")
    deps_ok = check_dependencies()

    print("\n2. Checking configuration files:")
    config_ok = check_configuration()

    print("\n3. Checking environment variables:")
    env_ok = check_env_variables()

    print("\n" + "=" * 50)

    if deps_ok and config_ok:
        print("✓ Polygon development environment setup is complete!")
        if not env_ok:
            print(
                "⚠ Remember to update .env file with your actual API keys and private key"
            )
        return 0
    else:
        print("✗ Setup is incomplete. Please address the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
