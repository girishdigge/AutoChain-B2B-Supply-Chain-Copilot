import hashlib, json, logging

logger = logging.getLogger(__name__)


class HashEmitter:
    def _emit_with_hash(self, stage: str, payload: dict):
        serialized = json.dumps(payload, sort_keys=True)
        digest = hashlib.sha256(serialized.encode()).hexdigest()
        logger.info(f"[{stage}] output={payload} | hash={digest}")
        return {"stage": stage, "output": payload, "hash": digest}
