# Security Best Practices - Blockchain Integration

This guide outlines security best practices for the Polygon blockchain integration to ensure safe handling of private keys, secure transactions, and data protection.

## Private Key Security

### 1. Storage and Management

**DO**:

- Store private keys in environment variables only
- Use different wallets for development, staging, and production
- Use testnet wallets with minimal test funds for development
- Implement key rotation policies for production environments
- Use hardware wallets or key management services for production

**DON'T**:

- Never commit private keys to version control
- Never hardcode private keys in source code
- Never share private keys via email, chat, or other insecure channels
- Never use production private keys in development/testing

### 2. Environment Variable Security

**Secure .env file setup**:

```bash
# Set restrictive permissions
chmod 600 .env

# Ensure .env is in .gitignore
echo ".env" >> .gitignore

# Use strong private keys (64 hex characters)
POLYGON_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Environment validation**:

```python
import os
import re

def validate_private_key():
    private_key = os.getenv('POLYGON_PRIVATE_KEY')

    if not private_key:
        raise ValueError("POLYGON_PRIVATE_KEY not set")

    # Remove 0x prefix if present
    if private_key.startswith('0x'):
        private_key = private_key[2:]

    # Validate format (64 hex characters)
    if not re.match(r'^[0-9a-fA-F]{64}$', private_key):
        raise ValueError("Invalid private key format")

    return private_key
```

### 3. Key Derivation and Wallet Creation

**Secure wallet creation**:

```python
from eth_account import Account
import secrets

# Generate cryptographically secure private key
private_key = secrets.token_hex(32)
account = Account.from_key(private_key)

print(f"Address: {account.address}")
print(f"Private Key: {private_key}")
print("Store private key securely and never share!")
```

## Transaction Security

### 1. Transaction Signing

**Secure transaction creation**:

```python
from web3 import Web3
from eth_account import Account

def create_secure_transaction(w3, private_key, to_address, data, gas_limit):
    account = Account.from_key(private_key)

    # Get current nonce
    nonce = w3.eth.get_transaction_count(account.address, 'pending')

    # Build transaction
    transaction = {
        'to': to_address,
        'value': 0,
        'gas': gas_limit,
        'gasPrice': w3.eth.gas_price,
        'nonce': nonce,
        'data': data,
        'chainId': w3.eth.chain_id
    }

    # Sign transaction
    signed_txn = account.sign_transaction(transaction)

    return signed_txn
```

### 2. Gas Price Security

**Prevent gas price manipulation**:

```python
def get_safe_gas_price(w3, max_gas_price_gwei=100):
    current_gas_price = w3.eth.gas_price
    max_gas_price = w3.to_wei(max_gas_price_gwei, 'gwei')

    # Use minimum of current price and maximum allowed
    safe_gas_price = min(current_gas_price, max_gas_price)

    return safe_gas_price
```

### 3. Transaction Validation

**Validate transactions before sending**:

```python
def validate_transaction(transaction):
    required_fields = ['to', 'gas', 'gasPrice', 'nonce', 'chainId']

    for field in required_fields:
        if field not in transaction:
            raise ValueError(f"Missing required field: {field}")

    # Validate addresses
    if not Web3.is_address(transaction['to']):
        raise ValueError("Invalid 'to' address")

    # Validate gas limits
    if transaction['gas'] > 1000000:  # 1M gas limit
        raise ValueError("Gas limit too high")

    # Validate chain ID
    if transaction['chainId'] not in [80002, 137]:  # Amoy or Polygon
        raise ValueError("Invalid chain ID")

    return True
```

## Data Protection

### 1. Sensitive Data Hashing

**Hash PII before blockchain storage**:

```python
import hashlib
import json

def hash_sensitive_data(data):
    """Hash sensitive data before storing on blockchain"""

    # Identify sensitive fields
    sensitive_fields = [
        'email', 'phone', 'address', 'name',
        'credit_card', 'ssn', 'passport'
    ]

    hashed_data = data.copy()

    for field in sensitive_fields:
        if field in hashed_data:
            # Hash the sensitive value
            original_value = str(hashed_data[field])
            hash_value = hashlib.sha256(original_value.encode()).hexdigest()
            hashed_data[field] = f"hash:{hash_value[:16]}..."  # Truncated hash

    return hashed_data

def create_data_hash(data):
    """Create deterministic hash of data for blockchain storage"""
    # Sort keys for consistent hashing
    sorted_data = json.dumps(data, sort_keys=True)
    return hashlib.sha256(sorted_data.encode()).hexdigest()
```

### 2. Data Encryption

**Encrypt sensitive data before storage**:

```python
from cryptography.fernet import Fernet
import os
import base64

def get_encryption_key():
    """Get or create encryption key from environment"""
    key = os.getenv('DATA_ENCRYPTION_KEY')
    if not key:
        # Generate new key (store securely!)
        key = Fernet.generate_key()
        print(f"Generated new encryption key: {key.decode()}")
        print("Store this key securely in DATA_ENCRYPTION_KEY environment variable")
    else:
        key = key.encode()
    return key

def encrypt_data(data, key):
    """Encrypt data for secure storage"""
    f = Fernet(key)
    json_data = json.dumps(data)
    encrypted_data = f.encrypt(json_data.encode())
    return base64.b64encode(encrypted_data).decode()

def decrypt_data(encrypted_data, key):
    """Decrypt data for use"""
    f = Fernet(key)
    encrypted_bytes = base64.b64decode(encrypted_data.encode())
    decrypted_data = f.decrypt(encrypted_bytes)
    return json.loads(decrypted_data.decode())
```

## Network Security

### 1. RPC Endpoint Security

**Secure RPC configuration**:

```python
import requests
from urllib.parse import urlparse

def validate_rpc_endpoint(rpc_url):
    """Validate RPC endpoint security"""

    parsed_url = urlparse(rpc_url)

    # Ensure HTTPS
    if parsed_url.scheme != 'https':
        raise ValueError("RPC URL must use HTTPS")

    # Validate domain
    trusted_domains = [
        'polygon-amoy.g.alchemy.com',
        'rpc-amoy.polygon.technology',
        'polygon-amoy.infura.io',
        'rpc.ankr.com'
    ]

    if not any(domain in parsed_url.netloc for domain in trusted_domains):
        print(f"Warning: Using untrusted RPC endpoint: {parsed_url.netloc}")

    return True

def test_rpc_security(rpc_url):
    """Test RPC endpoint security"""
    try:
        response = requests.post(
            rpc_url,
            json={
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 1
            },
            timeout=10,
            verify=True  # Verify SSL certificates
        )

        if response.status_code == 200:
            return True
        else:
            raise ValueError(f"RPC endpoint returned status: {response.status_code}")

    except requests.exceptions.SSLError:
        raise ValueError("SSL certificate verification failed")
    except requests.exceptions.Timeout:
        raise ValueError("RPC endpoint timeout")
```

### 2. Rate Limiting and DoS Protection

**Implement rate limiting**:

```python
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_requests=10, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = defaultdict(list)

    def is_allowed(self, identifier):
        now = time.time()

        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.time_window
        ]

        # Check if under limit
        if len(self.requests[identifier]) < self.max_requests:
            self.requests[identifier].append(now)
            return True

        return False

# Usage
rate_limiter = RateLimiter(max_requests=5, time_window=60)

def secure_blockchain_call(function, *args, **kwargs):
    caller_id = "blockchain_service"  # Could be IP, user ID, etc.

    if not rate_limiter.is_allowed(caller_id):
        raise ValueError("Rate limit exceeded")

    return function(*args, **kwargs)
```

## Access Control

### 1. Role-Based Access

**Implement access control**:

```python
from enum import Enum
from functools import wraps

class Role(Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

class Permission(Enum):
    DEPLOY_CONTRACT = "deploy_contract"
    SEND_TRANSACTION = "send_transaction"
    VIEW_TRANSACTIONS = "view_transactions"

ROLE_PERMISSIONS = {
    Role.ADMIN: [Permission.DEPLOY_CONTRACT, Permission.SEND_TRANSACTION, Permission.VIEW_TRANSACTIONS],
    Role.OPERATOR: [Permission.SEND_TRANSACTION, Permission.VIEW_TRANSACTIONS],
    Role.VIEWER: [Permission.VIEW_TRANSACTIONS]
}

def require_permission(permission):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get user role from context (implement based on your auth system)
            user_role = get_current_user_role()

            if permission not in ROLE_PERMISSIONS.get(user_role, []):
                raise PermissionError(f"Insufficient permissions for {permission.value}")

            return func(*args, **kwargs)
        return wrapper
    return decorator

@require_permission(Permission.SEND_TRANSACTION)
def send_blockchain_transaction(transaction_data):
    # Implementation here
    pass
```

### 2. Audit Logging

**Implement comprehensive audit logging**:

```python
import logging
import json
from datetime import datetime

# Configure audit logger
audit_logger = logging.getLogger('blockchain_audit')
audit_handler = logging.FileHandler('logs/blockchain_audit.log')
audit_formatter = logging.Formatter('%(asctime)s - %(message)s')
audit_handler.setFormatter(audit_formatter)
audit_logger.addHandler(audit_handler)
audit_logger.setLevel(logging.INFO)

def log_blockchain_action(action, user_id, details):
    """Log blockchain actions for audit trail"""
    audit_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'action': action,
        'user_id': user_id,
        'details': details,
        'ip_address': get_client_ip(),  # Implement based on your system
    }

    audit_logger.info(json.dumps(audit_entry))

# Usage examples
log_blockchain_action('TRANSACTION_SENT', 'user123', {
    'tx_hash': '0x1234...',
    'to_address': '0x5678...',
    'gas_used': 21000
})

log_blockchain_action('CONTRACT_DEPLOYED', 'admin456', {
    'contract_address': '0x9abc...',
    'contract_name': 'Notary'
})
```

## Monitoring and Alerting

### 1. Security Monitoring

**Monitor for suspicious activity**:

```python
import smtplib
from email.mime.text import MIMEText

class SecurityMonitor:
    def __init__(self):
        self.failed_attempts = defaultdict(int)
        self.alert_threshold = 5

    def record_failed_attempt(self, identifier, reason):
        self.failed_attempts[identifier] += 1

        if self.failed_attempts[identifier] >= self.alert_threshold:
            self.send_security_alert(identifier, reason)

    def send_security_alert(self, identifier, reason):
        message = f"""
        Security Alert: Multiple failed attempts detected

        Identifier: {identifier}
        Reason: {reason}
        Failed Attempts: {self.failed_attempts[identifier]}
        Time: {datetime.utcnow()}

        Please investigate immediately.
        """

        # Send alert (implement based on your notification system)
        print(f"SECURITY ALERT: {message}")
        # send_email_alert(message)
        # send_slack_alert(message)

security_monitor = SecurityMonitor()

def secure_operation(operation_func, identifier):
    try:
        return operation_func()
    except Exception as e:
        security_monitor.record_failed_attempt(identifier, str(e))
        raise
```

### 2. Health Monitoring

**Monitor blockchain service health**:

```python
def check_blockchain_health():
    """Comprehensive health check for blockchain service"""
    health_status = {
        'timestamp': datetime.utcnow().isoformat(),
        'status': 'healthy',
        'checks': {}
    }

    try:
        # Check network connectivity
        config = load_polygon_config()
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))

        health_status['checks']['network_connected'] = w3.is_connected()
        health_status['checks']['latest_block'] = w3.eth.block_number

        # Check wallet balance
        balance = w3.eth.get_balance(config.wallet_address)
        balance_matic = float(w3.from_wei(balance, 'ether'))
        health_status['checks']['wallet_balance'] = balance_matic

        # Alert if balance is low
        if balance_matic < 0.1:  # Less than 0.1 MATIC
            health_status['status'] = 'warning'
            health_status['alerts'] = ['Low wallet balance']

        # Check contract deployment
        if config.contract_address:
            code = w3.eth.get_code(config.contract_address)
            health_status['checks']['contract_deployed'] = len(code) > 0

    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['error'] = str(e)

    return health_status

# Run health check periodically
import schedule
import time

def run_health_monitoring():
    schedule.every(5).minutes.do(lambda: print(json.dumps(check_blockchain_health(), indent=2)))

    while True:
        schedule.run_pending()
        time.sleep(60)
```

## Incident Response

### 1. Security Incident Procedures

**Steps to take if security is compromised**:

1. **Immediate Actions**:

   - Disable affected services
   - Rotate compromised private keys
   - Change all passwords and API keys
   - Document the incident

2. **Investigation**:

   - Review audit logs
   - Identify scope of compromise
   - Determine attack vector
   - Assess data exposure

3. **Recovery**:

   - Deploy new secure configurations
   - Update security measures
   - Test all systems
   - Monitor for continued threats

4. **Post-Incident**:
   - Update security procedures
   - Train team on new measures
   - Implement additional monitoring
   - Document lessons learned

### 2. Emergency Procedures

**Emergency wallet recovery**:

```python
def emergency_wallet_recovery():
    """Emergency procedure to secure funds"""

    print("EMERGENCY WALLET RECOVERY PROCEDURE")
    print("1. Generate new secure wallet")

    # Generate new wallet
    new_account = Account.create()
    print(f"New wallet address: {new_account.address}")
    print(f"New private key: {new_account.key.hex()}")

    print("2. Transfer funds to new wallet")
    print("3. Update all configurations with new wallet")
    print("4. Revoke access to old wallet")
    print("5. Update monitoring systems")

    return new_account

def emergency_contract_pause():
    """Emergency procedure to pause contract operations"""
    # Implement contract pause functionality if available
    print("EMERGENCY CONTRACT PAUSE")
    print("1. Call contract pause function")
    print("2. Verify all operations are stopped")
    print("3. Investigate security issue")
    print("4. Implement fixes")
    print("5. Resume operations after verification")
```

## Security Checklist

### Pre-Deployment Security Checklist

- [ ] Private keys stored securely in environment variables
- [ ] All sensitive data is hashed before blockchain storage
- [ ] RPC endpoints use HTTPS and are from trusted providers
- [ ] Gas limits and prices have reasonable maximum values
- [ ] Rate limiting is implemented for blockchain operations
- [ ] Comprehensive audit logging is configured
- [ ] Error handling doesn't expose sensitive information
- [ ] Access control and permissions are properly configured
- [ ] Security monitoring and alerting is set up
- [ ] Incident response procedures are documented
- [ ] All dependencies are up to date and security-scanned
- [ ] Test environment uses separate wallets and contracts

### Ongoing Security Maintenance

- [ ] Regular security audits and penetration testing
- [ ] Monitor for suspicious transaction patterns
- [ ] Keep dependencies updated with security patches
- [ ] Regular backup and recovery testing
- [ ] Review and update access permissions
- [ ] Monitor wallet balances and set up low-balance alerts
- [ ] Regular review of audit logs
- [ ] Update security procedures based on new threats
- [ ] Train team on security best practices
- [ ] Regular health checks and monitoring

Remember: Security is an ongoing process, not a one-time setup. Regularly review and update these practices based on new threats and best practices in the blockchain security community.
