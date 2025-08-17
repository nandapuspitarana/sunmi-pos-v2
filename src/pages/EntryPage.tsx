import { useState } from 'react';
import { QrCode, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Html5QrcodeResult } from 'html5-qrcode';
import QRCodeScanner from '../components/QRCodeScanner';

const EntryPage = () => {
  const [qrData, setQrData] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    visitor?: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(false);

  const handleScan = async (qrCodeData?: string) => {
    const dataToScan = qrCodeData || qrData;
    
    if (!dataToScan.trim()) {
      setScanResult({
        success: false,
        message: 'Please enter QR code data'
      });
      return;
    }

    setLoading(true);
    setScanResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/entry/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qr_data: dataToScan })
      });

      const data = await response.json();
      setScanResult(data);
      
      if (data.success) {
        // Clear the input after successful scan
        setQrData('');
        setUseCamera(false);
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      setScanResult({
        success: false,
        message: 'Failed to scan QR code. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScan = (decodedText: string, result: Html5QrcodeResult) => {
    console.log('QR Code scanned:', decodedText);
    setQrData(decodedText);
    handleScan(decodedText);
  };

  const handleScanError = (error: string) => {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('QR Scan Error:', error);
    }
  };

  const handleManualEntry = () => {
    // Simulate QR scan with random data
    const randomQR = `ENTRY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setQrData(randomQR);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Store Entry</h1>
            <p className="text-gray-600 mt-2">
              Scan your QR code to register your entry
            </p>
          </div>

          {/* Scanner Mode Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setUseCamera(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !useCamera 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manual Input
              </button>
              <button
                onClick={() => setUseCamera(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  useCamera 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Camera Scanner
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {useCamera ? (
              /* Camera Scanner */
              <div>
                <QRCodeScanner
                  onScanSuccess={handleCameraScan}
                  onScanError={handleScanError}
                  width="100%"
                  height="300px"
                  fps={10}
                  qrbox={200}
                />
              </div>
            ) : (
              /* Manual QR Input */
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Position QR code within the frame</p>
                
                {/* Manual Input for Demo */}
                <div className="space-y-4">
                  <input
                    type="text"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="Enter QR code data or scan"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={handleManualEntry}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Generate Demo QR
                    </button>
                    <button
                      onClick={() => handleScan()}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Processing...' : 'Register Entry'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {scanResult && (
              <div className={`p-4 rounded-lg border ${
                scanResult.success 
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {scanResult.success ? (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-2" />
                  )}
                  <p className="font-medium">{scanResult.message}</p>
                </div>
                {scanResult.success && scanResult.visitor && (
                  <div className="mt-2 text-sm">
                    <p>Visitor: {scanResult.visitor.name}</p>
                    <p>Entry Time: {new Date().toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Hold your QR code steady within the frame</li>
                <li>• Ensure good lighting for better scanning</li>
                <li>• Keep your access code for gate entry</li>
                <li>• Contact staff if you need assistance</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex justify-center space-x-4 pt-4">
              <a
                href="/shop"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Continue to Shop →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryPage;