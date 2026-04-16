import { Sidebar } from "@/app/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl pb-6 pl-16 pr-4 pt-20 sm:pb-8 sm:pl-20 sm:pr-8 lg:pl-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
