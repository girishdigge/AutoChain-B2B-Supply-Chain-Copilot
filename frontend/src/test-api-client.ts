// Simple test script to verify API client functionality
import { api } from './lib/apiProvider';
import { APIClientError } from './lib/api';
import { logger } from './lib/environment';

async function testAPIClient() {
  console.log('Testing API Client...');
  console.log('Current mode:', api.getCurrentMode());

  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const health = await api.getHealth();
    console.log('Health response:', health);

    // Test orders endpoint
    console.log('\n2. Testing orders endpoint...');
    const orders = await api.getOrders({ page: 1, limit: 5 });
    console.log('Orders response:', {
      total: orders.total,
      page: orders.page,
      orderCount: orders.orders.length,
    });

    // Test blockchain status
    console.log('\n3. Testing blockchain status...');
    const blockchain = await api.getBlockchainStatus();
    console.log('Blockchain response:', blockchain);

    // Test order submission (mock only)
    if (api.getCurrentMode() === 'mock') {
      console.log('\n4. Testing order submission (mock mode)...');
      const submission = await api.submitOrder('Test order: 10 widgets');
      console.log('Submission response:', submission);
    }

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('\n❌ API test failed:');
    if (error instanceof APIClientError) {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
      });
    } else {
      console.error('Unknown error:', error);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPIClient();
}

export { testAPIClient };
