import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowRight, PawPrint, Eye, EyeOff } from "lucide-react"
import catHero from "@/assets/CatDog.jpg"
import { useAuth } from "@/services/auth/auth.service"
import { SELF_REGISTER_ROLE_ID } from "@/services/auth/auth.types"

type Mode = "login" | "register"

export function LoginForm() {
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError("")
    setPassword("")
    setShowPassword(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch {
      setError("Invalid email or password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const [firstName, ...rest] = fullName.trim().split(/\s+/)
      const lastName = rest.join(" ")

      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        roleID: SELF_REGISTER_ROLE_ID, // always PetOwner — not user-selectable
      })
      // Registration succeeded — drop them back into the login fields, pre-filled.
      switchMode("login")
    } catch {
      setError("Could not create account. That email or username may already be registered.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left column — hero image */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <img
          src={catHero} alt=""className="absolute inset-0 h-full w-full scale-110 object-cover object-[30%_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/60" />

        <div className="relative flex h-full flex-col justify-end p-10">
          <div className="max-w-md space-y-4">
            <h2 className="text-4xl font-bold leading-tight text-white">
              Every pet deserves the{" "}
              <span className="bg-gradient-to-r from-teal-400 to-green-400 bg-clip-text text-transparent">
                best care.
              </span>
            </h2>
            <p className="text-slate-200">
              Centralized clinical records for your clinic — fast, secure, and built around your patients.
            </p>
          </div>
        </div>
      </div>

      {/* Right column — auth form */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 p-4 lg:w-1/2">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative w-full max-w-sm space-y-6 rounded-3xl border border-white/60 bg-white/50 p-8 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-green-500">
              <PawPrint className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-slate-900">PetVet MR</span>
          </div>

          <div className="space-y-2">
            <h1 className="!text-slate-900 text-3xl font-extrabold tracking-tight">
              {mode === "login" ? "Welcome!" : "Create an account"}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to manage your clinic or view your pet's records."
                : "Register to track your pet's health records and appointments."}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username"
                  className="h-14 rounded-2xl border-0 bg-white px-5 text-base shadow-sm ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    className="h-14 rounded-2xl border-0 bg-white px-5 pr-12 text-base shadow-sm ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-14 w-full rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-green-500 text-base font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? "Signing in..." : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jsmith"
                  className="h-14 rounded-2xl border-0 bg-white px-5 text-base shadow-sm ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="h-14 rounded-2xl border-0 bg-white px-5 text-base shadow-sm ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="regEmail"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Email
                </Label>
                <Input
                  id="regEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  className="h-14 rounded-2xl border-0 bg-white px-5 text-base shadow-sm ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="regPassword"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="regPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 rounded-2xl border-0 bg-white px-5 pr-12 text-base shadow-sm ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-14 w-full rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-green-500 text-base font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? "Creating account..." : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-slate-600">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}