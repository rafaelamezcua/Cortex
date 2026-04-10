import { Skeleton } from "@/app/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-[--radius-sm]" />
            <Skeleton className="h-8 w-8 rounded-[--radius-sm]" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-[--radius-md]" />
      </div>
      <Skeleton className="h-[500px] rounded-[--radius-lg]" />
    </div>
  )
}
