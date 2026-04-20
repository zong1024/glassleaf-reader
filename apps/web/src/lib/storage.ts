import type { ReaderPreferences, User } from "./types";

const authTokenKey = "glassleaf.auth.token";
const refreshTokenKey = "glassleaf.auth.refresh-token";
const readerPrefsKey = "glassleaf.reader.preferences";

export function getStoredToken() {
  return window.localStorage.getItem(authTokenKey);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(authTokenKey, token);
}

export function getStoredRefreshToken() {
  return window.localStorage.getItem(refreshTokenKey);
}

export function setStoredRefreshToken(token: string) {
  window.localStorage.setItem(refreshTokenKey, token);
}

export function clearStoredTokens() {
  window.localStorage.removeItem(authTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
}

export function getReaderPreferences(): ReaderPreferences {
  const fallback: ReaderPreferences = {
    theme: "paper",
    fontScale: 1,
    lineHeight: 1.7,
  };

  const raw = window.localStorage.getItem(readerPrefsKey);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;
    return {
      theme: parsed.theme ?? fallback.theme,
      fontScale: parsed.fontScale ?? fallback.fontScale,
      lineHeight: parsed.lineHeight ?? fallback.lineHeight,
    };
  } catch {
    return fallback;
  }
}

export function setReaderPreferences(preferences: ReaderPreferences) {
  window.localStorage.setItem(readerPrefsKey, JSON.stringify(preferences));
}

export function displayName(user: User | null) {
  if (!user) {
    return "Reader";
  }

  return user.name?.trim() || user.email.split("@")[0];
}
