import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, HashRouter } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { api } from "./lib/api";
import { SessionContext } from "./lib/session";
import {
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken,
} from "./lib/storage";
import type { User } from "./lib/types";
import { AuthPage } from "./pages/AuthPage";

function App() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getStoredToken());
  const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter;

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: () => api.auth.me(token!),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (meQuery.isError && token) {
      clearStoredTokens();
      setToken(null);
    }
  }, [meQuery.isError, token]);

  const handleAuthenticated = ({
    token: nextToken,
    refreshToken,
    user,
  }: {
    token: string;
    refreshToken?: string;
    user: User;
  }) => {
    clearStoredTokens();
    setStoredToken(nextToken);
    if (refreshToken) {
      setStoredRefreshToken(refreshToken);
    }
    setToken(nextToken);
    queryClient.setQueryData(["me", nextToken], { user });
  };

  const sessionValue = useMemo(
    () =>
      token && meQuery.data?.user
        ? {
            token,
            user: meQuery.data.user,
            signOut: () => {
              const refreshToken = getStoredRefreshToken();
              if (refreshToken && !token.startsWith("local:")) {
                void api.auth.logout(refreshToken).catch(() => undefined);
              }
              clearStoredTokens();
              setToken(null);
              queryClient.clear();
            },
          }
        : null,
    [meQuery.data?.user, queryClient, token],
  );

  if (token && meQuery.isLoading) {
    return (
      <div className="splash-screen">
        <div className="glass-panel splash-card">
          <span className="section-title__eyebrow">Glassleaf</span>
          <h1>Restoring your reading room...</h1>
        </div>
      </div>
    );
  }

  if (!sessionValue) {
    return <AuthPage loading={meQuery.isLoading} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <SessionContext.Provider value={sessionValue}>
      <Router>
        <AppShell />
      </Router>
    </SessionContext.Provider>
  );
}

export default App;
