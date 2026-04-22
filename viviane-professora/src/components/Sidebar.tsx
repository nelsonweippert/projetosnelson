"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TEACHING_SKILLS } from "@/config/teaching-skills"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()

  return (
    <aside className="app-sidebar fixed left-0 top-0 bottom-0 w-64 flex flex-col py-5 px-3 z-10">
      <Link href="/" className="px-3 py-2 mb-5">
        <div className="font-[family-name:var(--font-sora)] text-lg font-bold">Viviane Professora</div>
        <div className="text-[10px] text-app-muted mt-0.5">Assistente pedagógico</div>
      </Link>

      <nav className="flex-1 flex flex-col gap-0.5">
        <Link
          href="/"
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition",
            pathname === "/" ? "bg-accent-soft text-accent-dark" : "text-app-text hover:bg-app-surface-hover",
          )}
        >
          <span>🏠</span> Início
        </Link>

        <div className="px-3 mt-4 mb-1 text-[10px] font-bold uppercase tracking-wider text-app-muted">Skills</div>

        {TEACHING_SKILLS.map((skill) => {
          const active = pathname.startsWith(skill.route)
          return (
            <Link
              key={skill.id}
              href={skill.route}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition",
                active ? "bg-accent-soft text-accent-dark" : "text-app-text hover:bg-app-surface-hover",
              )}
              style={active ? { background: "var(--color-accent-soft)", color: "var(--color-accent-dark)" } : undefined}
            >
              <span>{skill.icon}</span> {skill.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-app-border pt-3 mt-3" style={{ borderTopColor: "var(--color-app-border)" }}>
        <div className="px-3 text-xs text-app-muted mb-2">{userName ?? "Professora"}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-xs text-app-muted hover:text-app-text hover:bg-app-surface-hover rounded-lg"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
