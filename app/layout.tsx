import "./globals.css"
import { Providers } from "@/components/Providers"
import { ClientOnboarding } from "@/components/client-onboarding"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <ClientOnboarding />
        </Providers>
      </body>
    </html>
  )
}
