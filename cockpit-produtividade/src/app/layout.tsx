import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/providers/providers"

export const metadata: Metadata = {
  title: "Cockpit de Produtividade",
  description: "Gestão de tarefas, estudos e financeiro — tudo em um lugar.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
