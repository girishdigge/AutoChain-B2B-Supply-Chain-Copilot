# blockchain/config.py
from dataclasses import dataclass
from typing import Optional, Dict, Any
import os
import re
from enum import Enum


class NetworkType(Enum):
    """Supported Polygon network types"""

    AMOY_TESTNET = "amoy"
    POLYGON_MAINNET = "polygon"


@dataclass
class BlockchainConfig:
    chain_id: str = "polygon-mumbai-testnet"
    network_url: str = "https://rpc-mumbai.maticvigil.com"
    confirmations: int = 1
    difficulty: int = 2


@dataclass
class PolygonConfig:
    """Enhanced configuration for Polygon network integration"""

    # Network Configuration
    network_name: str = "amoy"
    network_type: NetworkType = NetworkType.AMOY_TESTNET
    rpc_url: str = "https://rpc-amoy.polygon.technology"
    fallback_rpc_urls: list = None
    chain_id: int = 80002  # Polygon Amoy testnet chain ID

    # Contract Configuration
    contract_address: str = ""  # Deployed Notary contract address
    contract_abi_path: str = "blockchain/contracts/Notary.json"

    # Security Configuration
    private_key: str = ""  # Private key for transaction signing
    wallet_address: str = ""  # Wallet address derived from private key

    # Gas Configuration
    gas_limit: int = 500000
    gas_price_gwei: int = 30
    max_gas_price_gwei: int = 100  # Maximum gas price for safety
    gas_multiplier: float = 1.2  # Gas estimation multiplier

    # Transaction Configuration
    max_retries: int = 3
    retry_delay: float = 2.0
    max_retry_delay: float = 60.0  # Maximum delay between retries
    confirmation_blocks: int = 1
    timeout_seconds: int = 120
    nonce_strategy: str = "auto"  # "auto" or "manual"

    # Monitoring Configuration
    enable_monitoring: bool = True
    log_level: str = "INFO"
    metrics_enabled: bool = False

    def __post_init__(self):
        """Initialize fallback URLs if not provided"""
        if self.fallback_rpc_urls is None:
            if self.network_type == NetworkType.AMOY_TESTNET:
                self.fallback_rpc_urls = [
                    "https://polygon-amoy.drpc.org",
                    "https://rpc.ankr.com/polygon_amoy",
                ]
            else:
                self.fallback_rpc_urls = [
                    "https://polygon-rpc.com",
                    "https://rpc.ankr.com/polygon",
                ]

    @classmethod
    def from_env(cls) -> "PolygonConfig":
        """Create PolygonConfig from environment variables with comprehensive loading"""

        # Determine network type from environment
        network_name = os.getenv("POLYGON_NETWORK", "amoy").lower()
        network_type = (
            NetworkType.AMOY_TESTNET
            if network_name == "amoy"
            else NetworkType.POLYGON_MAINNET
        )

        # Set default values based on network type
        if network_type == NetworkType.POLYGON_MAINNET:
            default_rpc = "https://polygon-rpc.com"
            default_chain_id = 137
            default_gas_price = 50
        else:
            default_rpc = "https://rpc-amoy.polygon.technology"
            default_chain_id = 80002
            default_gas_price = 30

        # Load fallback RPC URLs from environment
        fallback_urls = []
        fallback_env = os.getenv("POLYGON_FALLBACK_RPCS", "")
        if fallback_env:
            fallback_urls = [
                url.strip() for url in fallback_env.split(",") if url.strip()
            ]

        return cls(
            network_name=network_name,
            network_type=network_type,
            rpc_url=os.getenv("POLYGON_RPC_URL", default_rpc),
            fallback_rpc_urls=fallback_urls or None,
            chain_id=int(os.getenv("POLYGON_CHAIN_ID", str(default_chain_id))),
            contract_address=os.getenv("NOTARY_CONTRACT_ADDRESS", ""),
            contract_abi_path=os.getenv(
                "CONTRACT_ABI_PATH", "blockchain/contracts/Notary.json"
            ),
            private_key=os.getenv("POLYGON_PRIVATE_KEY", ""),
            wallet_address=os.getenv("POLYGON_WALLET_ADDRESS", ""),
            gas_limit=int(os.getenv("POLYGON_GAS_LIMIT", "500000")),
            gas_price_gwei=int(
                os.getenv("POLYGON_GAS_PRICE_GWEI", str(default_gas_price))
            ),
            max_gas_price_gwei=int(os.getenv("POLYGON_MAX_GAS_PRICE_GWEI", "100")),
            gas_multiplier=float(os.getenv("POLYGON_GAS_MULTIPLIER", "1.2")),
            max_retries=int(os.getenv("POLYGON_MAX_RETRIES", "3")),
            retry_delay=float(os.getenv("POLYGON_RETRY_DELAY", "2.0")),
            max_retry_delay=float(os.getenv("POLYGON_MAX_RETRY_DELAY", "60.0")),
            confirmation_blocks=int(os.getenv("POLYGON_CONFIRMATION_BLOCKS", "1")),
            timeout_seconds=int(os.getenv("POLYGON_TIMEOUT_SECONDS", "120")),
            nonce_strategy=os.getenv("POLYGON_NONCE_STRATEGY", "auto"),
            enable_monitoring=os.getenv("POLYGON_ENABLE_MONITORING", "true").lower()
            == "true",
            log_level=os.getenv("POLYGON_LOG_LEVEL", "INFO"),
            metrics_enabled=os.getenv("POLYGON_METRICS_ENABLED", "false").lower()
            == "true",
        )

    def get_network_config(self) -> Dict[str, Any]:
        """Get network-specific configuration dictionary"""
        return {
            "network_name": self.network_name,
            "network_type": self.network_type.value,
            "rpc_url": self.rpc_url,
            "fallback_rpc_urls": self.fallback_rpc_urls,
            "chain_id": self.chain_id,
            "confirmation_blocks": self.confirmation_blocks,
        }

    def get_gas_config(self) -> Dict[str, Any]:
        """Get gas-related configuration dictionary"""
        return {
            "gas_limit": self.gas_limit,
            "gas_price_gwei": self.gas_price_gwei,
            "max_gas_price_gwei": self.max_gas_price_gwei,
            "gas_multiplier": self.gas_multiplier,
        }

    def is_testnet(self) -> bool:
        """Check if configuration is for testnet"""
        return self.network_type == NetworkType.AMOY_TESTNET

    def validate(self) -> bool:
        """Comprehensive validation of configuration parameters"""
        self._validate_network_settings()
        self._validate_contract_settings()
        self._validate_security_settings()
        self._validate_gas_settings()
        self._validate_transaction_settings()
        return True

    def _validate_network_settings(self) -> None:
        """Validate network configuration settings"""
        if not self.rpc_url:
            raise ValueError("RPC URL is required")

        if not self._is_valid_url(self.rpc_url):
            raise ValueError(f"Invalid RPC URL format: {self.rpc_url}")

        # Validate fallback URLs if provided
        if self.fallback_rpc_urls:
            for url in self.fallback_rpc_urls:
                if not self._is_valid_url(url):
                    raise ValueError(f"Invalid fallback RPC URL format: {url}")

        if self.chain_id <= 0:
            raise ValueError("Chain ID must be positive")

        # Validate chain ID matches network type
        if self.network_type == NetworkType.AMOY_TESTNET and self.chain_id != 80002:
            raise ValueError(
                f"Chain ID {self.chain_id} does not match Amoy testnet (80002)"
            )
        elif self.network_type == NetworkType.POLYGON_MAINNET and self.chain_id != 137:
            raise ValueError(
                f"Chain ID {self.chain_id} does not match Polygon mainnet (137)"
            )

        if self.confirmation_blocks < 0:
            raise ValueError("Confirmation blocks must be non-negative")

    def _validate_contract_settings(self) -> None:
        """Validate smart contract configuration"""
        if self.contract_address and not self._is_valid_ethereum_address(
            self.contract_address
        ):
            raise ValueError(
                f"Invalid contract address format: {self.contract_address}"
            )

        if not self.contract_abi_path:
            raise ValueError("Contract ABI path is required")

    def _validate_security_settings(self) -> None:
        """Validate security-related settings"""
        if not self.private_key:
            raise ValueError("Private key is required")

        if not self._is_valid_private_key(self.private_key):
            raise ValueError("Invalid private key format")

        if self.wallet_address and not self._is_valid_ethereum_address(
            self.wallet_address
        ):
            raise ValueError(f"Invalid wallet address format: {self.wallet_address}")

    def _validate_gas_settings(self) -> None:
        """Validate gas-related settings"""
        if self.gas_limit <= 0:
            raise ValueError("Gas limit must be positive")

        if self.gas_limit > 10_000_000:  # Reasonable upper bound
            raise ValueError("Gas limit is too high (max: 10,000,000)")

        if self.gas_price_gwei <= 0:
            raise ValueError("Gas price must be positive")

        if self.max_gas_price_gwei <= 0:
            raise ValueError("Max gas price must be positive")

        if self.gas_price_gwei > self.max_gas_price_gwei:
            raise ValueError("Gas price cannot exceed max gas price")

        if self.gas_multiplier <= 0 or self.gas_multiplier > 5.0:
            raise ValueError("Gas multiplier must be between 0 and 5.0")

    def _validate_transaction_settings(self) -> None:
        """Validate transaction-related settings"""
        if self.max_retries < 0:
            raise ValueError("Max retries must be non-negative")

        if self.max_retries > 10:
            raise ValueError("Max retries is too high (max: 10)")

        if self.retry_delay <= 0:
            raise ValueError("Retry delay must be positive")

        if self.max_retry_delay <= 0:
            raise ValueError("Max retry delay must be positive")

        if self.retry_delay > self.max_retry_delay:
            raise ValueError("Retry delay cannot exceed max retry delay")

        if self.timeout_seconds <= 0:
            raise ValueError("Timeout must be positive")

        if self.nonce_strategy not in ["auto", "manual"]:
            raise ValueError("Nonce strategy must be 'auto' or 'manual'")

        if self.log_level not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            raise ValueError("Invalid log level")

    def _is_valid_url(self, url: str) -> bool:
        """Validate URL format"""
        try:
            from urllib.parse import urlparse

            result = urlparse(url)
            # Check if scheme is http or https and netloc (domain) exists
            return all(
                [
                    result.scheme in ("http", "https"),
                    result.netloc,
                    "." in result.netloc or result.netloc == "localhost",
                ]
            )
        except Exception:
            # Fallback to basic regex if urlparse fails
            url_pattern = re.compile(
                r"^https?://"  # http:// or https://
                r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}\.?|"  # domain (more permissive)
                r"localhost|"  # localhost...
                r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
                r"(?::\d+)?"  # optional port
                r"(?:/.*)?$",  # optional path (more permissive)
                re.IGNORECASE,
            )
            return url_pattern.match(url) is not None

    def _is_valid_ethereum_address(self, address: str) -> bool:
        """Validate Ethereum address format"""
        if not address:
            return False

        # Remove 0x prefix if present
        if address.startswith("0x"):
            address = address[2:]

        # Check if it's 40 characters of valid hex
        if len(address) != 40:
            return False

        try:
            int(address, 16)
            return True
        except ValueError:
            return False

    def _is_valid_private_key(self, private_key: str) -> bool:
        """Validate private key format"""
        if not private_key:
            return False

        # Remove 0x prefix if present
        if private_key.startswith("0x"):
            private_key = private_key[2:]

        # Check if it's 64 characters of valid hex
        if len(private_key) != 64:
            return False

        try:
            int(private_key, 16)
            return True
        except ValueError:
            return False

    def validate_network_compatibility(self, contract_address: str = None) -> bool:
        """Validate network compatibility and contract address"""
        contract_addr = contract_address or self.contract_address

        if not contract_addr:
            # No contract address to validate
            return True

        if not self._is_valid_ethereum_address(contract_addr):
            raise ValueError(f"Invalid contract address: {contract_addr}")

        # Additional network-specific validations could be added here
        # For example, checking if contract exists on the specified network

        return True

    def get_validation_summary(self) -> Dict[str, bool]:
        """Get validation summary for all configuration aspects"""
        summary = {}

        try:
            self._validate_network_settings()
            summary["network_settings"] = True
        except ValueError:
            summary["network_settings"] = False

        try:
            self._validate_contract_settings()
            summary["contract_settings"] = True
        except ValueError:
            summary["contract_settings"] = False

        try:
            self._validate_security_settings()
            summary["security_settings"] = True
        except ValueError:
            summary["security_settings"] = False

        try:
            self._validate_gas_settings()
            summary["gas_settings"] = True
        except ValueError:
            summary["gas_settings"] = False

        try:
            self._validate_transaction_settings()
            summary["transaction_settings"] = True
        except ValueError:
            summary["transaction_settings"] = False

        return summary
