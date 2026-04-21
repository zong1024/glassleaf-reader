import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";

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
      setError(submitError instanceof Error ? submitError.message : "认证失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="portal-auth">
      <div className="portal-auth__intro">
        <div className="portal-logo" aria-label="Glassleaf">
          <span className="portal-logo__accent">Glass</span>
          <span className="portal-logo__main">leaf</span>
        </div>
        <p>登录你的私有电子书书库，继续检索、上传和阅读。</p>
      </div>

      <section className="portal-auth__panel">
        <div className="portal-searchbox__tabs portal-auth__tabs" role="tablist" aria-label="Auth mode">
          <button className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")} type="button">
            登录
          </button>
          <button className={mode === "register" ? "is-active" : ""} onClick={() => setMode("register")} type="button">
            注册
          </button>
        </div>

        <form className="portal-auth__form" onSubmit={handleSubmit}>
          <div className="portal-auth__header">
            <span className="portal-panel__eyebrow">{mode === "login" ? "欢迎回来" : "创建账号"}</span>
            <h1>{mode === "login" ? "继续进入你的书库" : "创建一个新的私人书库"}</h1>
          </div>

          {mode === "register" ? (
            <label className="portal-auth__field">
              <span>昵称</span>
              <input onChange={(event) => setName(event.target.value)} placeholder="Glassleaf Reader" value={name} />
            </label>
          ) : null}

          <label className="portal-auth__field">
            <span>邮箱</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className="portal-auth__field">
            <span>密码</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位"
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="inline-error">{error}</p> : null}

          <button className="portal-searchbox__submit portal-auth__submit" disabled={isSubmitting || loading} type="submit">
            {isSubmitting || loading ? <LoaderCircle className="is-spinning" size={16} /> : null}
            <span>{mode === "login" ? "进入书库" : "创建账号"}</span>
          </button>

          <p className="portal-auth__helper">首次体验也可以直接注册，本地和在线后端都支持这套流程。</p>
        </form>
      </section>
    </div>
  );
}
