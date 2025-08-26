import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrderCompletionCard from '../OrderCompletionCard';
import type { OrderCompletionData } from '../../utils/WorkflowDataExtractor';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

describe('OrderCompletionCard', () => {
  const mockOrderData: OrderCompletionData = {
    orderId: 'ORD-12345',
    model: 'Tesla Model S',
    quantity: 2,
    deliveryLocation: 'Los Angeles, CA',
    totalAmount: '$150,000.00',
    paymentLink: 'https://checkout.stripe.com/pay/cs_test_123456',
    blockchainTxHash:
      '0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
    buyerEmail: 'buyer@example.com',
    emailConfirmationId: 'email_123456',
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.open
    global.window.open = vi.fn();
  });

  it('renders order completion card with comprehensive data', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    // Check order summary data
    expect(screen.getByText('ORD-12345')).toBeInTheDocument();
    expect(screen.getByText('Tesla Model S')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$150,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('buyer@example.com')).toHaveLength(2); // Appears in summary and footer
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
  });

  it('displays payment link section correctly', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    expect(screen.getByText('Payment Link')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
  });

  it('displays blockchain transaction section correctly', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    expect(screen.getByText('Blockchain Transaction')).toBeInTheDocument();
    expect(screen.getByText('Recorded')).toBeInTheDocument();
    expect(
      screen.getByText('View on Polygon Amoy Testnet')
    ).toBeInTheDocument();
  });

  it('handles missing payment link gracefully', () => {
    const dataWithoutPayment = { ...mockOrderData, paymentLink: null };

    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={dataWithoutPayment}
      />
    );

    expect(screen.getByText('Payment link not available')).toBeInTheDocument();
    expect(screen.getByText('Payment Link Unavailable')).toBeInTheDocument();
  });

  it('handles missing blockchain hash gracefully', () => {
    const dataWithoutBlockchain = { ...mockOrderData, blockchainTxHash: null };

    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={dataWithoutBlockchain}
      />
    );

    expect(
      screen.getByText('Blockchain transaction not available')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Blockchain Pending')).toHaveLength(2); // Appears in button and badge
  });

  it('opens payment link when payment button is clicked', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    const paymentButton = screen
      .getByText('Complete Payment')
      .closest('button');
    fireEvent.click(paymentButton!);

    expect(global.window.open).toHaveBeenCalledWith(
      mockOrderData.paymentLink,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('opens blockchain link when blockchain button is clicked', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    const blockchainButton = screen
      .getByText('View on Blockchain')
      .closest('button');
    fireEvent.click(blockchainButton!);

    expect(global.window.open).toHaveBeenCalledWith(
      'https://amoy.polygonscan.com/tx/0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('calls onClose when close button is clicked', async () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    const closeButton = screen.getByLabelText(/close completion card/i);
    fireEvent.click(closeButton);

    // Wait for the setTimeout in handleClose to complete
    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalled();
      },
      { timeout: 200 }
    );
  });

  it('displays email confirmation when available', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    expect(screen.getByText('Email Confirmation')).toBeInTheDocument();
    expect(screen.getByText('ID: email_123456')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('shows appropriate status badges', () => {
    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={mockOrderData}
      />
    );

    expect(screen.getByText('Order Processed')).toBeInTheDocument();
    expect(screen.getByText('Payment Ready')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Recorded')).toBeInTheDocument();
    expect(screen.getByText('Email Sent')).toBeInTheDocument();
  });

  it('formats blockchain transaction link correctly', () => {
    const dataWithDifferentHash = {
      ...mockOrderData,
      blockchainTxHash:
        '26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83', // Without 0x prefix
    };

    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={dataWithDifferentHash}
      />
    );

    const blockchainButton = screen
      .getByText('View on Blockchain')
      .closest('button');
    fireEvent.click(blockchainButton!);

    expect(global.window.open).toHaveBeenCalledWith(
      'https://amoy.polygonscan.com/tx/0x26cb71bbb6d897b65ad1c7ac08188603012eb095e254ff8dbe195ecd0af1ba83',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('uses WorkflowDataExtractor interface correctly', () => {
    // Test that the component accepts OrderCompletionData from WorkflowDataExtractor
    const extractedData: OrderCompletionData = {
      orderId: 'WF-789',
      model: 'BMW X5',
      quantity: 1,
      deliveryLocation: 'New York, NY',
      totalAmount: '$75,000.00',
      paymentLink: 'https://checkout.stripe.com/pay/cs_live_abc123',
      blockchainTxHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      buyerEmail: 'customer@company.com',
      emailConfirmationId: 'conf_xyz789',
    };

    render(
      <OrderCompletionCard
        isVisible={true}
        onClose={mockOnClose}
        orderData={extractedData}
      />
    );

    // Verify all extracted data is displayed
    expect(screen.getByText('WF-789')).toBeInTheDocument();
    expect(screen.getByText('BMW X5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('$75,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('customer@company.com')[0]).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText('ID: conf_xyz789')).toBeInTheDocument();
  });
});
