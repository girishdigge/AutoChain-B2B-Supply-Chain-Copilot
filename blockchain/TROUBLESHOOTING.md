# Troubleshooting Guide - Polygon Blockchain Integration

This guide covers common issues and solutions for the Polygon Amoy testnet integration.

## Common Issues and Solutions

### 1. Import and Dependency Issues

#### Problem: "cannot import name 'geth_poa_middleware' from 'web3.middleware'"

**Symptoms**:

```
ImportError: cannot import name 'geth_poa_middleware' from 'web3.middleware'
```

**Solutions**:

1. **Check web3.py version**:

```bash
pip show web3
```

2. **Update to compatible version**:

```bash
pip install "web3>=7.13.0,<8.0.0"
```

3. **If issue persists, check middleware compatibility**:

   - The codebase automatically handles different web3 versions
   - For web3.py >= 6.0.0, it uses `ExtraDataToPOAMiddleware`
   - For older versions, it falls back to `geth_poa_middleware`

4. **Manual verification**:

```python
from web3 import Web3
try:
    from web3.middleware import ExtraDataToPOAMiddleware
    print("Using ExtraDataToPOAMiddleware")
except ImportError:
    from web3.middleware import geth_poa_middleware
    print("Using geth_poa_middleware")
```

#### Problem: Other dependency import errors

**Solutions**:

1. **Install all blockchain dependencies**:

```bash
pip install -r blockchain/requirements.txt
```

2. **Check Python version compatibility** (requires Python 3.8+):

```bash
python --version
```

3. **Clear pip cache if needed**:

```bash
pip cache purge
pip install --no-cache-dir -r blockchain/requirements.txt
```

### 2. Connection Issues

#### Problem: "Connection refused" or "Network unreachable"

**Symptoms**:

```
ConnectionError: HTTPSConnectionPool(host='rpc-amoy.polygon.technology', port=443)
```

**Solutions**:

1. **Check network connectivity**:

```bash
curl -X POST https://rpc-amoy.polygon.technology \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

2. **Try fallback RPC URLs**:

```bash
# Update .env with fallback URLs
POLYGON_FALLBACK_RPCS=https://polygon-amoy.drpc.org,https://rpc.ankr.com/polygon_amoy
```

3. **Check firewall settings**:

   - Ensure ports 443 and 80 are open
   - Check corporate firewall restrictions

4. **Use alternative RPC provider**:

```bash
# Alchemy
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# Infura
POLYGON_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_PROJECT_ID
```

#### Problem: "Invalid RPC response" or "JSON decode error"

**Solutions**:

1. **Validate RPC endpoint**:

```python
from web3 import Web3
w3 = Web3(Web3.HTTPProvider('https://rpc-amoy.polygon.technology'))
print(w3.is_connected())
print(w3.eth.chain_id)  # Should be 80002 for Amoy
```

2. **Check API key validity** (if using paid provider):

```bash
curl -X POST https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 2. Authentication and Wallet Issues

#### Problem: "Invalid private key format"

**Symptoms**:

```
ValueError: Private key must be exactly 32 bytes
```

**Solutions**:

1. **Check private key format**:

```python
# Correct format (64 hex characters, no 0x prefix)
POLYGON_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Incorrect formats:
# POLYGON_PRIVATE_KEY=0x1234...  # Remove 0x prefix
# POLYGON_PRIVATE_KEY=1234...    # Must be exactly 64 characters
```

2. **Validate private key**:

```python
from eth_account import Account
try:
    account = Account.from_key('your_private_key_here')
    print(f"Valid key, address: {account.address}")
except Exception as e:
    print(f"Invalid key: {e}")
```

#### Problem: "Insufficient funds for gas"

**Symptoms**:

```
ValueError: Insufficient funds. The account you tried to send transaction from does not have enough funds.
```

**Solutions**:

1. **Check wallet balance**:

```python
from web3 import Web3
w3 = Web3(Web3.HTTPProvider('https://rpc-amoy.polygon.technology'))
balance = w3.eth.get_balance('your_wallet_address')
print(f"Balance: {w3.from_wei(balance, 'ether')} MATIC")
```

2. **Get test MATIC from faucet**:

   - Visit: https://faucet.polygon.technology/
   - Select "Amoy Testnet"
   - Request test MATIC (may need to wait 24 hours between requests)

3. **Reduce gas price**:

```bash
# In .env file
POLYGON_GAS_PRICE_GWEI=20  # Reduce from default 30
POLYGON_GAS_LIMIT=300000   # Reduce from default 500000
```

### 3. Smart Contract Issues

#### Problem: "Contract not deployed" or "Invalid contract address"

**Symptoms**:

```
BadFunctionCallOutput: Could not decode contract function call
```

**Solutions**:

1. **Verify contract address**:

```python
from web3 import Web3
w3 = Web3(Web3.HTTPProvider('https://rpc-amoy.polygon.technology'))
code = w3.eth.get_code('your_contract_address')
if code == b'':
    print("Contract not deployed at this address")
else:
    print("Contract found")
```

2. **Deploy contract**:

```bash
python blockchain/deploy_contract.py
```

3. **Check contract on explorer**:
   - Visit: https://amoy.polygonscan.com/
   - Search for your contract address
   - Verify contract is deployed and verified

#### Problem: "Gas estimation failed"

**Symptoms**:

```
ValueError: Gas estimation failed
```

**Solutions**:

1. **Increase gas limit**:

```bash
POLYGON_GAS_LIMIT=800000  # Increase from default
```

2. **Check contract method parameters**:

```python
# Ensure parameters match contract ABI
contract.functions.recordOrder(
    order_id_hash,  # bytes32
    doc_hash,       # bytes32
    cid            # string
).estimate_gas()
```

3. **Test with manual gas estimation**:

```python
gas_estimate = contract.functions.your_method().estimate_gas({
    'from': wallet_address,
    'gasPrice': w3.to_wei(30, 'gwei')
})
print(f"Estimated gas: {gas_estimate}")
```

### 4. Transaction Issues

#### Problem: "Transaction timeout" or "Nonce too low"

**Symptoms**:

```
TimeoutError: Transaction was not mined within 120 seconds
ValueError: Nonce too low
```

**Solutions**:

1. **Check transaction status**:

```python
tx_hash = 'your_transaction_hash'
receipt = w3.eth.get_transaction_receipt(tx_hash)
print(f"Status: {receipt.status}")  # 1 = success, 0 = failed
```

2. **Reset nonce manually**:

```python
nonce = w3.eth.get_transaction_count(wallet_address, 'pending')
print(f"Current nonce: {nonce}")
```

3. **Increase timeout**:

```bash
POLYGON_TIMEOUT_SECONDS=300  # Increase from default 120
```

4. **Check network congestion**:
   - Visit: https://amoy.polygonscan.com/
   - Check recent block times and gas prices

#### Problem: "Transaction reverted" or "Execution reverted"

**Solutions**:

1. **Check revert reason**:

```python
try:
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    if receipt.status == 0:
        # Get revert reason
        tx = w3.eth.get_transaction(tx_hash)
        w3.eth.call(tx, tx.blockNumber)
except Exception as e:
    print(f"Revert reason: {e}")
```

2. **Validate input data**:

   - Check data types match contract ABI
   - Ensure string lengths are within limits
   - Verify numeric values are in valid ranges

3. **Test with lower-level call**:

```python
# Test contract call without sending transaction
result = contract.functions.your_method().call()
print(f"Call result: {result}")
```

### 5. Configuration Issues

#### Problem: "Configuration validation failed"

**Solutions**:

1. **Run configuration validator**:

```bash
python blockchain/validate_setup.py
```

2. **Check environment variables**:

```python
import os
required_vars = [
    'POLYGON_RPC_URL',
    'POLYGON_PRIVATE_KEY',
    'POLYGON_CHAIN_ID',
    'NOTARY_CONTRACT_ADDRESS'
]
for var in required_vars:
    value = os.getenv(var)
    print(f"{var}: {'✓' if value else '✗'}")
```

3. **Validate chain ID**:

```python
from web3 import Web3
w3 = Web3(Web3.HTTPProvider(os.getenv('POLYGON_RPC_URL')))
actual_chain_id = w3.eth.chain_id
expected_chain_id = int(os.getenv('POLYGON_CHAIN_ID', 80002))
print(f"Chain ID match: {actual_chain_id == expected_chain_id}")
```

### 6. Performance Issues

#### Problem: "Slow transaction processing"

**Solutions**:

1. **Optimize gas price**:

```python
# Get current gas price from network
gas_price = w3.eth.gas_price
recommended_price = int(gas_price * 1.1)  # 10% above current
print(f"Recommended gas price: {w3.from_wei(recommended_price, 'gwei')} Gwei")
```

2. **Use batch processing**:

```python
# Process multiple transactions in batch
transactions = []
for data in batch_data:
    tx = create_transaction(data)
    transactions.append(tx)

# Send all transactions
for tx in transactions:
    w3.eth.send_raw_transaction(tx)
```

3. **Implement connection pooling**:

```python
from web3 import Web3
from web3.middleware import geth_poa_middleware

# Use persistent connection
w3 = Web3(Web3.HTTPProvider(
    rpc_url,
    request_kwargs={'timeout': 60}
))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)
```

## Diagnostic Commands

### Quick Health Check

```bash
python -c "
from blockchain.config import load_polygon_config
from web3 import Web3
import os

config = load_polygon_config()
w3 = Web3(Web3.HTTPProvider(config.rpc_url))

print('=== Blockchain Health Check ===')
print(f'Connected: {w3.is_connected()}')
print(f'Chain ID: {w3.eth.chain_id}')
print(f'Latest block: {w3.eth.block_number}')
print(f'Wallet: {config.wallet_address}')
balance = w3.eth.get_balance(config.wallet_address)
print(f'Balance: {w3.from_wei(balance, \"ether\")} MATIC')
print(f'Contract: {config.contract_address}')
"
```

### Transaction Status Check

```bash
python -c "
import sys
from web3 import Web3
from blockchain.config import load_polygon_config

if len(sys.argv) < 2:
    print('Usage: python -c \"...\" <tx_hash>')
    sys.exit(1)

config = load_polygon_config()
w3 = Web3(Web3.HTTPProvider(config.rpc_url))
tx_hash = sys.argv[1]

try:
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    print(f'Status: {\"Success\" if receipt.status else \"Failed\"}')
    print(f'Block: {receipt.blockNumber}')
    print(f'Gas used: {receipt.gasUsed}')
except Exception as e:
    print(f'Transaction not found: {e}')
" <transaction_hash>
```

### Contract Interaction Test

```bash
python -c "
from blockchain.polygon_deployment import PolygonDeploymentService
from blockchain.config import load_polygon_config

config = load_polygon_config()
service = PolygonDeploymentService(config)

# Test contract interaction
try:
    result = service.interact_with_contract(
        config.contract_address,
        'recordOrder',
        {
            'orderIdHash': b'\\x00' * 32,
            'docHash': b'\\x00' * 32,
            'cid': 'test_cid'
        }
    )
    print(f'Contract test successful: {result}')
except Exception as e:
    print(f'Contract test failed: {e}')
"
```

## Getting Help

### Log Analysis

1. **Enable debug logging**:

```bash
POLYGON_LOG_LEVEL=DEBUG
```

2. **Check application logs**:

```bash
tail -f logs/blockchain.log
```

3. **Monitor transaction logs**:

```bash
grep "transaction" logs/blockchain.log | tail -20
```

### External Resources

- **Polygon Documentation**: https://docs.polygon.technology/
- **Web3.py Documentation**: https://web3py.readthedocs.io/
- **Amoy Testnet Explorer**: https://amoy.polygonscan.com/
- **Polygon Faucet**: https://faucet.polygon.technology/
- **Gas Tracker**: https://polygonscan.com/gastracker

### Support Channels

1. **Check existing issues** in project repository
2. **Review error logs** with full stack traces
3. **Test with minimal reproduction** case
4. **Document environment details** (OS, Python version, dependency versions)

## Prevention Best Practices

1. **Always test on Amoy testnet first**
2. **Use environment variables for sensitive data**
3. **Implement proper error handling and retries**
4. **Monitor gas prices and network congestion**
5. **Keep dependencies updated**
6. **Regular health checks and monitoring**
7. **Backup wallet private keys securely**
8. **Document configuration changes**
