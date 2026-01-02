import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import config from '../appConfig';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login: authLogin } = useAuth();

    if (!isOpen) return null;

    // Use the KikiAI backend URL. Assuming it's running on localhost:5068 or production URL
    // We should ideally use a config value.
    // Using relative path if proxy is set up or absolute otherwise.
    // For local dev with vite (port 3000) and API (5068), we need full URL.
    // But wait, KikiAI might be on http://localhost:5068
    const API_URL = import.meta.env.PROD
        ? 'https://kikiai.aspone.cz/api/auth' // Or whatever the production URL is
        : 'http://localhost:5068/api/auth';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? `${API_URL}/login` : `${API_URL}/register`;
            const body = isLogin
                ? { login, password }
                : { login, password, userName };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Chyba při komunikaci se serverem');
            }

            if (isLogin) {
                authLogin(data.user);
                onClose();
            } else {
                // After register, switch to login or auto-login
                setIsLogin(true);
                setError('Registrace úspěšná. Nyní se přihlašte.');
                setLoading(false);
                return; // Don't close yet
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#0b1221] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isLogin ? 'Přihlášení' : 'Registrace'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Login</label>
                        <input
                            type="text"
                            value={login}
                            onChange={e => setLogin(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white transition-colors"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Uživatelské jméno</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white transition-colors"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Heslo</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Čekejte...' : (isLogin ? 'Přihlásit' : 'Registrovat')}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    {isLogin ? 'Nemáte účet? ' : 'Již máte účet? '}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-purple-400 hover:text-purple-300 font-semibold"
                    >
                        {isLogin ? 'Zaregistrujte se' : 'Přihlašte se'}
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

export default AuthModal;
