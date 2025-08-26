# Polygon Amoy Testnet Integration - Deployment Guide

This guide provides step-by-step instructions for setting up and deploying the blockchain integration with Polygon Amoy testnet.

## Prerequisites

### System Requirements

- Python 3.8 or higher
- Node.js 16+ (for smart contract compilation, if needed)
- Git
- Internet connection for blockchain network access

### Required Accounts and Services

1. **Polygon Wallet**: Create a wallet for Amoy testnet
2. **Test MATIC**: Obtain test MATIC from Polygon faucet
3. **RPC Provider**: Alchemy, Infura, or use public RPC endpoints

## Step 1: Environment Setup

### 1.1 Install Dependencies

```bash
# Install Python dependencies
pip install -r blockchain/requirements.txt

# Verify installation
python -c "import web3; print('Web3 version:', web3.__version__)"

# Test blockchain imports
python -c "from blockchain.polygon_deployment import PolygonDeploymentService; print('Blockchain imports successful')"
```

**Note**: If you encounter import errors with `geth_poa_middleware`, this is automatically handled by the codebase for different web3.py versions. See the troubleshooting guide if issues persist.

### 1.2 Create Environment Configuration

1. Copy the environment template:

```bash
cp blockchain/.env.example .env
```

2. Edit `.env` file with your actual values:

```bash
# Required - Update these values
POLYGON_NETWORK=amoy
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CHAIN_ID=80002
POLYGON_PRIVATE_KEY=your_64_character_private_key_without_0x
NOTARY_CONTRACT_ADDRESS=your_deployed_contract_address

# Optional - Adjust as needed
POLYGON_GAS_LIMIT=500000
POLYGON_GAS_PRICE_GWEI=30
POLYGON_MAX_RETRIES=3
```

### 1.3 Validate Configuration

Run the validation script to check your setup:

```bash
python blockchain/validate_setup.py
```

Expected output:

```
✓ Configuration loaded successfully
✓ Web3 connection established
✓ Wallet address: 0x1234...
✓ Balance: 1.5 MATIC
✓ Contract address valid
✓ All validations passed
```

## Step 2: Wallet Setup

### 2.1 Create Testnet Wallet

1. **Using MetaMask**:

   - Install MetaMask browser extension
   - Create new wallet or import existing
   - Add Polygon Amoy testnet network:
     - Network Name: Polygon Amoy Testnet
     - RPC URL: https://rpc-amoy.polygon.technology
     - Chain ID: 80002
     - Currency Symbol: MATIC
     - Block Explorer: https://amoy.polygonscan.com

2. **Using Python (programmatic)**:

```python
from eth_account import Account
account = Account.create()
print(f"Address: {account.address}")
print(f"Private Key: {account.key.hex()}")
```

### 2.2 Fund Wallet with Test MATIC

1. Visit Polygon Faucet: https://faucet.polygon.technology/
2. Select "Amoy Testnet"
3. Enter your wallet address
4. Request test MATIC (usually 0.1-1 MATIC per request)
5. Wait for confirmation (usually 1-2 minutes)

### 2.3 Verify Wallet Balance

```bash
python -c "
from blockchain.config import load_polygon_config
from web3 import Web3

config = load_polygon_config()
w3 = Web3(Web3.HTTPProvider(config.rpc_url))
balance = w3.eth.get_balance(config.wallet_address)
print(f'Balance: {w3.from_wei(balance, \"ether\")} MATIC')
"
```

## Step 3: Smart Contract Deployment

### 3.1 Deploy Notary Contract

If the contract isn't already deployed, run:

```bash
python blockchain/deploy_contract.py
```

This will:

- Compile the Notary.sol contract
- Deploy to Amoy testnet
- Update the contract address in configuration
- Generate ABI file

### 3.2 Verify Contract Deployment

```bash
python blockchain/validate_contract_integration.py
```

Expected output:

```
✓ Contract deployed at: 0x1234...
✓ Contract ABI loaded
✓ Test transaction successful
✓ Contract integration verified
```

## Step 4: Integration Testing

### 4.1 Test Blockchain Tool Integration

```bash
python -c "
from tools.blockchain_tool import BlockchainTool
from blockchain.config import load_polygon_config

tool = BlockchainTool()
result = tool.run(
    context={},
    step_name='test_deployment',
    data={'test': 'data'},
    order_id='test_order_123'
)
print(f'Result: {result}')
"
```

### 4.2 Test End-to-End Workflow

```bash
python test_polygon_integration_tests.py
```

This runs comprehensive tests including:

- Local blockchain creation
- Polygon deployment
- Smart contract interaction
- Error handling scenarios

## Step 5: Production Deployment

### 5.1 Security Checklist

- [ ] Private keys stored securely (environment variables, not in code)
- [ ] Using testnet for initial deployment
- [ ] Gas limits and prices configured appropriately
- [ ] Error handling and retry logic tested
- [ ] Monitoring and logging configured
- [ ] Backup and recovery procedures documented

### 5.2 Environment-Specific Configuration

**Development Environment**:

```bash
POLYGON_NETWORK=amoy
POLYGON_LOG_LEVEL=DEBUG
DEBUG_BLOCKCHAIN=true
```

**Staging Environment**:

```bash
POLYGON_NETWORK=amoy
POLYGON_LOG_LEVEL=INFO
POLYGON_ENABLE_MONITORING=true
```

**Production Environment** (when ready for mainnet):

```bash
POLYGON_NETWORK=polygon
POLYGON_CHAIN_ID=137
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_LOG_LEVEL=WARNING
POLYGON_ENABLE_MONITORING=true
POLYGON_METRICS_ENABLED=true
```

## Step 6: Monitoring and Maintenance

### 6.1 Transaction Monitoring

Monitor transactions using:

- Polygon Amoy Explorer: https://amoy.polygonscan.com
- Application logs
- Custom monitoring scripts

### 6.2 Health Checks

Create a health check script:

```python
# health_check.py
from blockchain.polygon_deployment import PolygonDeploymentService
from blockchain.config import load_polygon_config

def health_check():
    try:
        config = load_polygon_config()
        service = PolygonDeploymentService(config)

        # Check network connectivity
        latest_block = service.w3.eth.get_block('latest')
        print(f"✓ Network connected - Latest block: {latest_block.number}")

        # Check wallet balance
        balance = service.w3.eth.get_balance(config.wallet_address)
        balance_matic = service.w3.from_wei(balance, 'ether')
        print(f"✓ Wallet balance: {balance_matic} MATIC")

        # Check contract
        if config.contract_address:
            code = service.w3.eth.get_code(config.contract_address)
            if code:
                print(f"✓ Contract deployed at: {config.contract_address}")
            else:
                print(f"✗ Contract not found at: {config.contract_address}")

        return True
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False

if __name__ == "__main__":
    health_check()
```

Run health check:

```bash
python health_check.py
```

## Next Steps

After successful deployment:

1. **Integration**: Update `main.py` to include blockchain tool configuration
2. **Testing**: Run comprehensive integration tests
3. **Monitoring**: Set up continuous monitoring
4. **Documentation**: Update API documentation
5. **Training**: Train team on new blockchain features

## Support

For issues or questions:

1. Check the troubleshooting guide below
2. Review application logs
3. Consult Polygon documentation: https://docs.polygon.technology/
4. Check Web3.py documentation: https://web3py.readthedocs.io/
