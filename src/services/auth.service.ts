import type { AuthSession, User } from "@/types";
import { comparePassword } from "@/lib/auth";
import { fetchUserByUsername } from "./user.service";

const SESSION_KEY = "ideola_auth_session";
const SESSION_EXPIRY_HOURS = 24; // 24 hours

/**
 * Calculate expiry time
 */
const calculateExpiry = (): number => {
  return Date.now() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
};

/**
 * Check if session is expired
 */
const isSessionExpired = (expiresAt?: number): boolean => {
  if (!expiresAt) return true;
  return Date.now() > expiresAt;
};

/**
 * Authenticate user with username and password
 */
export const login = async (username: string, password: string) => {
  const user = await fetchUserByUsername(username);

  if (!user) {
    throw new Error("Invalid username or password");
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error("Invalid username or password");
  }

  // Generate a more secure random token
  const generateSecureToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // Create session with expiry
  const session: AuthSession = {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      created_at: user.created_at,
    },
    token: generateSecureToken(), // Cryptographically secure token
    expiresAt: calculateExpiry(),
  };

  return session;
};

/**
 * Save session to localStorage with expiry
 */
export const saveSession = (session: AuthSession): void => {
  const sessionWithExpiry = {
    ...session,
    expiresAt: calculateExpiry(),
  };
  // Store in localStorage but consider this sensitive data
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionWithExpiry));
};

/**
 * Get current session from localStorage
 * Checks for expiry before returning
 */
export const getSession = (): AuthSession | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  
  try {
    const parsed = JSON.parse(session);
    
    // Check if session expired
    if (isSessionExpired(parsed.expiresAt)) {
      clearSession();
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Clear session from localStorage
 */
export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("ideola_user"); // Clear old user storage too
};

/**
 * Check if user is authenticated
 * Also checks session expiry
 */
export const isAuthenticated = (): boolean => {
  const session = getSession();
  return session !== null;
};

/**
 * Get current user from session
 * Returns null if session is expired
 */
export const getCurrentUser = (): User | null => {
  const session = getSession();
  return session?.user || null;
};

/**
 * Check if current user is admin
 * Also checks session validity
 */
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "admin";
};

/**
 * Check if current user is member
 * Also checks session validity
 */
export const isMember = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "member";
};
