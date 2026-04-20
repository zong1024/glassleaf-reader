import { Sparkles, Library, Upload, UserRound, House, Search, LogOut } from "lucide-react";
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
  { to: "/", label: "Home", icon: House },
  { to: "/library", label: "Library", icon: Library },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/profile", label: "Profile", icon: UserRound },
];

function pageTitle(pathname: string) {
  if (pathname.startsWith("/reader")) {
    return "Reading now";
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
    <div className="shell">
      {!isMobile ? (
        <aside className="sidebar glass-panel">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <strong>Glassleaf</strong>
              <p>Calm reading across devices</p>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Primary navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                to={to}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-pill">
              <div className="user-pill__avatar">{displayName(user).slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{displayName(user)}</strong>
                <p>{user.email}</p>
              </div>
            </div>
            <button className="ghost-button" onClick={signOut} type="button">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </aside>
      ) : null}

      <div className="shell-main">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">Personal cloud library</p>
            <h1>{pageTitle(pathname)}</h1>
          </div>
          <div className="topbar__actions">
            <button className="search-chip" onClick={() => navigate("/library")} type="button">
              <Search size={16} />
              <span>Search your shelf</span>
            </button>
          </div>
        </header>

        <main className="page-frame">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reader/:bookId" element={<ReaderPage />} />
          </Routes>
        </main>

        {isMobile ? (
          <nav className="bottom-nav glass-panel" aria-label="Bottom navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`}
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
