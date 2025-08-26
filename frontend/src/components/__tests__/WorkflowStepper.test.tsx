import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import WorkflowStepper from '../WorkflowStepper';
import type { WorkflowStepperProps } from '../WorkflowStepper';
import type { WorkflowStep } from '../../types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock StepCard component
vi.mock('../StepCard', () => ({
  default: ({
    step,
    isActive,
    isCompleted,
    onClick,
    compact,
    showConnector,
    connectorStatus,
  }: any) => (
    <div
      data-testid={`step-card-${step.id}`}
      data-active={isActive}
      data-completed={isCompleted}
      data-compact={compact}
      data-connector={showConnector}
      data-connector-status={connectorStatus}
      onClick={onClick}
      role='button'
      tabIndex={0}
    >
      <span>{step.name}</span>
      <span data-testid={`status-${step.id}`}>{step.status}</span>
    </div>
  ),
}));

describe('WorkflowStepper', () => {
  const mockSteps: WorkflowStep[] = [
    {
      id: 'extraction',
      name: 'Extraction',
      status: 'completed',
      logs: [],
      progress: 100,
    },
    {
      id: 'validation',
      name: 'Validation',
      status: 'completed',
      logs: [],
      progress: 100,
    },
    {
      id: 'inventory',
      name: 'Inventory',
      status: 'active',
      logs: [],
      progress: 50,
    },
    {
      id: 'pricing',
      name: 'Pricing',
      status: 'pending',
      logs: [],
      progress: 0,
    },
  ];

  const defaultProps: WorkflowStepperProps = {
    steps: mockSteps,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all workflow steps in vertical layout by default', () => {
    render(<WorkflowStepper {...defaultProps} />);

    // Should render all provided steps
    expect(screen.getByTestId('step-card-extraction')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-validation')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-inventory')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-pricing')).toBeInTheDocument();

    // Should also render missing pipeline steps as placeholders
    expect(screen.getByTestId('step-card-supplier')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-logistics')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-finance')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-confirmation')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-payment')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-blockchain')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-email')).toBeInTheDocument();
  });

  it('should render in horizontal layout when specified', () => {
    const { container } = render(
      <WorkflowStepper {...defaultProps} orientation='horizontal' />
    );

    // Should have horizontal layout classes
    const stepper = container.firstChild as HTMLElement;
    expect(stepper).toHaveClass(
      'flex',
      'items-center',
      'gap-4',
      'overflow-x-auto'
    );

    // Should render chevron separators in horizontal mode
    const chevrons = container.querySelectorAll('svg');
    expect(chevrons.length).toBeGreaterThan(0);
  });

  it('should mark current step as active', () => {
    render(<WorkflowStepper {...defaultProps} currentStep='inventory' />);

    const inventoryStep = screen.getByTestId('step-card-inventory');
    expect(inventoryStep).toHaveAttribute('data-active', 'true');

    const extractionStep = screen.getByTestId('step-card-extraction');
    expect(extractionStep).toHaveAttribute('data-active', 'false');
  });

  it('should mark completed steps correctly', () => {
    render(<WorkflowStepper {...defaultProps} currentStep='inventory' />);

    // Steps before current should be marked as completed
    const extractionStep = screen.getByTestId('step-card-extraction');
    expect(extractionStep).toHaveAttribute('data-completed', 'true');

    const validationStep = screen.getByTestId('step-card-validation');
    expect(validationStep).toHaveAttribute('data-completed', 'true');

    // Current and future steps should not be marked as completed
    const inventoryStep = screen.getByTestId('step-card-inventory');
    expect(inventoryStep).toHaveAttribute('data-completed', 'false');

    const pricingStep = screen.getByTestId('step-card-pricing');
    expect(pricingStep).toHaveAttribute('data-completed', 'false');
  });

  it('should handle step clicks when onStepClick is provided', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();

    render(<WorkflowStepper {...defaultProps} onStepClick={onStepClick} />);

    const inventoryStep = screen.getByTestId('step-card-inventory');
    await user.click(inventoryStep);

    expect(onStepClick).toHaveBeenCalledWith('inventory');
  });

  it('should not handle clicks when onStepClick is not provided', async () => {
    const user = userEvent.setup();
    render(<WorkflowStepper {...defaultProps} />);

    const inventoryStep = screen.getByTestId('step-card-inventory');

    // Should not throw error when clicked without onStepClick
    await user.click(inventoryStep);
    // No assertion needed, just ensuring no error is thrown
  });

  it('should create placeholder steps for missing pipeline steps', () => {
    const minimalSteps: WorkflowStep[] = [
      {
        id: 'extraction',
        name: 'Extraction',
        status: 'completed',
        logs: [],
        progress: 100,
      },
    ];

    render(<WorkflowStepper steps={minimalSteps} />);

    // Should create placeholders for all missing steps
    expect(screen.getByTestId('step-card-validation')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-inventory')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-pricing')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-supplier')).toBeInTheDocument();

    // Placeholder steps should have pending status
    expect(screen.getByTestId('status-validation')).toHaveTextContent(
      'pending'
    );
    expect(screen.getByTestId('status-inventory')).toHaveTextContent('pending');
  });

  it('should maintain correct step order according to pipeline', () => {
    // Provide steps in random order
    const unorderedSteps: WorkflowStep[] = [
      {
        id: 'pricing',
        name: 'Pricing',
        status: 'pending',
        logs: [],
        progress: 0,
      },
      {
        id: 'extraction',
        name: 'Extraction',
        status: 'completed',
        logs: [],
        progress: 100,
      },
      {
        id: 'inventory',
        name: 'Inventory',
        status: 'active',
        logs: [],
        progress: 50,
      },
    ];

    render(<WorkflowStepper steps={unorderedSteps} />);

    const stepCards = screen.getAllByTestId(/^step-card-/);
    const stepIds = stepCards.map((card) =>
      card.getAttribute('data-testid')?.replace('step-card-', '')
    );

    // Should be in pipeline order
    expect(stepIds).toEqual([
      'extraction',
      'validation',
      'inventory',
      'pricing',
      'supplier',
      'logistics',
      'finance',
      'confirmation',
      'payment',
      'blockchain',
      'email',
    ]);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WorkflowStepper {...defaultProps} className='custom-stepper' />
    );

    expect(container.firstChild).toHaveClass('custom-stepper');
  });

  it('should handle case-insensitive step IDs', () => {
    const stepsWithMixedCase: WorkflowStep[] = [
      {
        id: 'EXTRACTION',
        name: 'Extraction',
        status: 'completed',
        logs: [],
        progress: 100,
      },
      {
        id: 'Validation',
        name: 'Validation',
        status: 'active',
        logs: [],
        progress: 50,
      },
    ];

    render(
      <WorkflowStepper steps={stepsWithMixedCase} currentStep='VALIDATION' />
    );

    // Should find and use the steps despite case differences
    expect(screen.getByText('Extraction')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('should set compact mode for horizontal orientation', () => {
    render(<WorkflowStepper {...defaultProps} orientation='horizontal' />);

    const stepCards = screen.getAllByTestId(/^step-card-/);
    stepCards.forEach((card) => {
      expect(card).toHaveAttribute('data-compact', 'true');
    });
  });

  it('should not set compact mode for vertical orientation', () => {
    render(<WorkflowStepper {...defaultProps} orientation='vertical' />);

    const stepCards = screen.getAllByTestId(/^step-card-/);
    stepCards.forEach((card) => {
      // In vertical mode, compact is undefined, so the attribute is not set
      expect(card).not.toHaveAttribute('data-compact', 'true');
    });
  });

  it('should show connectors in vertical mode', () => {
    render(<WorkflowStepper {...defaultProps} orientation='vertical' />);

    const stepCards = screen.getAllByTestId(/^step-card-/);

    // All steps except the last should have connectors
    for (let i = 0; i < stepCards.length - 1; i++) {
      expect(stepCards[i]).toHaveAttribute('data-connector', 'true');
    }

    // Last step should not have connector
    expect(stepCards[stepCards.length - 1]).toHaveAttribute(
      'data-connector',
      'false'
    );
  });

  it('should set correct connector status based on step progress', () => {
    render(<WorkflowStepper {...defaultProps} currentStep='inventory' />);

    // Steps before current should have completed connectors
    const extractionStep = screen.getByTestId('step-card-extraction');
    expect(extractionStep).toHaveAttribute(
      'data-connector-status',
      'completed'
    );

    const validationStep = screen.getByTestId('step-card-validation');
    expect(validationStep).toHaveAttribute(
      'data-connector-status',
      'completed'
    );

    // Current step should have active connector
    const inventoryStep = screen.getByTestId('step-card-inventory');
    expect(inventoryStep).toHaveAttribute('data-connector-status', 'active');

    // Future steps should have pending connectors
    const pricingStep = screen.getByTestId('step-card-pricing');
    expect(pricingStep).toHaveAttribute('data-connector-status', 'pending');
  });

  it('should handle empty steps array', () => {
    render(<WorkflowStepper steps={[]} />);

    // Should still render all pipeline steps as placeholders
    expect(screen.getByTestId('step-card-extraction')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-validation')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-inventory')).toBeInTheDocument();

    // All should be pending
    expect(screen.getByTestId('status-extraction')).toHaveTextContent(
      'pending'
    );
    expect(screen.getByTestId('status-validation')).toHaveTextContent(
      'pending'
    );
  });

  it('should handle currentStep that does not exist in pipeline', () => {
    render(<WorkflowStepper {...defaultProps} currentStep='nonexistent' />);

    // Should not crash and should not mark any step as active
    const stepCards = screen.getAllByTestId(/^step-card-/);
    stepCards.forEach((card) => {
      expect(card).toHaveAttribute('data-active', 'false');
    });
  });

  it('should capitalize placeholder step names correctly', () => {
    render(<WorkflowStepper steps={[]} />);

    expect(screen.getByText('Extraction')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Supplier')).toBeInTheDocument();
    expect(screen.getByText('Logistics')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Blockchain')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });
});
