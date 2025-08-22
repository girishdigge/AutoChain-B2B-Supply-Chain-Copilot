from datetime import datetime
import json
import hashlib


class Anchor:
    def __init__(self, step_name: str, data: dict):
        self.step_name = step_name
        self.data = data
        self.timestamp = datetime.utcnow().isoformat()

    def serialize(self):
        return {
            "step_name": self.step_name,
            "data": self.data,
            "timestamp": self.timestamp,
        }

    # dictionary-style access
    def __getitem__(self, key):
        if key == "step_name":
            return self.step_name
        elif key == "data":
            return self.data
        elif key == "timestamp":
            return self.timestamp
        else:
            raise KeyError(f"{key} not found in Anchor")

    def to_dict(self):
        return self.serialize()

    def hash(self):
        encoded = json.dumps(self.serialize(), sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()
