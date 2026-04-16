import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Fraunces } from "next/font/google"
import { ThemeProvider } from "@/app/components/theme-provider"
import { CommandPalette } from "@/app/components/ui/command-palette"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
})

export const metadata: Metadata = {
  title: "Luma",
  description: "Your personal AI-powered command center",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Luma",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#c99a5b" },
    { media: "(prefers-color-scheme: dark)", color: "#e4b87a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full bg-background text-foreground">
        {/* Inline flash-prevention: runs before paint, sets data-theme on <html>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("luma-theme");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`,
          }}
        />
        <ThemeProvider>
          {children}
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  )
}
