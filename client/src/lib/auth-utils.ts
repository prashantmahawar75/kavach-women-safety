export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) || error.message.includes('Access token required');
}

export function getAuthToken(): string | null {
  return localStorage.getItem('kavach_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('kavach_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('kavach_token');
}
