import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { pb } from "../lib/pb";
import { C } from "../lib/collections";
import { can as canDo, isManagerRole } from "../lib/permissions";
import { logAction } from "../lib/repository";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // La session PocketBase peut changer hors de React (expiration, autre onglet).
  useEffect(() => {
    return pb.authStore.onChange((_, record) => setUser(record), false);
  }, []);

  const loadSettings = useCallback(async (current) => {
    if (!current) return setSettings(null);
    try {
      const res = await pb.collection(C.settings).getList(1, 1, {
        filter: `owner_user="${current.id}"`,
        expand: "base_currency,display_currency,jurisdiction",
      });
      setSettings(res.items[0] || null);
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (pb.authStore.isValid) {
        try {
          const fresh = await pb.collection(C.users).authRefresh();
          if (alive) setUser(fresh.record);
          await loadSettings(fresh.record);
        } catch {
          pb.authStore.clear();
        }
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadSettings]);

  const login = useCallback(
    async (email, password) => {
      const auth = await pb.collection(C.users).authWithPassword(email, password);
      if (auth.record.active === false) {
        pb.authStore.clear();
        throw new Error("Ce compte est désactivé. Contactez votre gestionnaire.");
      }
      await pb.collection(C.users).update(auth.record.id, {
        last_login_at: new Date().toISOString(),
      });
      await logAction("login", C.users, auth.record);
      await loadSettings(auth.record);
      setUser(auth.record);
      return auth.record;
    },
    [loadSettings]
  );

  const register = useCallback(
    async ({ email, password, fullName, role, phone, country }) => {
      await pb.collection(C.users).create({
        email,
        password,
        passwordConfirm: password,
        full_name: fullName,
        role,
        phone: phone || "",
        country: country || "",
        language: "fr",
        active: true,
        onboarding_done: false,
        emailVisibility: true,
      });
      // La vérification par email n'est envoyée que si le serveur a un SMTP.
      try {
        await pb.collection(C.users).requestVerification(email);
      } catch {
        /* SMTP non configuré : on n'affiche rien de faux à l'utilisateur */
      }
      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
    setSettings(null);
  }, []);

  const requestPasswordReset = useCallback(
    (email) => pb.collection(C.users).requestPasswordReset(email),
    []
  );

  const changePassword = useCallback(
    async (oldPassword, password) => {
      await pb.collection(C.users).update(user.id, {
        oldPassword,
        password,
        passwordConfirm: password,
      });
      logout();
    },
    [user, logout]
  );

  const refreshUser = useCallback(async () => {
    const fresh = await pb.collection(C.users).getOne(pb.authStore.record.id);
    setUser(fresh);
    await loadSettings(fresh);
    return fresh;
  }, [loadSettings]);

  const value = useMemo(
    () => ({
      user,
      settings,
      loading,
      isManager: user ? isManagerRole(user.role) : false,
      can: (permission) => canDo(user, permission),
      currency: settings?.expand?.display_currency?.code
        || settings?.expand?.base_currency?.code
        || "XOF",
      login,
      register,
      logout,
      requestPasswordReset,
      changePassword,
      refreshUser,
      reloadSettings: () => loadSettings(user),
    }),
    [user, settings, loading, login, register, logout, requestPasswordReset,
     changePassword, refreshUser, loadSettings]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  return ctx;
}
