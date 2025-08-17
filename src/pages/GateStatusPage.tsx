import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface GateStatus {
  isOpen: boolean;
  lastActivity: string;
  totalEntries: number;
  totalExits: number;
  activeVisitors: number;
}

const GateStatusPage = () => {
  const [gateStatus, setGateStatus] = useState<GateStatus>({
    isOpen: false,
    lastActivity: '',
    totalEntries: 0,
    totalExits: 0,
    activeVisitors: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { connectSocket, disconnectSocket, socket } = useAppStore();

  useEffect(() => {
    fetchGateStatus();
    connectSocket();

    // Listen for real-time gate updates
    if (socket) {
      socket.on('gate-status-update', (data) => {
        setGateStatus(prev => ({ ...prev, ...data }));
      });

      socket.on('visitor-entry', () => {
        setGateStatus(prev => ({
          ...prev,
          totalEntries: prev.totalEntries + 1,
          activeVisitors: prev.activeVisitors + 1,
          lastActivity: new Date().toISOString()
        }));
      });

      socket.on('visitor-exit', () => {
        setGateStatus(prev => ({
          ...prev,
          totalExits: prev.totalExits + 1,
          activeVisitors: Math.max(0, prev.activeVisitors - 1),
          lastActivity: new Date().toISOString()
        }));
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [socket, connectSocket, disconnectSocket]);

  const fetchGateStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch visitor statistics
      const visitorsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/entry/visitors`);
      const visitorsData = await visitorsResponse.json();
      
      if (visitorsData.success) {
        const activeVisitors = visitorsData.visitors.filter((v: any) => v.status === 'active').length;
        const totalEntries = visitorsData.visitors.length;
        const totalExits = visitorsData.visitors.filter((v: any) => v.exit_time).length;
        
        setGateStatus({
          isOpen: true, // Assume gate is operational
          lastActivity: visitorsData.visitors[0]?.entry_time || '',
          totalEntries,
          totalExits,
          activeVisitors
        });
      }
    } catch (error) {
      console.error('Error fetching gate status:', error);
      setError('Failed to fetch gate status');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'No activity';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = () => {
    return gateStatus.isOpen ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = () => {
    return gateStatus.isOpen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Gate Status</h1>
            </div>
            <button
              onClick={fetchGateStatus}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Main Status Card */}
        <div className={`mb-8 rounded-lg border-2 p-8 text-center ${getStatusBg()}`}>
          <div className="flex items-center justify-center mb-4">
            {gateStatus.isOpen ? (
              <CheckCircle className="w-16 h-16 text-green-600" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <h2 className={`text-3xl font-bold mb-2 ${getStatusColor()}`}>
            Gate {gateStatus.isOpen ? 'Open' : 'Closed'}
          </h2>
          <p className="text-gray-600">
            System is {gateStatus.isOpen ? 'operational and ready for access' : 'currently offline'}
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Visitors</p>
                <p className="text-2xl font-bold text-gray-900">{gateStatus.activeVisitors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{gateStatus.totalEntries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <XCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Exits</p>
                <p className="text-2xl font-bold text-gray-900">{gateStatus.totalExits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Activity</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatTime(gateStatus.lastActivity)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Gate Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${getStatusColor()}`}>
                    {gateStatus.isOpen ? 'Operational' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection:</span>
                  <span className="font-medium text-green-600">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Update:</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Access Control</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">QR Scanning:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auto Entry:</span>
                  <span className="font-medium text-green-600">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Level:</span>
                  <span className="font-medium text-blue-600">Standard</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center space-x-4">
          <a
            href="/entry"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Entry Scanner
          </a>
          <a
            href="/shop"
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Shop
          </a>
        </div>
      </div>
    </div>
  );
};

export default GateStatusPage;