import { createContext, useContext, useState, createElement } from "react"
import { api } from "../apiConnection/api"
import type { LoginDto, AuthResponseDto, UserCreateDto } from "./auth.dtos"
import type { AuthContextType, AuthProviderProps, User } from "./auth.types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapAuthResponseToUser(dto: AuthResponseDto): User {
  return { id: dto.userID, username: dto.username, email: dto.email, role: dto.roleName }
}
const isAdmin = (role: string | null) => role?.toLowerCase() === "admin"

const USER_KEY = "user"

function loadStoredUser(): User | null {
  // Only restore a user if a token exists, so they can never get out of sync.
  if (!localStorage.getItem("token")) return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(loadStoredUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token") ?? null)

  const isAdminUser = isAdmin(user?.role ?? null)

  const login = async (email: string, password: string) => {
    const payload: LoginDto = { email, password }
    const data = await api.post<AuthResponseDto>("/api/Auth/login", payload)
    const mappedUser = mapAuthResponseToUser(data)
    setToken(data.token)
    setUser(mappedUser)
    localStorage.setItem("token", data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(mappedUser))
  }

  const register = async (payload: UserCreateDto) => {
    await api.post<AuthResponseDto>("/api/Auth/register", payload)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("token")
    localStorage.removeItem(USER_KEY)
    window.location.href = "/login"
  }

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        token,
        login,
        register,
        logout,
        isAdmin: isAdminUser,
        isOwner: !isAdminUser,
      },
    },
    children
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
