import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Bell, LogOut, ChevronDown } from "lucide-react";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import { useAuth } from "../context/AuthContext";
import { pb } from "../lib/pb";
import { C } from "../lib/collections";

function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const count = async () => {
      try {
        const res = await pb.collection(C.notifications).getList(1, 1, {
          filter: `user="${user.id}" && read=false`,
        });
        if (alive) setUnread(res.totalItems);
      } catch {
        /* le compteur n'est pas critique */
      }
    };
    count();

    // Temps réel : le compteur suit les notifications créées par le serveur.
    let unsubscribe;
    pb.collection(C.notifications)
      .subscribe("*", (e) => {
        if (e.record.user === user.id) count();
      })
      .then((fn) => (unsubscribe = fn))
      .catch(() => {});

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [user]);

  return (
    <Link
      to="/notifications"
      className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-surface"
      aria-label={`Notifications${unread ? `, ${unread} non lues` : ""}`}
    >
      <Bell size={18} aria-hidden />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                         rounded-full bg-alert text-white text-[10px] font-semibold
                         grid place-items-center num">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-surface"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="h-7 w-7 rounded-full bg-brand text-white grid place-items-center
                         text-xs font-semibold">
          {(user?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:block text-sm max-w-[10rem] truncate">
          {user?.full_name || user?.email}
        </span>
        <ChevronDown size={14} className="text-ink-faint" aria-hidden />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-56 card shadow-sm z-20 p-1"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-line">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-ink-faint truncate">{user?.email}</p>
            </div>
            <button
              className="w-full text-left px-3 h-9 rounded-lg text-sm hover:bg-surface"
              onClick={() => {
                setOpen(false);
                navigate("/profil");
              }}
              role="menuitem"
            >
              Mon profil
            </button>
            <button
              className="w-full text-left px-3 h-9 rounded-lg text-sm hover:bg-surface
                         flex items-center gap-2 text-alert"
              onClick={logout}
              role="menuitem"
            >
              <LogOut size={15} aria-hidden /> Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout() {
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileNav(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh flex">
      {/* Colonne de navigation — permanente à partir de lg */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-line bg-white">
        <div className="h-14 flex items-center px-5 border-b border-line">
          <Link to="/" className="font-display text-lg tracking-tight">
            GestImmo
          </Link>
        </div>
        <Sidebar />
      </aside>

      {/* Tiroir mobile */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <aside className="relative w-72 max-w-[85%] bg-white flex flex-col">
            <div className="h-14 flex items-center justify-between px-5 border-b border-line">
              <span className="font-display text-lg">GestImmo</span>
              <button
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-surface"
                onClick={() => setMobileNav(false)}
                aria-label="Fermer le menu"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 flex items-center gap-2 px-3 sm:px-5
                           border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-30">
          <button
            className="lg:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-surface"
            onClick={() => setMobileNav(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} aria-hidden />
          </button>

          <button
            className="flex-1 max-w-md h-9 px-3 flex items-center gap-2 rounded-lg
                       border border-line bg-white text-sm text-ink-faint hover:border-brand"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={15} aria-hidden />
            <span className="truncate">Rechercher un locataire, un bail, un logement…</span>
            <kbd className="hidden sm:block ml-auto text-[10px] text-ink-faint">Ctrl K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 max-w-[1400px] w-full">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
