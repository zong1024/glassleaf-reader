import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { LoaderCircle, Sparkles, Smartphone, MonitorSmartphone, BookOpenText } from "lucide-react";

import { api } from "../lib/api";
import type { User } from "../lib/types";

type AuthPageProps = {
  onAuthenticated: (payload: { token: string; refreshToken?: string; user: User }) => void;
  loading?: boolean;
};

export function AuthPage({ onAuthenticated, loading }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload =
        mode === "login"
          ? await api.auth.login({ email, password })
          : await api.auth.register({ email, password, name });
      onAuthenticated(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-hero">
        <motion.div
          className="auth-hero__poster"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="brand-lockup brand-lockup--hero">
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <div>
              <strong>Glassleaf</strong>
              <p>Apple Books inspired fluid web reader</p>
            </div>
          </div>

          <div className="auth-copy">
            <span className="section-title__eyebrow">EPUB / PDF / TXT / MD</span>
            <h1>Build your private reading room with fast parsing and calm motion.</h1>
            <p>
              Upload your library, resume instantly across devices, and keep bookmarks, notes, and reading
              progress synchronized inside one elegant React workspace.
            </p>
          </div>

          <div className="auth-feature-grid">
            <article className="glass-panel auth-feature-card">
              <BookOpenText size={18} />
              <div>
                <strong>Reader-first UI</strong>
                <p>Large-title hierarchy, sheet-based controls, tap zones, and typography-led layouts.</p>
              </div>
            </article>
            <article className="glass-panel auth-feature-card">
              <Smartphone size={18} />
              <div>
                <strong>Touch native</strong>
                <p>Thumb-friendly controls, safe-area aware navigation, and gesture-compatible reading chrome.</p>
              </div>
            </article>
            <article className="glass-panel auth-feature-card">
              <MonitorSmartphone size={18} />
              <div>
                <strong>Cross-device flow</strong>
                <p>Continue reading, organize your shelf, and manage bookmarks from mobile or desktop.</p>
              </div>
            </article>
          </div>
        </motion.div>
      </section>

      <section className="auth-panel glass-panel">
        <div className="auth-panel__toggle">
          <button
            className={mode === "login" ? "is-active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={mode === "register" ? "is-active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <span className="auth-form__eyebrow">{mode === "login" ? "Welcome back" : "New library setup"}</span>
            <h2>{mode === "login" ? "Continue where you left off." : "Start your personal book cloud."}</h2>
          </div>

          {mode === "register" ? (
            <label>
              <span>Name</span>
              <input onChange={(event) => setName(event.target.value)} placeholder="Glassleaf reader" value={name} />
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="inline-error">{error}</p> : null}

          <button className="primary-button" disabled={isSubmitting || loading} type="submit">
            {isSubmitting || loading ? <LoaderCircle className="is-spinning" size={16} /> : null}
            <span>{mode === "login" ? "Enter Glassleaf" : "Create my account"}</span>
          </button>

          <p className="auth-form__helper">Run the seed script to create the demo account declared in the API environment.</p>
        </form>
      </section>
    </div>
  );
}
