import React, { useState, useEffect } from 'react';
import { importPKCS8, JWK, KeyObject, SignJWT, CryptoKey } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { Copy, CheckCircle2, XCircle, Check } from 'lucide-react';

interface FormData {
    email: string;
    jwtSecret: string;
    customJSON: string;
    algorithm: string;
}

enum Alg {
    HS256 = 'HS256',
    HS384 = 'HS384',
    HS512 = 'HS512',
    RS256 = 'RS256',
    RS384 = 'RS384',
    RS512 = 'RS512',
    ES256 = 'ES256',
    ES384 = 'ES384',
    ES512 = 'ES512',
    PS256 = 'PS256',
    PS384 = 'PS384',
    PS512 = 'PS512',
}

interface SupportedAlgorithm {
    key: Alg;
    largeInput: boolean;
}

interface SupportedAlgorithmGroup {
    title: string;
    secretLabel: string;
    algorithms: SupportedAlgorithm[];
}

const supportedAlgorithms: SupportedAlgorithmGroup[] = [
    {
        title: 'HMAC (Shared Secret)',
        secretLabel: 'JWT Secret',
        algorithms: [
            { key: Alg.HS256, largeInput: false },
            { key: Alg.HS384, largeInput: false },
            { key: Alg.HS512, largeInput: false },
        ],
    },
    {
        title: 'RSA (Public/Private Key Pair)',
        secretLabel: 'RSA Private Key',
        algorithms: [
            { key: Alg.RS256, largeInput: true },
            { key: Alg.RS384, largeInput: true },
            { key: Alg.RS512, largeInput: true },
        ],
    },
    {
        title: 'ECDSA (Elliptic Curve)',
        secretLabel: 'EC Private Key',
        algorithms: [
            { key: Alg.ES256, largeInput: true },
            { key: Alg.ES384, largeInput: true },
            { key: Alg.ES512, largeInput: true },
        ],
    },
    {
        title: 'RSA-PSS (Public/Private Key Pair)',
        secretLabel: 'RSA Private Key',
        algorithms: [
            { key: Alg.PS256, largeInput: true },
            { key: Alg.PS384, largeInput: true },
            { key: Alg.PS512, largeInput: true },
        ],
    },
];

declare global {
    interface Window {
        gtag(event: string, action: string, params: Record<string, unknown>): void;
    }
}

const sendAnalytics = () => {
    if (!window.gtag) {
        return;
    }

    window.gtag('event', 'generate_token', {
        event_category: 'Token',
        event_label   : 'JWT Token Generator',
        value         : 1
    });
}

function App() {
    const [formData, setFormData] = useState<FormData>(() => {
        const saved = localStorage.getItem('jwtFormData');
        return saved ? JSON.parse(saved) : {
            email     : '',
            jwtSecret : '',
            customJSON: '{}',
            algorithm : supportedAlgorithms[0].algorithms[0].key,
        };
    });
    const [expiration, setExpiration] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 16);
    });

    const [generatedToken, setGeneratedToken] = useState('');
    const [keyTitle, setKeyTitle] = useState('JWT Secret (Shared Key)');
    const [largeInput, setLargeInput] = useState(false);
    const [error, setError] = useState('');
    const [isJSONValid, setIsJSONValid] = useState(true);
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    useEffect(() => {
        localStorage.setItem('jwtFormData', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        try {
            JSON.parse(formData.customJSON);
            setIsJSONValid(true);
        } catch {
            setIsJSONValid(false);
        }
    }, [formData.customJSON]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const {name, value} = e.target;
        const algorithm = supportedAlgorithms.flatMap(group => group.algorithms.map(algorithm => ({...algorithm, keyTitle: group.secretLabel}))).find(alg => alg.key === value);

        if (algorithm) {
            setKeyTitle(algorithm.keyTitle);
            setLargeInput(algorithm.largeInput);
        }

        setFormData(prev => ({...prev, [name]: value}));
    };

    const generateToken = async () => {
        sendAnalytics();

        try {
            let customJSONParsed = {};
            try {
                customJSONParsed = JSON.parse(formData.customJSON);
            } catch {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error('Invalid JSON in custom data');
            }

            const jti = uuidv4();
            const sub = formData.email;
            const exp = Math.floor(new Date(expiration).getTime() / 1000);
            const payload = {
                sub,
                exp,
                jti,
                username: formData.email,
                userId  : formData.email,
                ...customJSONParsed,
            };

            console.log('Generated Payload:', payload);
            let secret: CryptoKey | KeyObject | JWK | Uint8Array;

            if (formData.algorithm.startsWith('HS')) {
                // HMAC (Shared Secret)
                secret = new TextEncoder().encode(btoa(formData.jwtSecret));

            } else if (formData.algorithm.startsWith('RS') || formData.algorithm.startsWith('PS')) {
                // RSA and RSA-PSS (Private Key)
                secret = await importPKCS8(formData.jwtSecret, formData.algorithm);

            } else if (formData.algorithm.startsWith('ES')) {
                // ECDSA (Elliptic Curve Key)
                secret = await importPKCS8(formData.jwtSecret, formData.algorithm);

            } else {
                throw new Error('Unsupported algorithm');
            }

            console.log('Generated Secret Key:', secret);
            const token = await new SignJWT(payload)
                .setProtectedHeader({alg: formData.algorithm})
                .setIssuedAt()
                .setJti(jti)
                .setSubject(sub)
                .setIssuer('jwt-token-generator.netlify.app')
                .setAudience('urn:jwt-token-generator:api')
                .setExpirationTime(exp)
                .sign(secret)

            console.log('Generated Token:', token);

            setGeneratedToken(token);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate token');
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedToken);
            setShowCopySuccess(true);
            setTimeout(() => setShowCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-4 px-4">
            <div className="max-w-3xl mx-auto">
                <img src="/logo.png" alt="Logo" className="mx-auto my-4 w-16 h-16"/>
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <h1 className="text-2xl font-bold text-neutral">JWT Key Generator</h1>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral mb-1">
                                Algorithm
                            </label>

                            <select
                                name="algorithm"
                                value={formData.algorithm}
                                onChange={handleSelectChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {supportedAlgorithms.map((group) => (
                                    <optgroup key={group.title} label={group.title}>
                                        {group.algorithms.map((alg) => (
                                            <option key={alg.key} value={alg.key}>{alg.key}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

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
                                {keyTitle} *
                            </label>
                            {largeInput ? (
                                <textarea
                                    name="jwtSecret"
                                    value={formData.jwtSecret}
                                    onChange={handleInputChange}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                    required
                                />
                            ) : (
                                <input
                                    type="text"
                                    name="jwtSecret"
                                    value={formData.jwtSecret}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            )}
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-neutral mb-1">
                                Custom payload Data (JSON)
                            </label>
                            <textarea
                                name="customJSON"
                                value={formData.customJSON}
                                onChange={handleInputChange}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            />
                            <div className="absolute bottom-2 right-2">
                                {isJSONValid ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500"/>
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-500"/>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <button
                            onClick={generateToken}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                        >
                            Generate Key
                        </button>

                        {generatedToken && (
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-neutral mb-1">
                                    Generated Key
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
                                        {showCopySuccess ? (
                                            <Check className="w-4 h-4 text-white"/>
                                        ) : (
                                            <Copy className="w-4 h-4"/>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4">Have suggestions or found a bug? <a href="https://github.com/matrunchyk/jwt-token-generator/issues" target="_blank" rel="noreferrer"
                                                                              className="text-primary">Open an issue</a></div>
                    <div className="text-xs text-gray-500 mt-4">We do not store any data you enter on this page. The generated token is stored in your browser's local storage.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
