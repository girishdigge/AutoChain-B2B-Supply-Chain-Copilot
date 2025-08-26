# Smart Contract Deployment

This directory contains the Notary smart contract and deployment utilities for Polygon Amoy testnet integration.

## Files

- `Notary.sol` - The main smart contract for notarizing orders
- `Notary.json` - Contract deployment information and ABI (generated after deployment)
- `Notary.abi.json` - Contract ABI only (generated after deployment)

## Contract Overview

The Notary contract provides the following functionality:

### Functions

- `recordOrder(bytes32 orderIdHash, bytes32 docHash, string cid)` - Record an order on the blockchain
- `getNotarizedOrder(bytes32 orderIdHash)` - Get notarized order information
- `isOrderNotarized(bytes32 orderIdHash)` - Check if an order has been notarized
- `verifyDocumentHash(bytes32 orderIdHash, bytes32 docHash)` - Verify document hash matches stored hash
- `getTotalNotarizedOrders()` - Get total number of notarized orders

### Events

- `OrderNotarized(bytes32 indexed orderIdHash, bytes32 docHash, string cid, address indexed sender, uint256 timestamp)` - Emitted when an order is notarized

## Deployment Process

### Prerequisites

1. Install dependencies:

   ```bash
   pip install -r blockchain/requirements.txt
   ```

2. Set up environment variables in `.env`:

   ```bash
   POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
   POLYGON_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   POLYGON_CHAIN_ID=80002
   ```

3. Ensure you have test MATIC in your wallet for deployment

### Deploy Contract

Run the deployment script:

```bash
python blockchain/deploy_contract.py
```

The script will:

1. Check prerequisites (network connection, balance, compiler)
2. Install Solidity compiler if needed
3. Compile the Notary.sol contract
4. Deploy to Polygon Amoy testnet
5. Verify deployment
6. Test basic functionality
7. Save deployment info to `Notary.json`

### Verify Deployment

After deployment, the script will automatically:

- Verify contract code exists at the deployed address
- Test basic contract functionality
- Save deployment information and ABI

### Manual Testing

You can test the contract interaction using:

```bash
python blockchain/test_contract_deployment.py
```

## Usage in Application

After deployment, update your `.env` file with the contract address:

```bash
NOTARY_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

Then use the contract utilities:

```python
from blockchain.contract_utils import create_contract_manager

# Create contract manager
manager = create_contract_manager()

# Record an order
result = manager.record_order("order_123", "document_hash", "ipfs_cid")

# Get order information
order_info = manager.get_order_record("order_123")

# Check if order is notarized
is_notarized = manager.is_order_notarized("order_123")
```

## Security Notes

- Never commit private keys to version control
- Use testnet wallets with test MATIC only
- Validate all inputs before sending to contract
- Monitor gas prices to avoid high transaction costs

## Troubleshooting

### Common Issues

1. **Insufficient balance**: Ensure wallet has at least 0.01 MATIC for deployment
2. **Network connection**: Check RPC URL and network connectivity
3. **Gas estimation failed**: Network may be congested, try again later
4. **Compilation failed**: Ensure Solidity compiler is installed correctly

### Getting Help

- Check the deployment logs for detailed error messages
- Verify environment variables are set correctly
- Test network connectivity with `blockchain/validate_setup.py`
- Review Polygon Amoy testnet status

## Contract Verification

After deployment, you can verify the contract on PolygonScan:

1. Go to https://amoy.polygonscan.com/
2. Search for your contract address
3. Go to "Contract" tab
4. Click "Verify and Publish"
5. Upload the Notary.sol source code
6. Set compiler version to 0.8.19
7. Submit for verification

This makes the contract source code publicly viewable and enables better interaction through the block explorer.
