import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, RefreshCw, Copy, Check } from 'lucide-react';

interface QRCodeGeneratorProps {
  data: string;
  size?: number;
  title?: string;
  showControls?: boolean;
  onGenerate?: (dataUrl: string) => void;
}

const QRCodeGenerator = ({ 
  data, 
  size = 256, 
  title = 'QR Code', 
  showControls = true,
  onGenerate 
}: QRCodeGeneratorProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (data) {
      generateQRCode();
    }
  }, [data, size]);

  const generateQRCode = async () => {
    if (!data) return;
    
    setLoading(true);
    setError('');
    
    try {
      const dataUrl = await QRCode.toDataURL(data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrDataUrl(dataUrl);
      onGenerate?.(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    if (!data) return;
    
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyImageToClipboard = async () => {
    if (!qrDataUrl) return;
    
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
    }
  };

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>No data provided for QR code generation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      )}
      
      <div className="flex flex-col items-center space-y-4">
        {/* QR Code Display */}
        <div className="relative">
          {loading ? (
            <div 
              className="flex items-center justify-center bg-gray-100 rounded-lg"
              style={{ width: size, height: size }}
            >
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div 
              className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
              style={{ width: size, height: size }}
            >
              <p className="text-red-600 text-sm text-center px-4">{error}</p>
            </div>
          ) : qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="QR Code" 
              className="rounded-lg border border-gray-200"
              style={{ width: size, height: size }}
            />
          ) : (
            <div 
              className="flex items-center justify-center bg-gray-100 rounded-lg"
              style={{ width: size, height: size }}
            >
              <p className="text-gray-500 text-sm">No QR code</p>
            </div>
          )}
        </div>

        {/* Data Display */}
        <div className="w-full max-w-md">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">QR Code Data:</p>
            <p className="text-sm font-mono text-gray-900 break-all">{data}</p>
          </div>
        </div>

        {/* Controls */}
        {showControls && qrDataUrl && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={generateQRCode}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
            
            <button
              onClick={downloadQRCode}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Data'}</span>
            </button>
            
            <button
              onClick={copyImageToClipboard}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>Copy Image</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeGenerator;