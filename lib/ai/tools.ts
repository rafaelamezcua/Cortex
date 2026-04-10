import { tool } from "ai"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, calendarEvents } from "@/lib/schema"
import { eq, ne, and, gte, lte } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export const aiTools = {
  createTask: tool({
    description: "Create a new task for Ramez",
    inputSchema: z.object({
      title: z.string().describe("The task title"),
      description: z
        .string()
        .optional()
        .describe("Optional task description"),
      priority: z
        .enum(["low", "medium", "high"])
        .default("medium")
        .describe("Task priority level"),
      dueDate: z
        .string()
        .optional()
        .describe("Due date in YYYY-MM-DD format"),
    }),
    execute: async ({ title, description, priority, dueDate }) => {
      const now = new Date().toISOString()
      const id = nanoid()
      await db.insert(tasks).values({
        id,
        title,
        description: description ?? null,
        priority,
        dueDate: dueDate ?? null,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, message: `Task "${title}" created.` }
    },
  }),

  completeTask: tool({
    description:
      "Mark a task as complete. Use the task title to find and complete it.",
    inputSchema: z.object({
      title: z
        .string()
        .describe("The title (or partial title) of the task to complete"),
    }),
    execute: async ({ title }) => {
      const allTasks = await db
        .select()
        .from(tasks)
        .where(ne(tasks.status, "done"))
        .all()

      const match = allTasks.find(
        (t) =>
          t.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(t.title.toLowerCase())
      )

      if (!match) {
        return {
          success: false,
          message: `No active task found matching "${title}".`,
        }
      }

      await db
        .update(tasks)
        .set({ status: "done", updatedAt: new Date().toISOString() })
        .where(eq(tasks.id, match.id))

      return {
        success: true,
        message: `Task "${match.title}" marked as complete.`,
      }
    },
  }),

  listTasks: tool({
    description: "List Ramez's current tasks, optionally filtered by status",
    inputSchema: z.object({
      status: z
        .enum(["all", "active", "done"])
        .default("active")
        .describe("Filter tasks by status"),
    }),
    execute: async ({ status }) => {
      let result
      if (status === "active") {
        result = await db
          .select()
          .from(tasks)
          .where(ne(tasks.status, "done"))
          .all()
      } else if (status === "done") {
        result = await db
          .select()
          .from(tasks)
          .where(eq(tasks.status, "done"))
          .all()
      } else {
        result = await db.select().from(tasks).all()
      }

      return {
        tasks: result.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          description: t.description,
        })),
        count: result.length,
      }
    },
  }),

  deleteTask: tool({
    description: "Delete a task by title",
    inputSchema: z.object({
      title: z
        .string()
        .describe("The title (or partial title) of the task to delete"),
    }),
    execute: async ({ title }) => {
      const allTasks = await db.select().from(tasks).all()

      const match = allTasks.find(
        (t) =>
          t.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(t.title.toLowerCase())
      )

      if (!match) {
        return {
          success: false,
          message: `No task found matching "${title}".`,
        }
      }

      await db.delete(tasks).where(eq(tasks.id, match.id))

      return {
        success: true,
        message: `Task "${match.title}" deleted.`,
      }
    },
  }),

  getCalendarEvents: tool({
    description:
      "Get calendar events for a specific date or date range. Includes both local and Google Calendar events.",
    inputSchema: z.object({
      startDate: z
        .string()
        .describe("Start date in YYYY-MM-DD format"),
      endDate: z
        .string()
        .optional()
        .describe("End date in YYYY-MM-DD format. Defaults to startDate if not provided."),
    }),
    execute: async ({ startDate, endDate }) => {
      const end = endDate || startDate
      const startTime = `${startDate}T00:00:00`
      const endTime = `${end}T23:59:59`

      // Local events
      const localEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            lte(calendarEvents.startTime, endTime),
            gte(calendarEvents.endTime, startTime)
          )
        )
        .orderBy(calendarEvents.startTime)
        .all()

      const events = localEvents.map((e) => ({
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        allDay: e.allDay,
        description: e.description,
        source: "local",
      }))

      // Google events
      const connected = await isGoogleConnected()
      if (connected) {
        try {
          const googleEvents = await getGoogleCalendarEvents(
            new Date(startTime).toISOString(),
            new Date(endTime).toISOString()
          )
          events.push(
            ...googleEvents.map((e) => ({
              title: e.title,
              startTime: e.startTime,
              endTime: e.endTime,
              allDay: e.allDay,
              description: e.description,
              source: "google",
            }))
          )
        } catch {
          // Silently skip Google events
        }
      }

      events.sort((a, b) => a.startTime.localeCompare(b.startTime))

      return {
        events,
        count: events.length,
        dateRange: `${startDate} to ${end}`,
      }
    },
  }),

  createCalendarEvent: tool({
    description: "Create a new calendar event",
    inputSchema: z.object({
      title: z.string().describe("Event title"),
      startTime: z
        .string()
        .describe("Start time in YYYY-MM-DDTHH:mm format"),
      endTime: z
        .string()
        .describe("End time in YYYY-MM-DDTHH:mm format"),
      description: z.string().optional().describe("Event description"),
      allDay: z.boolean().default(false).describe("Whether this is an all-day event"),
    }),
    execute: async ({ title, startTime, endTime, description, allDay }) => {
      const now = new Date().toISOString()
      await db.insert(calendarEvents).values({
        id: nanoid(),
        title,
        description: description ?? null,
        startTime,
        endTime,
        allDay,
        color: "#0071e3",
        createdAt: now,
        updatedAt: now,
      })

      return {
        success: true,
        message: `Event "${title}" created for ${startTime}.`,
      }
    },
  }),
}
