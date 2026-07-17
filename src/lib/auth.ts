export interface StoredUser {
  dni: string;
  issueDate: string;
  fullName: string;
  email: string;
  password: string;
  specialties: string[];
}

const USERS_KEY = "medicu:users";
const SESSION_KEY = "medicu:session";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getUsers(): StoredUser[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    return JSON.parse(s.getItem(USERS_KEY) || "[]") as StoredUser[];
  } catch {
    return [];
  }
}

export function saveUser(user: StoredUser): void {
  const s = safeStorage();
  if (!s) return;
  const users = getUsers();
  users.push(user);
  s.setItem(USERS_KEY, JSON.stringify(users));
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function setSession(email: string): void {
  const s = safeStorage();
  if (!s) return;
  s.setItem(SESSION_KEY, email);
}

export function clearSession(): void {
  const s = safeStorage();
  if (!s) return;
  s.removeItem(SESSION_KEY);
}

export function getSession(): string | null {
  const s = safeStorage();
  if (!s) return null;
  return s.getItem(SESSION_KEY);
}

// Validation helpers
export function validateDni(dni: string): string | null {
  if (!/^\d{8}$/.test(dni)) return "El DNI debe tener exactamente 8 dígitos.";
  return null;
}

export function validateIssueDate(date: string): string | null {
  if (!date) return "Ingresa la fecha de emisión.";
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime())) return "Fecha inválida.";
  if (d.getTime() > today.getTime()) return "La fecha no puede ser futura.";
  const min = new Date();
  min.setFullYear(min.getFullYear() - 60);
  if (d.getTime() < min.getTime()) return "Fecha demasiado antigua.";
  return null;
}

export function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return "Ingresa tu nombre completo (mínimo 3 caracteres).";
  if (trimmed.length > 80) return "El nombre es demasiado largo.";
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s'-]+$/.test(trimmed)) return "El nombre solo puede contener letras.";
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Correo electrónico inválido.";
  if (trimmed.length > 120) return "El correo es demasiado largo.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return "La contraseña debe incluir letras y números.";
  return null;
}
