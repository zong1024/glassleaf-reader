import { Sparkles, Library, Upload, UserRound, House, LogOut } from "lucide-react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { displayName } from "../lib/storage";
import { useSession } from "../lib/session";
import { HomePage } from "../pages/HomePage";
import { LibraryPage } from "../pages/LibraryPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ReaderPage } from "../pages/ReaderPage";
import { UploadPage } from "../pages/UploadPage";

const navItems = [
  { to: "/", label: "首页", icon: House },
  { to: "/library", label: "书库", icon: Library },
  { to: "/upload", label: "上传", icon: Upload },
  { to: "/profile", label: "我的", icon: UserRound },
];

function pageTitle(pathname: string) {
  if (pathname.startsWith("/reader")) {
    return "正在阅读";
  }

  const item = navItems.find((entry) => entry.to === pathname);
  return item?.label ?? "Glassleaf";
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const isMobile = useMediaQuery("(max-width: 920px)");

  return (
    <div className="catalog-shell">
      <header className="catalog-header">
        <button className="catalog-brand" onClick={() => navigate("/")} type="button">
          <span className="catalog-brand__mark">
            <Sparkles size={16} />
          </span>
          <span className="catalog-brand__text">
            <strong>Glassleaf</strong>
            <span>多格式电子书书库</span>
          </span>
        </button>

        {!isMobile ? (
          <nav className="catalog-nav" aria-label="Primary navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                className={({ isActive }) => `catalog-nav__link ${isActive ? "is-active" : ""}`}
                to={to}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        ) : (
          <div className="catalog-header__mobile-title">
            <span>{pageTitle(pathname)}</span>
          </div>
        )}

        <div className="catalog-header__actions">
          {!isMobile ? (
            <button className="catalog-action catalog-action--primary" onClick={() => navigate("/upload")} type="button">
              <Upload size={16} />
              <span>上传图书</span>
            </button>
          ) : null}
          <button className="catalog-user" onClick={() => navigate("/profile")} type="button">
            <span className="catalog-user__avatar">{displayName(user).slice(0, 2).toUpperCase()}</span>
            {!isMobile ? (
              <span className="catalog-user__meta">
                <strong>{displayName(user)}</strong>
                <span>{user.email}</span>
              </span>
            ) : null}
          </button>
          {!isMobile ? (
            <button className="catalog-action" onClick={signOut} type="button">
              <LogOut size={16} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="catalog-shell__body">
        <main className="catalog-page-frame">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reader/:bookId" element={<ReaderPage />} />
          </Routes>
        </main>

        {isMobile ? (
          <nav className="catalog-bottom-nav" aria-label="Bottom navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                className={({ isActive }) => `catalog-bottom-nav__link ${isActive ? "is-active" : ""}`}
                to={to}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
