import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  QrCode,
  Settings,
  LogOut,
  Bell,
  Wifi,
  WifiOff,
} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isConnected, stats, notifications } = useAppStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allMenuItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'operator', 'security'],
    },
    {
      path: '/admin/products',
      label: 'Products',
      icon: Package,
      roles: ['admin', 'operator'],
    },
    {
      path: '/admin/payments',
      label: 'Payments',
      icon: CreditCard,
      roles: ['admin', 'operator'],
    },
    {
      path: '/admin/visitors',
      label: 'Visitors',
      icon: Users,
      roles: ['admin', 'security'],
    },
    {
      path: '/admin/qrcodes',
      label: 'QR Codes',
      icon: QrCode,
      roles: ['admin', 'security'],
    },
    {
      path: '/admin/settings',
      label: 'Settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  // Filter menu items based on user role
  const userRole = user?.role || 'admin'; // Default to admin for backward compatibility
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Sunmi POS</h1>
          <p className="text-sm text-gray-600 mt-1">Admin Panel</p>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {menuItems.find(item => item.path === location.pathname)?.label || 'Admin'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-600">Disconnected</span>
                  </>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="text-gray-500">Registered</p>
                  <p className="font-semibold text-yellow-600">{stats.registered_visitors || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Inside</p>
                  <p className="font-semibold text-green-600">{stats.active_visitors || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Exited</p>
                  <p className="font-semibold text-gray-600">{stats.exited_visitors || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Daily Revenue</p>
                  <p className="font-semibold text-blue-600">
                    Rp {(stats.daily_revenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;