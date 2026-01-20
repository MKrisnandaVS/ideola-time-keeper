import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'client';
  full_name: string;
  created_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

const SESSION_KEY = 'ideola_auth_session';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const saveSession = (session: AuthSession): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getSession = (): AuthSession | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('ideola_user'); // Clear old user storage too
};

export const isAuthenticated = (): boolean => {
  return getSession() !== null;
};

export const getCurrentUser = (): User | null => {
  const session = getSession();
  return session?.user || null;
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const isClient = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'client';
};
