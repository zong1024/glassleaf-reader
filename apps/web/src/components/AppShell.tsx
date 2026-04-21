import { Library, LogOut, Menu, Search, Upload, UserRound } from "lucide-react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSession } from "../lib/session";
import { HomePage } from "../pages/HomePage";
import { LibraryPage } from "../pages/LibraryPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ReaderPage } from "../pages/ReaderPage";
import { UploadPage } from "../pages/UploadPage";

const primaryNav = [
  { to: "/", label: "Glassleaf Home" },
  { to: "/library", label: "我的书架", icon: Library },
];

function mobileTitle(pathname: string) {
  if (pathname.startsWith("/library")) {
    return "我的书架";
  }

  if (pathname.startsWith("/upload")) {
    return "上传图书";
  }

  if (pathname.startsWith("/profile")) {
    return "账号";
  }

  if (pathname.startsWith("/reader")) {
    return "阅读中";
  }

  return "Glassleaf Home";
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSession();
  const isMobile = useMediaQuery("(max-width: 860px)");

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar__left">
          {!isMobile ? (
            primaryNav.map((item, index) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  `portal-topbar__pill ${index === 0 ? "portal-topbar__pill--blue" : "portal-topbar__pill--green"} ${
                    isActive ? "is-active" : ""
                  }`
                }
                to={item.to}
              >
                {item.icon ? <item.icon size={14} /> : null}
                <span>{item.label}</span>
              </NavLink>
            ))
          ) : (
            <button className="portal-topbar__mobile-title" onClick={() => navigate("/")} type="button">
              {mobileTitle(pathname)}
            </button>
          )}
        </div>

        <div className="portal-topbar__right">
          {!isMobile ? (
            <button className="portal-topbar__text" onClick={() => navigate("/upload")} type="button">
              上传
            </button>
          ) : null}
          <button className="portal-topbar__icon" onClick={() => navigate("/library")} type="button">
            <Search size={16} />
          </button>
          <button className="portal-topbar__icon" onClick={() => navigate("/upload")} type="button">
            <Upload size={16} />
          </button>
          <button className="portal-topbar__icon" onClick={() => navigate("/profile")} type="button">
            <UserRound size={16} />
          </button>
          {!isMobile ? (
            <button className="portal-topbar__icon" onClick={signOut} type="button">
              <LogOut size={16} />
            </button>
          ) : (
            <button className="portal-topbar__icon" onClick={() => navigate("/library")} type="button">
              <Menu size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="portal-shell__body">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
        </Routes>
      </main>
    </div>
  );
}
