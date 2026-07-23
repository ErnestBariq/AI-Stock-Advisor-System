import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Initialize state from localStorage
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const savedAuthState = localStorage.getItem('isAuthenticated');
        return savedAuthState === 'true' || false;
    });

    // Update localStorage when isAuthenticated changes
    useEffect(() => {
        localStorage.setItem('isAuthenticated', isAuthenticated);
    }, [isAuthenticated]);

    const login = () => {
        setIsAuthenticated(true);
    };

    const logout = () => {
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};