// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Notary
 * @dev Smart contract for notarizing order documents on Polygon blockchain
 * @notice This contract allows recording order hashes and document hashes for immutable audit trails
 */
contract Notary {
    // Event emitted when an order is notarized
    event OrderNotarized(
        bytes32 indexed orderIdHash,
        bytes32 docHash,
        string cid,
        address indexed sender,
        uint256 timestamp
    );

    // Mapping to store notarized orders
    mapping(bytes32 => NotarizedOrder) public notarizedOrders;

    // Struct to store order information
    struct NotarizedOrder {
        bytes32 docHash;
        string cid;
        address notarizer;
        uint256 timestamp;
        bool exists;
    }

    // Counter for total notarized orders
    uint256 public totalNotarizedOrders;

    /**
     * @dev Record an order on the blockchain
     * @param orderIdHash Hash of the order ID
     * @param docHash Hash of the order document
     * @param cid IPFS Content Identifier (optional)
     */
    function recordOrder(
        bytes32 orderIdHash,
        bytes32 docHash,
        string memory cid
    ) external {
        require(orderIdHash != bytes32(0), "Order ID hash cannot be empty");
        require(docHash != bytes32(0), "Document hash cannot be empty");

        // Store the notarized order
        notarizedOrders[orderIdHash] = NotarizedOrder({
            docHash: docHash,
            cid: cid,
            notarizer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        // Increment counter
        totalNotarizedOrders++;

        // Emit event
        emit OrderNotarized(
            orderIdHash,
            docHash,
            cid,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Get notarized order information
     * @param orderIdHash Hash of the order ID
     * @return docHash Document hash
     * @return cid IPFS Content Identifier
     * @return notarizer Address that notarized the order
     * @return timestamp When the order was notarized
     * @return exists Whether the order exists
     */
    function getNotarizedOrder(bytes32 orderIdHash)
        external
        view
        returns (
            bytes32 docHash,
            string memory cid,
            address notarizer,
            uint256 timestamp,
            bool exists
        )
    {
        NotarizedOrder memory order = notarizedOrders[orderIdHash];
        return (
            order.docHash,
            order.cid,
            order.notarizer,
            order.timestamp,
            order.exists
        );
    }

    /**
     * @dev Check if an order has been notarized
     * @param orderIdHash Hash of the order ID
     * @return Whether the order has been notarized
     */
    function isOrderNotarized(bytes32 orderIdHash) external view returns (bool) {
        return notarizedOrders[orderIdHash].exists;
    }

    /**
     * @dev Verify that a document hash matches the stored hash for an order
     * @param orderIdHash Hash of the order ID
     * @param docHash Document hash to verify
     * @return Whether the document hash matches
     */
    function verifyDocumentHash(bytes32 orderIdHash, bytes32 docHash)
        external
        view
        returns (bool)
    {
        return notarizedOrders[orderIdHash].docHash == docHash;
    }

    /**
     * @dev Get the total number of notarized orders
     * @return Total count of notarized orders
     */
    function getTotalNotarizedOrders() external view returns (uint256) {
        return totalNotarizedOrders;
    }
}