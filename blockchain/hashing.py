# blockchain/hashing.py
import hashlib
import json


def compute_hash(data: dict) -> str:
    """Generate a SHA256 hash for any dictionary payload."""
    block_string = json.dumps(data, sort_keys=True).encode()
    return hashlib.sha256(block_string).hexdigest()
