import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();

  let errorMessage: string;
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = 'Unknown error occurred';
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-background'>
      <div className='text-center p-6 max-w-md'>
        <div className='mb-4'>
          <svg
            className='mx-auto h-12 w-12 text-red-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>
        {errorStatus && (
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            {errorStatus}
          </h1>
        )}
        <h2 className='text-xl font-semibold text-foreground mb-2'>
          Page Error
        </h2>
        <p className='text-muted-foreground mb-4'>{errorMessage}</p>
        <div className='space-x-2'>
          <button
            onClick={() => window.history.back()}
            className='px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors'
          >
            Go Back
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className='px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
