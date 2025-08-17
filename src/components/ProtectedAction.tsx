import React from 'react';
import { useAuthStore } from '../store/authStore';
import { hasPermission, UserRole } from '../utils/permissions';

interface ProtectedActionProps {
  children: React.ReactNode;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Component that conditionally renders children based on user permissions
 */
const ProtectedAction: React.FC<ProtectedActionProps> = ({
  children,
  resource,
  action,
  fallback = null,
  className,
}) => {
  const { user } = useAuthStore();
  const userRole = user?.role as UserRole | undefined;
  
  const hasAccess = hasPermission(userRole, resource, action);
  
  if (!hasAccess) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }
  
  return <div className={className}>{children}</div>;
};

export default ProtectedAction;