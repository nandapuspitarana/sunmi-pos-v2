import { useState, useEffect } from 'react';
import { QrCode, Plus, ToggleLeft, ToggleRight, Trash2, Search, MoreVertical, Eye } from 'lucide-react';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import ProtectedAction from '../../components/ProtectedAction';

interface QRCodeData {
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

const QRCodes = () => {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    visitorName: '',
    bookingOrderId: '',
    guestCount: 1,
    phone: '',
    email: '',
    company: '',
    permissions: 'entry'
  });

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : import.meta.env.API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/qrcode/list?limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log('Fetched QR codes:', data);
      if (data.success) {
        setQrCodes(data.qr_codes);
      } else {
        console.error('Failed to fetch QR codes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQRCodeStatus = async (visitorId: string, currentStatus: boolean) => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : import.meta.env.API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/qrcode/${visitorId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchQRCodes();
      }
    } catch (error) {
      console.error('Error toggling QR code status:', error);
    }
  };

  const deleteQRCode = async (visitorId: string) => {
    if (!confirm('Are you sure you want to delete this QR code? This action cannot be undone.')) {
      return;
    }

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : import.meta.env.API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/qrcode/${visitorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchQRCodes();
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
    }
  };

  const filteredQRCodes = qrCodes.filter(qrCode => {
    const visitorName = qrCode.metadata?.visitor_name || '';
    const phone = qrCode.metadata?.phone || '';
    const email = qrCode.metadata?.email || '';
    const company = qrCode.metadata?.company || '';
    
    const matchesSearch = qrCode.qr_data.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qrCode.qr_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && qrCode.is_active) ||
                         (selectedStatus === 'inactive' && !qrCode.is_active);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getVisitorStatusColor = (status: string) => {
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

  const handleViewQR = (qrCode: QRCodeData) => {
    setSelectedQRData(qrCode.qr_data);
    setShowQRModal(true);
  };

  const handleCreateQRCode = async () => {
    // Enhanced form validation
    if (!formData.visitorName.trim()) {
      alert('Please enter visitor name');
      return;
    }

    if (!formData.bookingOrderId.trim()) {
      alert('Please enter booking order ID');
      return;
    }

    if (formData.visitorName.trim().length < 2) {
      alert('Visitor name must be at least 2 characters long');
      return;
    }

    if (formData.guestCount < 1 || formData.guestCount > 20) {
      alert('Guest count must be between 1 and 20');
      return;
    }

    setCreateLoading(true);
    try {
      const permissions = [];
      switch (formData.permissions) {
        case 'entry':
          permissions.push('gate_entry');
          break;
        case 'entry_shop':
          permissions.push('gate_entry', 'gate_shop');
          break;
        case 'full':
          permissions.push('gate_entry', 'gate_shop', 'gate_admin');
          break;
        default:
          permissions.push('gate_entry');
      }

      console.log('Creating QR code for:', formData.visitorName, 'with permissions:', permissions);

      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';

      const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : import.meta.env.API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/qrcode/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitor_name: formData.visitorName.trim(),
          booking_order_id: formData.bookingOrderId.trim(),
          guest_count: formData.guestCount,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          permissions: permissions,
          status: 'registered'
        }),
      });

      console.log('API Response status:', response.status);
      const data = await response.json();
      console.log('API Response data:', data);

      if (response.ok && data.success) {
        // Reset form and close modal
        setFormData({ 
          visitorName: '', 
          bookingOrderId: '',
          guestCount: 1,
          phone: '',
          email: '',
          company: '',
          permissions: 'entry' 
        });
        setShowCreateModal(false);
        // Refresh QR codes list
        await fetchQRCodes();
        alert('QR Code created successfully!');
      } else {
        console.error('API Error:', data);
        alert(data.error || data.message || 'Failed to create QR code');
      }
    } catch (error) {
      console.error('Network error creating QR code:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setCreateLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
          <p className="text-gray-600">Manage visitor QR codes and access permissions</p>
        </div>
        <ProtectedAction resource="qrcodes" action="create">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Generate QR Code</span>
          </button>
        </ProtectedAction>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search QR codes..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredQRCodes.length} of {qrCodes.length} QR codes
          </div>
        </div>
      </div>

      {/* QR Codes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitor Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQRCodes.map(qrCode => (
                <tr key={qrCode.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-medium text-sm">
                          {(qrCode.metadata?.visitor_name || 'Unknown').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {qrCode.metadata?.visitor_name || 'Unknown Visitor'}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {qrCode.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg mr-3">
                        <span className="text-orange-600 font-bold text-xs">
                          #{qrCode.metadata?.booking_order_id || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Order ID
                        </p>
                        <p className="text-xs text-gray-500">
                          {qrCode.metadata?.guest_count || 1} guests
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <QrCode className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 font-mono">
                          {qrCode.qr_data.slice(0, 20)}...
                        </p>
                        <p className="text-xs text-gray-500">
                          QR Code
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm text-gray-900">
                        {qrCode.metadata?.phone || '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {qrCode.metadata?.email || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVisitorStatusColor(qrCode.status)}`}>
                      {qrCode.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {qrCode.permissions.map(permission => (
                        <span
                          key={permission}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {permission.replace('gate_', '')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(qrCode.entry_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(qrCode.is_active)}`}>
                      {qrCode.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(qrCode.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewQR(qrCode)}
                        className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                        title="View QR Code"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleQRCodeStatus(qrCode.id, qrCode.is_active)}
                        className={`p-1 rounded transition-colors ${
                          qrCode.is_active 
                            ? 'text-green-600 hover:text-green-800' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={qrCode.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {qrCode.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteQRCode(qrCode.id)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete QR Code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredQRCodes.length === 0 && (
        <div className="text-center py-12">
          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No QR codes found</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <QrCode className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total QR Codes</p>
              <p className="text-2xl font-bold text-gray-900">{qrCodes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <ToggleRight className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active QR Codes</p>
              <p className="text-2xl font-bold text-gray-900">
                {qrCodes.filter(qr => qr.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <ToggleLeft className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive QR Codes</p>
              <p className="text-2xl font-bold text-gray-900">
                {qrCodes.filter(qr => !qr.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <QrCode className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Visitors</p>
              <p className="text-2xl font-bold text-gray-900">
                {qrCodes.filter(qr => qr.status === 'entered').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create QR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New QR Code</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Name *
                </label>
                <input
                  type="text"
                  value={formData.visitorName}
                  onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter visitor name"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Order ID *
                  </label>
                  <input
                    type="text"
                    value={formData.bookingOrderId}
                    onChange={(e) => setFormData({ ...formData, bookingOrderId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. ORD-12345"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guest Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.guestCount}
                    onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Number of guests"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                />
              </div>
              

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <select 
                  value={formData.permissions}
                  onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="entry">Entry Only</option>
                  <option value="entry_shop">Entry + Shop</option>
                  <option value="full">Full Access</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateQRCode}
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Creating...' : 'Create QR Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code View Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code Details</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <QRCodeGenerator
              data={selectedQRData}
              size={300}
              title="Visitor QR Code"
              showControls={true}
            />
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodes;