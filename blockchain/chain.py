from block import Block
from anchor import Anchor


class Chain:
    def __init__(self):
        self.chain = []

    def add_block(self, anchor):
        previous_hash = self.chain[-1].hash if self.chain else "0"

        if isinstance(anchor, Block):
            self.chain.append(anchor)
            return anchor

        if isinstance(anchor, Anchor):
            block = Block(
                index=len(self.chain),
                anchor=anchor,
                previous_hash=previous_hash,
            )
            self.chain.append(block)
            return block

        raise TypeError("add_block only accepts Anchor or Block")

    def is_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            prev = self.chain[i - 1]
            curr = self.chain[i]
            if curr.previous_hash != prev.hash:
                return False
            if curr.hash != curr.compute_hash():
                return False
        return True

    def to_list(self):
        return [block.to_dict() for block in self.chain]
