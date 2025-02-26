import React, { useState, useEffect } from 'react';
import sign from 'jwt-encode';
import { v4 as uuidv4 } from 'uuid';
import { Copy, Key } from 'lucide-react';

interface FormData {
  email: string;
  jwtSecret: string;
  customJSON: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = localStorage.getItem('jwtFormData');
    return saved ? JSON.parse(saved) : {
      email: '',
      jwtSecret: '',
      customJSON: '{}'
    };
  });

  const [expiration, setExpiration] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  });

  const [generatedToken, setGeneratedToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('jwtFormData', JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateToken = () => {
    try {
      let customJSONParsed = {};
      try {
        customJSONParsed = JSON.parse(formData.customJSON);
      } catch {
        throw new Error('Invalid JSON in custom data');
      }

      const payload = {
        sub: formData.email,
        exp: Math.floor(new Date(expiration).getTime() / 1000),
        jti: uuidv4(),
        alg: "HS256",
        username: formData.email,
        userId: formData.email,
        ...customJSONParsed,
      };

      const token = sign(payload, formData.jwtSecret);
      setGeneratedToken(token);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedToken);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-neutral">JWT Token Generator</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-1">
                Expiration Date/Time
              </label>
              <input
                type="datetime-local"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-1">
                JWT Secret *
              </label>
              <input
                type="text"
                name="jwtSecret"
                value={formData.jwtSecret}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-1">
                Custom JSON Data
              </label>
              <textarea
                name="customJSON"
                value={formData.customJSON}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <button
              onClick={generateToken}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Generate Token
            </button>

            {generatedToken && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-neutral mb-1">
                  Generated Token
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedToken}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                    rows={4}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-2 p-2 bg-secondary hover:bg-secondary/90 text-white rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;