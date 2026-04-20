import { createContext, useContext } from "react";

import type { User } from "./types";

export type SessionValue = {
  token: string;
  user: User;
  signOut: () => void;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("Session context is not available");
  }

  return value;
}
