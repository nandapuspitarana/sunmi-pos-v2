import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeResult } from 'html5-qrcode';
import type { Html5QrcodeScannerConfig } from 'html5-qrcode/esm/html5-qrcode-scanner';
import { Camera, CameraOff, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string, result: Html5QrcodeResult) => void;
  onScanError?: (error: string) => void;
  width?: string;
  height?: string;
  fps?: number;
  qrbox?: number;
  aspectRatio?: number;
  disableFlip?: boolean;
  verbose?: boolean;
}

const QRCodeScanner = ({
  onScanSuccess,
  onScanError,
  width = '100%',
  height = '400px',
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
  disableFlip = false,
  verbose = false
}: QRCodeScannerProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastScan, setLastScan] = useState<string>('');
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    if (!elementRef.current) return;

    const config: Html5QrcodeScannerConfig = {
      fps,
      qrbox,
      aspectRatio,
      disableFlip
    };

    const scanner = new Html5QrcodeScanner(
      elementRef.current.id,
      config,
      verbose
    );

    const handleScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
      setLastScan(decodedText);
      setScanCount(prev => prev + 1);
      setError('');
      onScanSuccess(decodedText, result);
    };

    const handleScanError = (errorMessage: string) => {
      if (onScanError) {
        onScanError(errorMessage);
      }
      // Don't set error state for every scan error as it's too noisy
      if (verbose) {
        console.warn('QR Scan Error:', errorMessage);
      }
    };

    scanner.render(handleScanSuccess, handleScanError);
    scannerRef.current = scanner;
    setIsScanning(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setIsScanning(false);
    };
  }, [onScanSuccess, onScanError, fps, qrbox, aspectRatio, disableFlip, verbose]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        setIsScanning(false);
        setError('');
      } catch (err) {
        console.error('Error stopping scanner:', err);
        setError('Failed to stop scanner');
      }
    }
  };

  const startScanning = () => {
    // Restart the scanner by re-mounting the component
    window.location.reload();
  };

  const resetScanner = async () => {
    await stopScanning();
    setTimeout(() => {
      startScanning();
    }, 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">QR Code Scanner</h3>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              isScanning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isScanning ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
              <span>{isScanning ? 'Scanning' : 'Stopped'}</span>
            </div>
          </div>
        </div>
        
        {/* Scanner Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />
            <span>Scans: {scanCount}</span>
          </div>
          {lastScan && (
            <div className="flex items-center space-x-1">
              <span>Last: {lastScan.substring(0, 20)}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Scanner Container */}
      <div className="relative">
        <div 
          ref={elementRef}
          id={`qr-scanner-${Date.now()}`}
          style={{ width, height }}
          className="rounded-lg overflow-hidden border border-gray-200"
        />
        
        {/* Overlay Controls */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={resetScanner}
            className="p-2 bg-white bg-opacity-90 rounded-lg shadow-sm hover:bg-opacity-100 transition-all"
            title="Reset Scanner"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={isScanning ? stopScanning : startScanning}
            className={`p-2 bg-white bg-opacity-90 rounded-lg shadow-sm hover:bg-opacity-100 transition-all ${
              isScanning ? 'text-red-600' : 'text-green-600'
            }`}
            title={isScanning ? 'Stop Scanner' : 'Start Scanner'}
          >
            {isScanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Position the QR code within the scanning area. 
          The scanner will automatically detect and process the code.
        </p>
      </div>

      {/* Scanner Info */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">FPS:</span>
          <span className="ml-2 font-medium text-gray-900">{fps}</span>
        </div>
        <div>
          <span className="text-gray-600">QR Box:</span>
          <span className="ml-2 font-medium text-gray-900">{qrbox}px</span>
        </div>
        <div>
          <span className="text-gray-600">Aspect Ratio:</span>
          <span className="ml-2 font-medium text-gray-900">{aspectRatio}</span>
        </div>
        <div>
          <span className="text-gray-600">Flip Disabled:</span>
          <span className="ml-2 font-medium text-gray-900">{disableFlip ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;