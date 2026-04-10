import { Skeleton } from "@/app/components/ui/skeleton"

export default function NotesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28 rounded-[--radius-md]" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[--radius-lg]" />
        ))}
      </div>
    </div>
  )
}
