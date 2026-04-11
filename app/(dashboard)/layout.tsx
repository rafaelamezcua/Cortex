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
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-20 sm:px-8 sm:pb-8 sm:pt-8">
          {children}
        </div>
      </main>
      <CommandPalette />
    </div>
  )
}
