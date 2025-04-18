export function decodeToken(token) {
    try {
      const base64 = token.split('.')[1];
      return JSON.parse(atob(base64));
    } catch (e) {
      return null;
    }
  }
  