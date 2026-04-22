import { getSkill, type TeachingSkillId } from "@/config/teaching-skills"

export function SkillHeader({ skillId, right }: { skillId: TeachingSkillId; right?: React.ReactNode }) {
  const skill = getSkill(skillId)!
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{skill.icon}</span>
          <h1 className="text-2xl font-bold">{skill.label}</h1>
        </div>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          {skill.tagline}
        </p>
        {skill.claudeFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.claudeFeatures.map((f) => (
              <span key={f} className="app-pill">{f}</span>
            ))}
          </div>
        )}
      </div>
      {right}
    </header>
  )
}
