# Blockchain Integration

This directory contains the blockchain integration components for the Portia AI system, including Polygon Amoy testnet integration.

## Quick Start

For detailed setup instructions, see the [Deployment Guide](DEPLOYMENT_GUIDE.md).

### 1. Dependencies

Install required dependencies:

```bash
pip install -r blockchain/requirements.txt
```

### 2. Configuration

Copy and configure environment variables:

```bash
cp blockchain/.env.example .env
# Edit .env with your actual values
```

### 3. Validation

Validate your setup:

```bash
python blockchain/validate_setup.py
```

## Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete setup and deployment instructions
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security Guide](SECURITY_GUIDE.md)** - Security best practices and procedures

## Components

### Core Components

- `config.py` - Configuration classes for blockchain and Polygon settings
- `polygon_deployment.py` - Polygon network deployment service
- `models.py` - Data models for blockchain transactions
- `contract_utils.py` - Smart contract interaction utilities

### Configuration

- `requirements.txt` - Python dependencies for blockchain functionality
- `.env.example` - Template for environment variables
- `validate_setup.py` - Setup validation script

### Smart Contracts

- `contracts/` - Smart contract source code and ABI files
- `deploy_contract.py` - Contract deployment script

### Testing

- `test_*.py` - Comprehensive test suite for blockchain integration
- `validate_*.py` - Validation and integration test scripts

## Quick Reference

### Environment Variables

```bash
# Network Configuration
POLYGON_NETWORK=amoy
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CHAIN_ID=80002

# Security
POLYGON_PRIVATE_KEY=your_private_key_here
NOTARY_CONTRACT_ADDRESS=your_contract_address_here

# Gas Settings
POLYGON_GAS_LIMIT=500000
POLYGON_GAS_PRICE_GWEI=30
```

### Common Commands

```bash
# Validate setup
python blockchain/validate_setup.py

# Deploy contract
python blockchain/deploy_contract.py

# Run tests
python -m pytest blockchain/test_*.py

# Health check
python -c "from blockchain.config import load_polygon_config; print('Config loaded successfully')"
```

## Security Notes

⚠️ **Important Security Reminders**:

- Never commit private keys to version control
- Use testnet wallets with test MATIC only
- Store sensitive configuration in environment variables
- Follow the [Security Guide](SECURITY_GUIDE.md) for best practices

## Support

If you encounter issues:

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review application logs
3. Validate your configuration with `validate_setup.py`
4. Ensure you have sufficient test MATIC for transactions

For detailed information on each component, refer to the respective documentation files.
