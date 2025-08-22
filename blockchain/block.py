import hashlib
import time


class Block:
    def __init__(self, index: int, anchor, previous_hash: str = "0"):
        self.index = index
        self.anchor = anchor
        self.previous_hash = previous_hash
        self.timestamp = time.time()
        self.hash = self.compute_hash()

    def compute_hash(self):
        block_string = (
            f"{self.index}{self.anchor.to_dict()}{self.previous_hash}{self.timestamp}"
        )
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self):
        return {
            "index": self.index,
            "anchor": (
                self.anchor.to_dict()
                if hasattr(self.anchor, "to_dict")
                else self.anchor
            ),
            "previous_hash": self.previous_hash,
            "timestamp": self.timestamp,
            "hash": self.hash,
        }
