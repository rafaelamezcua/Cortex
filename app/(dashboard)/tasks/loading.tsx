import { Skeleton } from "@/app/components/ui/skeleton"

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <Skeleton className="h-12 rounded-[--radius-md]" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-[--radius-md]" />
        ))}
      </div>
    </div>
  )
}
