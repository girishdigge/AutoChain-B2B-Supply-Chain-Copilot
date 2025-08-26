import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Workflow as WorkflowIcon,
  Link2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { cn } from '../lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: Package,
  },
  {
    name: 'Workflow',
    href: '/workflow',
    icon: WorkflowIcon,
  },
  {
    name: 'Blockchain',
    href: '/blockchain',
    icon: Link2,
  },
];

const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();

  return (
    <aside
      className='h-screen bg-card border-r border-border flex flex-col'
      aria-label='Main navigation'
      role='navigation'
    >
      {/* Header */}
      <header className='p-4 border-b border-border'>
        <div className='flex items-center justify-between'>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className='flex items-center space-x-2'
            >
              <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                <span className='text-white font-bold text-sm'>P</span>
              </div>
              <span className='font-semibold text-foreground'>Portia AI</span>
            </motion.div>
          )}

          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 rounded-lg hover:bg-accent transition-colors',
              isCollapsed && 'mx-auto'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className='h-4 w-4' />
            ) : (
              <ChevronLeft className='h-4 w-4' />
            )}
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav
        id='navigation'
        className='flex-1 p-4'
        aria-label='Main navigation menu'
      >
        <ul className='space-y-2' role='list'>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name} role='listitem'>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-3 py-2 rounded-2xl transition-all duration-200 group relative',
                      'hover:bg-accent hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xl'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                  aria-label={`Navigate to ${item.name}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId='activeIndicator'
                          className='absolute inset-0 bg-primary rounded-2xl'
                          initial={false}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}

                      {/* Icon */}
                      <div className='relative z-10 flex items-center'>
                        <Icon
                          className={cn(
                            'h-5 w-5 transition-colors',
                            isActive ? 'text-primary-foreground' : ''
                          )}
                        />

                        {/* Label */}
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className={cn(
                              'ml-3 font-medium transition-colors',
                              isActive ? 'text-primary-foreground' : ''
                            )}
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </div>

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className='absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50'>
                          {item.name}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <footer className='p-4 border-t border-border'>
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='text-xs text-muted-foreground text-center'
          >
            Supply Chain AI
          </motion.div>
        ) : (
          <div className='w-8 h-1 bg-muted rounded-full mx-auto' />
        )}
      </footer>
    </aside>
  );
};

export default Sidebar;
