# storage.py
import os
import json
from datetime import datetime

BASE_DIR = "data/orders"


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def save_step(order_id: str, step_name: str, record: dict):
    """Save result of a step to disk"""
    order_dir = os.path.join(BASE_DIR, order_id)
    ensure_dir(order_dir)

    file_path = os.path.join(order_dir, f"{step_name}.json")
    with open(file_path, "w") as f:
        json.dump(record, f, indent=2)

    # also update ledger.json (append log)
    ledger_path = os.path.join(order_dir, "ledger.json")
    ledger = []
    if os.path.exists(ledger_path):
        with open(ledger_path, "r") as f:
            ledger = json.load(f)

    ledger.append(
        {
            "step": step_name,
            "hash": record.get("hash"),
            "tx_hash": record.get("tx_hash"),
            "timestamp": record.get("timestamp", datetime.utcnow().isoformat()),
        }
    )

    with open(ledger_path, "w") as f:
        json.dump(ledger, f, indent=2)


def load_step(order_id: str, step_name: str):
    file_path = os.path.join(BASE_DIR, order_id, f"{step_name}.json")
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r") as f:
        return json.load(f)


def load_ledger(order_id: str):
    ledger_path = os.path.join(BASE_DIR, order_id, "ledger.json")
    if not os.path.exists(ledger_path):
        return []
    with open(ledger_path, "r") as f:
        return json.load(f)
