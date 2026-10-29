import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, type AuthUser } from '../services/authService';

export type User = AuthUser;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;                                              // conferindo a sessão ao abrir
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setPassword: (token: string, password: string) => Promise<void>; // criar senha pelo link do e-mail
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ao abrir a página, pergunta ao backend se já existe uma sessão
  useEffect(() => {
    authService.me().then((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
  }, []);

  // Se o backend avisar que a sessão expirou, volta para a tela de login
  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener('wiaflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('wiaflow:unauthorized', handleUnauthorized);
  }, [queryClient]);

  const login = async (email: string, password: string) => {
    const loggedUser = await authService.login(email, password);
    queryClient.clear(); // descarta dados de uma sessão anterior
    setUser(loggedUser);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear(); // o próximo usuário não vê dados do anterior
      setUser(null);
    }
  };

  // Cria a senha pelo link do e-mail e já entra no sistema
  const setPassword = async (token: string, password: string) => {
    const loggedUser = await authService.setPassword(token, password);
    queryClient.clear();
    setUser(loggedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setPassword }}>
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