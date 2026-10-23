import React, { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'LIDER' | 'COLABORADOR';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('wiaflow_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (email: string, _password: string): boolean => {
    // Simulação de login - pode ser conectado a uma API Node.js/PostgreSQL futuramente
    const loggedUser: User = {
      id: 'usr-1',
      name: email.split('@')[0].toUpperCase(),
      email: email,
      role: 'ADMIN',
    };
    setUser(loggedUser);
    localStorage.setItem('wiaflow_user', JSON.stringify(loggedUser));
    return true;
  };

  const register = (name: string, email: string, _password: string): boolean => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name,
      email: email,
      role: 'COLABORADOR',
    };
    setUser(newUser);
    localStorage.setItem('wiaflow_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wiaflow_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};