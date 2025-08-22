# blockchain_client.py
from blockchain.anchor import Anchor


def anchor_step(step_name: str, data: dict):
    """
    Anchors a workflow step onto the blockchain and returns the hash + serialized data.
    """
    anchor = Anchor(step_name, data)
    return {
        "hash": anchor.hash(),
        "data": anchor.to_dict(),
    }
