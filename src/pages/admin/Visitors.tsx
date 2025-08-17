import { useState, useEffect } from 'react';
import { Users, Clock, LogIn, LogOut, Search, Filter, Eye, QrCode } from 'lucide-react';
import { Html5QrcodeResult } from 'html5-qrcode';
import QRCodeScanner from '../../components/QRCodeScanner';

interface VisitorEntry {
  id: string;
  qr_data: string;
  qr_code: string;
  permissions: string[];
  status: 'registered' | 'entered' | 'exited';
  is_active: boolean;
  entry_time: string;
  exit_time?: string;
  created_at: string;
  metadata?: {
    visitor_name?: string;
    booking_order_id?: string;
    guest_count?: number;
    phone?: string;
    email?: string;
    company?: string;
    purpose?: string;
  };
}

interface VisitorMovement {
  id: string;
  visitor_id: string;
  action: 'entry' | 'exit';
  timestamp: string;
  gate_location?: string;
  scanned_by?: string;
}

const Visitors = () => {
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [movements, setMovements] = useState<VisitorMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('entry');
  const [activeTab, setActiveTab] = useState<'visitors' | 'movements'>('visitors');

  useEffect(() => {
    fetchVisitors();
    fetchMovements();
  }, []);

  const fetchVisitors = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const response = await fetch('http://localhost:3001/api/qrcode/list?limit=200', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setVisitors(data.qr_codes);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const response = await fetch('http://localhost:3001/api/entry/movements', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setMovements(data.movements || []);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const handleQRScan = async (qrData: string, result?: Html5QrcodeResult) => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const response = await fetch('http://localhost:3001/api/entry/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          qr_data: qrData,
          action: scanMode,
          gate_location: 'Main Gate',
          scanned_by: 'Admin'
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Visitor ${scanMode === 'entry' ? 'entered' : 'exited'} successfully!`);
        setShowScanner(false);
        fetchVisitors();
        fetchMovements();
      } else {
        alert(data.error || 'Failed to process QR scan');
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      alert('Network error. Please try again.');
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    const visitorName = visitor.metadata?.visitor_name || '';
    const bookingOrderId = visitor.metadata?.booking_order_id || '';
    const phone = visitor.metadata?.phone || '';
    const email = visitor.metadata?.email || '';
    
    const matchesSearch = visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bookingOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || visitor.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'bg-yellow-100 text-yellow-800';
      case 'entered':
        return 'bg-green-100 text-green-800';
      case 'exited':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    return action === 'entry' ? (
      <LogIn className="w-4 h-4 text-green-600" />
    ) : (
      <LogOut className="w-4 h-4 text-red-600" />
    );
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Visitor Management</h1>
          <p className="text-gray-600">Track visitor entry and exit activities</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => { setScanMode('entry'); setShowScanner(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Scan Entry</span>
          </button>
          <button 
            onClick={() => { setScanMode('exit'); setShowScanner(true); }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Scan Exit</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Registered</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitors.filter(v => v.status === 'registered').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <LogIn className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Currently Inside</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitors.filter(v => v.status === 'entered').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gray-100">
              <LogOut className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Exited</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitors.filter(v => v.status === 'exited').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Visitors</p>
              <p className="text-2xl font-bold text-gray-900">{visitors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('visitors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'visitors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Visitors
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Movement History
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search visitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="registered">Registered</option>
              <option value="entered">Entered</option>
              <option value="exited">Exited</option>
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredVisitors.length} of {visitors.length} visitors
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'visitors' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exit Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVisitors.map(visitor => (
                    <tr key={visitor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-medium text-sm">
                              {(visitor.metadata?.visitor_name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {visitor.metadata?.visitor_name || 'Unknown Visitor'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {visitor.metadata?.guest_count || 1} guest(s)
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-orange-100 rounded-lg mr-3">
                            <span className="text-orange-600 font-bold text-xs">
                              #{visitor.metadata?.booking_order_id || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">
                            {visitor.metadata?.phone || '-'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {visitor.metadata?.email || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(visitor.status)}`}>
                          {visitor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {visitor.status !== 'registered' ? new Date(visitor.entry_time).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {visitor.exit_time ? new Date(visitor.exit_time).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No movement history found</p>
                </div>
              ) : (
                movements.map(movement => (
                  <div key={movement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getActionIcon(movement.action)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Visitor {movement.action === 'entry' ? 'entered' : 'exited'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movement.gate_location} • Scanned by {movement.scanned_by}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(movement.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Scan QR Code for {scanMode === 'entry' ? 'Entry' : 'Exit'}
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <QRCodeScanner
              onScanSuccess={handleQRScan}
              onScanError={(error) => console.error('QR scan error:', error)}
            />
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Point the camera at the visitor's QR code
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;