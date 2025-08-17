import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Users,
  CreditCard,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface DashboardStats {
  totalVisitors: number;
  activeVisitors: number;
  totalOrders: number;
  pendingPayments: number;
  approvedPayments: number;
  rejectedPayments: number;
  dailyRevenue: number;
  monthlyRevenue: number;
}

const Dashboard = () => {
  const { stats, isConnected } = useAppStore();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalVisitors: 0,
    activeVisitors: 0,
    totalOrders: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    dailyRevenue: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch visitors stats
      const visitorsResponse = await fetch('http://localhost:3001/api/entry/visitors?limit=1000');
      const visitorsData = await visitorsResponse.json();
      
      // Fetch orders stats
      const ordersResponse = await fetch('http://localhost:3001/api/orders/stats/summary');
      const ordersData = await ordersResponse.json();

      if (visitorsData.success && ordersData.success) {
        const activeVisitors = visitorsData.visitors.filter((v: any) => v.status === 'active').length;
        
        setDashboardStats({
          totalVisitors: visitorsData.total,
          activeVisitors,
          totalOrders: parseInt(ordersData.stats.total_orders),
          pendingPayments: parseInt(ordersData.stats.pending_orders),
          approvedPayments: parseInt(ordersData.stats.approved_orders),
          rejectedPayments: parseInt(ordersData.stats.rejected_orders),
          dailyRevenue: parseFloat(ordersData.stats.total_revenue),
          monthlyRevenue: parseFloat(ordersData.stats.total_revenue) * 30, // Rough estimate
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your POS system and current activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Real-time Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Visitors"
          value={stats.active_visitors || dashboardStats.activeVisitors}
          icon={Users}
          color="text-blue-600"
          subtitle={`${dashboardStats.totalVisitors} total today`}
        />
        <StatCard
          title="Pending Payments"
          value={stats.pending_payments || dashboardStats.pendingPayments}
          icon={Clock}
          color="text-orange-600"
          subtitle={`${dashboardStats.totalOrders} total orders`}
        />
        <StatCard
          title="Daily Revenue"
          value={`Rp ${(stats.daily_revenue || dashboardStats.dailyRevenue).toLocaleString()}`}
          icon={DollarSign}
          color="text-green-600"
          subtitle="Today's earnings"
        />
        <StatCard
          title="Gate Status"
          value={stats.gate_status === 'online' ? 'Online' : 'Offline'}
          icon={Activity}
          color={stats.gate_status === 'online' ? 'text-green-600' : 'text-red-600'}
          subtitle="Access control system"
        />
      </div>

      {/* Payment Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard
          title="Approved Payments"
          value={dashboardStats.approvedPayments}
          icon={CheckCircle}
          color="text-green-600"
          subtitle="Successfully processed"
        />
        <StatCard
          title="Pending Payments"
          value={dashboardStats.pendingPayments}
          icon={Clock}
          color="text-orange-600"
          subtitle="Awaiting validation"
        />
        <StatCard
          title="Rejected Payments"
          value={dashboardStats.rejectedPayments}
          icon={XCircle}
          color="text-red-600"
          subtitle="Declined transactions"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <CreditCard className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Validate Payments</p>
            <p className="text-sm text-gray-600">Review pending transactions</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Users className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Manage Visitors</p>
            <p className="text-sm text-gray-600">View active visitors</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">View Reports</p>
            <p className="text-sm text-gray-600">Analytics and insights</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Activity className="w-6 h-6 text-orange-600 mb-2" />
            <p className="font-medium text-gray-900">System Status</p>
            <p className="text-sm text-gray-600">Monitor system health</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <p className="text-sm text-gray-700">New visitor entered the store</p>
            <span className="text-xs text-gray-500 ml-auto">2 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm text-gray-700">Payment approved for Order #1234</p>
            <span className="text-xs text-gray-500 ml-auto">5 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <p className="text-sm text-gray-700">New order created - Rp 150,000</p>
            <span className="text-xs text-gray-500 ml-auto">8 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;