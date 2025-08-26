import React from 'react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SkipLink: React.FC<SkipLinkProps> = ({
  href,
  children,
  className = '',
}) => {
  return (
    <a
      href={href}
      className={`
        absolute top-0 left-0 z-50 px-4 py-2 
        bg-primary text-primary-foreground 
        rounded-br-lg font-medium
        transform -translate-y-full
        focus:translate-y-0
        transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-primary/20
        ${className}
      `}
      onFocus={(e) => {
        // Ensure the skip link is visible when focused
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onBlur={(e) => {
        // Hide the skip link when focus is lost
        e.currentTarget.style.transform = 'translateY(-100%)';
      }}
    >
      {children}
    </a>
  );
};

export default SkipLink;
