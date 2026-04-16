import { SettingsTabs } from "@/app/components/settings/settings-tabs"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <SettingsTabs />
      {children}
    </div>
  )
}
