const KEY = "mapbuildify:password";

export function loadPassword(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePassword(password: string): void {
  try {
    localStorage.setItem(KEY, password);
  } catch {
    // Storage blocked: the password just isn't remembered.
  }
}
