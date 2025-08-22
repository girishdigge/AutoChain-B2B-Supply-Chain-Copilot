# blockchain/notary.py
from .chain import Chain
from .anchor import Anchor


class Notary:
    def __init__(self):
        self.chain = Chain()
        self.chain.create_genesis_block()

    def notarize(self, step: str, data: dict):
        anchor = Anchor(step=step, data=data)
        block = self.chain.add_block(anchor)
        return {
            "step": step,
            "hash": block.hash,
            "block_index": block.index,
            "data": data,
        }
