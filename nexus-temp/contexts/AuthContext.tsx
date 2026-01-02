import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define User type
export interface User {
    id: number;
    login: string;
    userName: string;
    userType: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (userData: User, token?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage on load
        const storedUser = localStorage.getItem('kiki_user');
        // const storedToken = localStorage.getItem('kiki_token');

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }
    }, []);

    const login = (userData: User, tokenData?: string) => {
        setUser(userData);
        localStorage.setItem('kiki_user', JSON.stringify(userData));

        if (tokenData) {
            // For future JWT use
            setToken(tokenData);
            localStorage.setItem('kiki_token', tokenData);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('kiki_user');
        localStorage.removeItem('kiki_token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
