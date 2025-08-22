# blockchain/config.py
from dataclasses import dataclass


@dataclass
class BlockchainConfig:
    chain_id: str = "polygon-mumbai-testnet"
    network_url: str = "https://rpc-mumbai.maticvigil.com"
    confirmations: int = 1
    difficulty: int = 2
