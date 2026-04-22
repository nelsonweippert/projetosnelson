import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/providers/providers"

export const metadata: Metadata = {
  title: "Viviane Professora",
  description: "Assistente pedagógico para professora do Fundamental I",
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
