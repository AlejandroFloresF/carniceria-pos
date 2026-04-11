import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthUser {
  username: string
  role: 'Admin' | 'Cashier'
  email?: string | null
  profilePhoto?: string | null
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  updateProfile: (patch: Partial<AuthUser>) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:   null,
      token:  null,
      login:  (token, user) => set({ token, user }),
      updateProfile: (patch) => set(s => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => set({ token: null, user: null }),
      isAdmin: () => get().user?.role === 'Admin',
    }),
    {
      name:    'auth-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
