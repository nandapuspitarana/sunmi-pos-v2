import { useState, useEffect } from 'react';
import { CreditCard, Upload, CheckCircle, AlertCircle, ArrowLeft, DollarSign, Calculator } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  visitor_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
  total_amount: number;
  payment_method: string;
  notes?: string;
}

const CheckoutPage = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [visitorId, setVisitorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [change, setChange] = useState(0);

  useEffect(() => {
    loadCart();
    loadVisitorId();
  }, []);

  const loadCart = () => {
    const savedCart = localStorage.getItem('shopping-cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const loadVisitorId = () => {
    // In a real app, this would come from authentication or QR scan
    const savedVisitorId = localStorage.getItem('visitor-id') || 'demo-visitor-001';
    setVisitorId(savedVisitorId);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateChange = (cashPaid: number) => {
    const total = getTotalPrice();
    return cashPaid >= total ? cashPaid - total : 0;
  };

  const handleCashAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setCashAmount(e.target.value);
    setChange(calculateChange(amount));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPG, PNG)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setPaymentProof(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }
    
    if (!visitorId) {
      setError('Visitor ID is required');
      return;
    }

    // Validate cash payment
    if (paymentMethod === 'cash') {
      const cashPaid = parseFloat(cashAmount);
      const total = getTotalPrice();
      if (!cashAmount || cashPaid < total) {
        setError(`Cash amount must be at least Rp ${total.toLocaleString()}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Create order
      const orderData: OrderData = {
        visitor_id: visitorId,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: getTotalPrice(),
        payment_method: paymentMethod,
        notes: notes || undefined
      };

      const formData = new FormData();
      formData.append('visitor_id', orderData.visitor_id);
      formData.append('items', JSON.stringify(orderData.items));
      formData.append('total_amount', orderData.total_amount.toString());
      formData.append('payment_method', orderData.payment_method);
      if (orderData.notes) {
        formData.append('notes', orderData.notes);
      }
      if (paymentProof) {
        formData.append('payment_proof', paymentProof);
      }

      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setOrderId(data.order.id);
        setOrderCreated(true);
        // Clear cart
        localStorage.removeItem('shopping-cart');
        setCart([]);
      } else {
        setError(data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Created!</h2>
          <p className="text-gray-600 mb-4">
            Your order has been successfully created and is pending payment validation.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="font-mono text-lg font-semibold text-gray-900">{orderId}</p>
          </div>
          <div className="space-y-3">
            <a
              href="/shop"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium block text-center"
            >
              Continue Shopping
            </a>
            <a
              href="/entry"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium block text-center"
            >
              Back to Entry
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cart is Empty</h2>
          <p className="text-gray-600 mb-6">
            Add some products to your cart before checkout.
          </p>
          <a
            href="/shop"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium block text-center"
          >
            Start Shopping
          </a>
        </div>
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
              <DollarSign className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">POS Checkout</h1>
                <p className="text-sm text-gray-600">Point of Sale System</p>
              </div>
            </div>
            <a
              href="/cart"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Cart</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visitor Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Visitor Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor ID
                </label>
                <input
                  type="text"
                  value={visitorId}
                  onChange={(e) => setVisitorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your visitor ID"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium">Cash Payment</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment_method"
                    value="transfer"
                    checked={paymentMethod === 'transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                  <span>Bank Transfer</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment_method"
                    value="ewallet"
                    checked={paymentMethod === 'ewallet'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 text-purple-600 mr-2" />
                  <span>E-Wallet (GoPay, OVO, DANA)</span>
                </label>
              </div>
            </div>

            {/* Cash Payment Section */}
            {paymentMethod === 'cash' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Cash Payment Calculator
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Amount
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      Rp {getTotalPrice().toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cash Received
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={handleCashAmountChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Enter cash amount"
                      min="0"
                      step="1000"
                    />
                  </div>
                  
                  {cashAmount && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Change:</span>
                        <span className={`text-xl font-bold ${
                          change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Rp {change.toLocaleString()}
                        </span>
                      </div>
                      {change < 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          Insufficient cash amount
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[50000, 100000, 200000].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setCashAmount(amount.toString());
                          setChange(calculateChange(amount));
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Rp {amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Proof Upload */}
            {paymentMethod !== 'cash' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Proof</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                        Choose File
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-gray-600">
                      Upload payment proof (JPG, PNG, max 5MB)
                    </p>
                    {paymentProof && (
                      <p className="text-sm text-green-600">
                        ✓ {paymentProof.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any special instructions or notes..."
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-gray-900">
                        Rp {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-base font-medium text-gray-900">
                        Rp {getTotalPrice().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Order...' : 'Place Order'}
                </button>
                
                <div className="mt-4 text-center">
                  <a
                    href="/cart"
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Back to Cart
                  </a>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;