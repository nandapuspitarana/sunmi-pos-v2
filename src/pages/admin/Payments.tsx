import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Eye, FileText } from 'lucide-react';

interface Order {
  id: string;
  visitor_id: string;
  visitor_qr_data: string;
  total_amount: number;
  payment_status: 'pending' | 'approved' | 'rejected';
  payment_proof_url?: string;
  admin_notes?: string;
  created_at: string;
  validated_at?: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

const Payments = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');
  const [validationAction, setValidationAction] = useState<'approved' | 'rejected'>('approved');

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state.token : '';
      
      const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : import.meta.env.API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/orders?status=${selectedStatus}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Definisikan API_BASE_URL dengan prioritas variabel lingkungan
  const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : import.meta.env.API_BASE_URL || 'http://localhost:3001/api';

  const handleValidatePayment = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`${API_BASE_URL}/orders/${selectedOrder.id}/validate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')).state.token : ''}`,
        },
        body: JSON.stringify({
          status: validationAction,
          admin_notes: validationNotes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setSelectedOrder(null);
        setValidationNotes('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error validating payment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
          <h1 className="text-2xl font-bold text-gray-900">Payment Validation</h1>
          <p className="text-gray-600">Review and validate customer payments</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex space-x-4">
          {['pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">{order.items.length} items</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Visitor</p>
                      <p className="text-sm text-gray-500">{order.visitor_qr_data}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-bold text-gray-900">
                      Rp {order.total_amount.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.payment_status)}`}>
                      {getStatusIcon(order.payment_status)}
                      <span className="ml-1">{order.payment_status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Review</span>
                      </button>
                      {order.payment_proof_url && (
                        <a
                          href={`${API_BASE_URL.replace('/api', '')}${order.payment_proof_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Proof</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No {selectedStatus} payments found</p>
        </div>
      )}

      {/* Validation Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Review Payment - Order #{selectedOrder.id.slice(0, 8)}
            </h2>
            
            {/* Order Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    Rp {selectedOrder.total_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Date</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{item.product_name}</span>
                      <span className="text-sm">
                        {item.quantity} × Rp {item.unit_price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Payment Proof */}
              {selectedOrder.payment_proof_url && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Payment Proof</p>
                  <img
                    src={`${API_BASE_URL.replace('/api', '')}${selectedOrder.payment_proof_url}`}
                    alt="Payment proof"
                    className="max-w-full h-auto rounded border"
                  />
                </div>
              )}
            </div>
            
            {selectedOrder.payment_status === 'pending' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validation Action
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="approved"
                        checked={validationAction === 'approved'}
                        onChange={(e) => setValidationAction(e.target.value as 'approved')}
                        className="mr-2"
                      />
                      <span className="text-green-600">Approve</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="rejected"
                        checked={validationAction === 'rejected'}
                        onChange={(e) => setValidationAction(e.target.value as 'rejected')}
                        className="mr-2"
                      />
                      <span className="text-red-600">Reject</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any notes about this validation..."
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedOrder(null);
                  setValidationNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {selectedOrder.payment_status === 'pending' && (
                <button
                  onClick={handleValidatePayment}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    validationAction === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {validationAction === 'approved' ? 'Approve Payment' : 'Reject Payment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;