import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, type AuthUser } from '../services/authService';

export type User = AuthUser;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;                                    // conferindo a sessão ao abrir
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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