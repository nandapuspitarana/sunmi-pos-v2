// Role-based permission system

export type UserRole = 'admin' | 'operator' | 'security';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Admin has full access to everything
    { resource: 'users', action: 'manage' },
    { resource: 'products', action: 'manage' },
    { resource: 'orders', action: 'manage' },
    { resource: 'payments', action: 'manage' },
    { resource: 'visitors', action: 'manage' },
    { resource: 'qrcodes', action: 'manage' },
    { resource: 'settings', action: 'manage' },
    { resource: 'dashboard', action: 'read' },
  ],
  operator: [
    // Operator can manage POS operations
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'update' },
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' },
    { resource: 'payments', action: 'create' },
    { resource: 'payments', action: 'read' },
    { resource: 'dashboard', action: 'read' },
  ],
  security: [
    // Security can manage visitors and QR codes
    { resource: 'visitors', action: 'read' },
    { resource: 'visitors', action: 'update' },
    { resource: 'qrcodes', action: 'read' },
    { resource: 'qrcodes', action: 'create' },
    { resource: 'qrcodes', action: 'update' },
    { resource: 'dashboard', action: 'read' },
  ],
};

/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(
  userRole: UserRole | undefined,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
): boolean {
  if (!userRole) return false;
  
  const permissions = rolePermissions[userRole] || [];
  
  // Check for exact permission match
  const hasExactPermission = permissions.some(
    p => p.resource === resource && (p.action === action || p.action === 'manage')
  );
  
  return hasExactPermission;
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(userRole: UserRole | undefined, route: string): boolean {
  if (!userRole) return false;
  
  // Map routes to resources
  const routeResourceMap: Record<string, string> = {
    '/admin/dashboard': 'dashboard',
    '/admin/products': 'products',
    '/admin/payments': 'payments',
    '/admin/orders': 'orders',
    '/admin/visitors': 'visitors',
    '/admin/qrcodes': 'qrcodes',
    '/admin/settings': 'settings',
  };
  
  const resource = routeResourceMap[route];
  if (!resource) return false;
  
  return hasPermission(userRole, resource, 'read');
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return rolePermissions[userRole] || [];
}

/**
 * Check if user can perform specific actions
 */
export const can = {
  // Product permissions
  createProduct: (userRole: UserRole | undefined) => hasPermission(userRole, 'products', 'create'),
  editProduct: (userRole: UserRole | undefined) => hasPermission(userRole, 'products', 'update'),
  deleteProduct: (userRole: UserRole | undefined) => hasPermission(userRole, 'products', 'delete'),
  
  // Order permissions
  createOrder: (userRole: UserRole | undefined) => hasPermission(userRole, 'orders', 'create'),
  viewOrders: (userRole: UserRole | undefined) => hasPermission(userRole, 'orders', 'read'),
  
  // Payment permissions
  processPayment: (userRole: UserRole | undefined) => hasPermission(userRole, 'payments', 'create'),
  viewPayments: (userRole: UserRole | undefined) => hasPermission(userRole, 'payments', 'read'),
  
  // Visitor permissions
  manageVisitors: (userRole: UserRole | undefined) => hasPermission(userRole, 'visitors', 'update'),
  viewVisitors: (userRole: UserRole | undefined) => hasPermission(userRole, 'visitors', 'read'),
  
  // QR Code permissions
  createQRCode: (userRole: UserRole | undefined) => hasPermission(userRole, 'qrcodes', 'create'),
  scanQRCode: (userRole: UserRole | undefined) => hasPermission(userRole, 'qrcodes', 'update'),
  
  // User management permissions
  manageUsers: (userRole: UserRole | undefined) => hasPermission(userRole, 'users', 'manage'),
  
  // Settings permissions
  accessSettings: (userRole: UserRole | undefined) => hasPermission(userRole, 'settings', 'manage'),
};

/**
 * Role display helpers
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    operator: 'POS Operator',
    security: 'Security Guard',
  };
  
  return roleNames[role] || role;
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full system access and user management',
    operator: 'POS operations, product and payment management',
    security: 'Visitor management and QR code operations',
  };
  
  return descriptions[role] || '';
}