import { Sidebar } from "@/app/components/layout/sidebar"
import { CommandPalette } from "@/app/components/layout/command-palette"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      </main>
      <CommandPalette />
    </div>
  )
}
