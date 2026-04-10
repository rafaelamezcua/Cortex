import { Skeleton } from "@/app/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="flex gap-6 -mx-8 -my-8 h-[calc(100vh)]">
      <div className="w-56 shrink-0 border-r border-border-light bg-background-secondary p-4">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-9 mb-3 rounded-[--radius-md]" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-[--radius-md]" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </div>
  )
}
