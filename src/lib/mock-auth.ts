export type MockUser = { name: string; email: string };

const AUTH_KEY = 'documind-mock-user';

export function getMockUser(): MockUser | null {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? (JSON.parse(saved) as MockUser) : null;
  } catch {
    return null;
  }
}

export function signInMock(email: string, name = 'Mara Ellison') {
  const user = { name, email };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function signOutMock() {
  localStorage.removeItem(AUTH_KEY);
}