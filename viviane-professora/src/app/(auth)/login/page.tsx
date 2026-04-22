"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const search = useSearchParams()
  const callbackUrl = search.get("callbackUrl") || "/"

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError("E-mail ou senha incorretos")
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: "var(--color-app-bg)" }}>
      <form onSubmit={onSubmit} className="app-card w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Viviane Professora</h1>
        <p className="text-xs text-app-muted mb-6" style={{ color: "var(--color-app-muted)" }}>
          Entre para continuar
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1" style={{ color: "var(--color-app-muted)" }}>
              E-mail
            </label>
            <input
              type="email"
              className="app-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1" style={{ color: "var(--color-app-muted)" }}>
              Senha
            </label>
            <input
              type="password"
              className="app-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

        <button type="submit" className="app-btn-primary w-full mt-5" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  )
}
