import logging
from blockchain.chain import Chain
from blockchain.config import Config
from blockchain.anchor import Anchor
from tools.order_extraction import OrderExtractionTool

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s"
)


def main():
    config = Config()
    chain = Chain(config)
    anchor = Anchor(config)

    logging.info("=== Running Portia Demo Plan ===")

    # Step 1: extract order
    extraction_tool = OrderExtractionTool()
    result = extraction_tool.run()
    block = chain.add_block(result)
    anchor.anchor_hash(block.hash)

    logging.info("Chain verified: %s", chain.verify())


if __name__ == "__main__":
    main()
