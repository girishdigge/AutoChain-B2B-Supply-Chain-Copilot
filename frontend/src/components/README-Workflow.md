# Workflow Components

This document describes the WorkflowStepper and StepCard components implemented for the AI Supply Chain Frontend.

## Components

### WorkflowStepper

The main component for displaying workflow pipeline visualization.

**Props:**

- `steps: WorkflowStep[]` - Array of workflow steps to display
- `currentStep?: string` - ID of the currently active step
- `orientation?: 'horizontal' | 'vertical'` - Layout orientation (default: 'vertical')
- `onStepClick?: (stepId: string) => void` - Callback when a step is clicked
- `className?: string` - Additional CSS classes

**Features:**

- Displays the standard workflow pipeline: Extraction → Validation → Inventory → Pricing → Supplier → Logistics → Finance → Confirmation → Payment → Blockchain → Email
- Supports both horizontal and vertical layouts
- Animated step transitions using Framer Motion
- Automatic step ordering based on predefined pipeline
- Creates placeholder steps for missing pipeline steps

### StepCard

Individual step card component used within WorkflowStepper.

**Props:**

- `step: WorkflowStep` - The workflow step data
- `isActive?: boolean` - Whether this step is currently active
- `isCompleted?: boolean` - Whether this step has been completed
- `onClick?: () => void` - Click handler for the step
- `compact?: boolean` - Whether to use compact layout
- `showConnector?: boolean` - Whether to show connector line (for vertical layout)
- `connectorStatus?: 'pending' | 'active' | 'completed'` - Status of the connector line
- `className?: string` - Additional CSS classes

**Features:**

- Status visualization with animated icons and colors
- Expandable log preview section
- Progress bar for active steps
- Error message display
- Duration tracking and display
- Animated hover effects and status transitions
- Support for both compact and full layouts

## Usage Examples

### Basic Usage

```tsx
import WorkflowStepper from '../components/WorkflowStepper';
import { WorkflowStep } from '../types';

const steps: WorkflowStep[] = [
  {
    id: 'extraction',
    name: 'Extraction',
    status: 'completed',
    logs: [],
    progress: 100,
  },
  // ... more steps
];

<WorkflowStepper
  steps={steps}
  currentStep='inventory'
  onStepClick={(stepId) => console.log('Clicked:', stepId)}
/>;
```

### Horizontal Layout

```tsx
<WorkflowStepper steps={steps} orientation='horizontal' currentStep='pricing' />
```

### Individual Step Card

```tsx
import StepCard from '../components/StepCard';

<StepCard
  step={step}
  isActive={true}
  onClick={() => handleStepClick(step.id)}
/>;
```

## Animations

The components use Framer Motion for smooth animations:

- **Entry animations**: Staggered fade-in with spring physics
- **Hover effects**: Scale and shadow transitions
- **Status changes**: Color and icon transitions
- **Progress updates**: Smooth progress bar animations
- **Log expansion**: Height and opacity transitions

## Styling

The components follow the design system requirements:

- **Rounded borders**: `rounded-2xl` for cards, `rounded-lg` for smaller elements
- **Glassmorphism effects**: Subtle shadows and transparency
- **Gradient accents**: Status-based color coding
- **Dark mode support**: Full dark mode compatibility
- **Responsive design**: Works on mobile and desktop

## Status Types

The components support the following status types:

- `pending` - Step has not started (gray)
- `active` - Step is currently running (blue, animated)
- `completed` - Step finished successfully (green)
- `failed` - Step encountered an error (red)
- `waiting` - Step is waiting for input (amber)
- `skipped` - Step was skipped (gray)

## Integration

The components integrate with:

- **WebSocket events**: Real-time step updates
- **Log streaming**: Live log display and filtering
- **Progress tracking**: Real-time progress updates
- **Error handling**: Error display and recovery
- **Theme system**: Dark/light mode support

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **6.1**: Interactive stepper for workflow pipeline visualization
- **6.2**: Step status visualization with animations (pending/active/completed/failed)
- **6.3**: Progress tracking and completion indicators
- **11.5**: Expandable step cards with log preview
- **2.8**: Smooth Framer Motion animations for transitions
- **2.1, 2.4, 2.6**: Design system compliance with glassmorphism and rounded borders
