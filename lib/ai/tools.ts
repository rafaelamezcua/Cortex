import { tool } from "ai"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, calendarEvents } from "@/lib/schema"
import { eq, ne, and, gte, lte } from "drizzle-orm"
import { nanoid } from "nanoid"
import {
  getGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendars,
} from "@/lib/integrations/google-calendar"
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
    description:
      "Create a new calendar event. Can create on Google Calendar or locally. Always defaults to Google Calendar primary if connected.",
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
      calendarName: z
        .string()
        .optional()
        .describe("Name of the Google Calendar to add to. Omit for primary calendar."),
    }),
    execute: async ({ title, startTime, endTime, description, allDay, calendarName }) => {
      const now = new Date().toISOString()
      let googleEventId: string | null = null
      let googleCalendarId: string | null = null

      const connected = await isGoogleConnected()
      if (connected) {
        try {
          // Find the right calendar
          let calId = "primary"
          if (calendarName) {
            const calendars = await getGoogleCalendars()
            const match = calendars.find(
              (c) => c.summary.toLowerCase().includes(calendarName.toLowerCase())
            )
            if (match) calId = match.id
          }

          const gEvent = await createGoogleCalendarEvent({
            title,
            description,
            startTime,
            endTime,
            allDay,
            calendarId: calId,
          })
          googleEventId = gEvent.id || null
          googleCalendarId = calId
        } catch {
          // Fall back to local
        }
      }

      // Also save locally
      await db.insert(calendarEvents).values({
        id: nanoid(),
        title,
        description: description ?? null,
        notes: null,
        startTime,
        endTime,
        allDay,
        color: "#7986cb",
        googleEventId,
        googleCalendarId,
        createdAt: now,
        updatedAt: now,
      })

      const target = googleEventId ? "Google Calendar" : "local calendar"
      return {
        success: true,
        message: `Event "${title}" created on ${target} for ${startTime}.`,
      }
    },
  }),

  editCalendarEvent: tool({
    description:
      "Edit an existing calendar event by searching for it by title. Updates both local and Google Calendar.",
    inputSchema: z.object({
      title: z
        .string()
        .describe("The title (or partial title) of the event to edit"),
      newTitle: z.string().optional().describe("New title"),
      newStartTime: z.string().optional().describe("New start time in YYYY-MM-DDTHH:mm format"),
      newEndTime: z.string().optional().describe("New end time in YYYY-MM-DDTHH:mm format"),
      newDescription: z.string().optional().describe("New description"),
    }),
    execute: async ({ title, newTitle, newStartTime, newEndTime, newDescription }) => {
      // Search local events
      const allEvents = await db.select().from(calendarEvents).all()
      const match = allEvents.find(
        (e) =>
          e.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(e.title.toLowerCase())
      )

      if (!match) {
        return { success: false, message: `No event found matching "${title}".` }
      }

      const updates = {
        title: newTitle?.trim() || match.title,
        description: newDescription ?? match.description,
        startTime: newStartTime || match.startTime,
        endTime: newEndTime || match.endTime,
        updatedAt: new Date().toISOString(),
      }

      await db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, match.id))

      // Sync to Google if linked
      if (match.googleEventId && match.googleCalendarId) {
        const connected = await isGoogleConnected()
        if (connected) {
          try {
            await updateGoogleCalendarEvent({
              googleEventId: match.googleEventId,
              title: updates.title,
              description: updates.description || undefined,
              startTime: updates.startTime,
              endTime: updates.endTime,
              calendarId: match.googleCalendarId,
            })
          } catch {
            // Local update already done
          }
        }
      }

      return { success: true, message: `Event "${match.title}" updated.` }
    },
  }),

  deleteCalendarEvent: tool({
    description: "Delete a calendar event by title. Removes from both local and Google Calendar.",
    inputSchema: z.object({
      title: z
        .string()
        .describe("The title (or partial title) of the event to delete"),
    }),
    execute: async ({ title }) => {
      const allEvents = await db.select().from(calendarEvents).all()
      const match = allEvents.find(
        (e) =>
          e.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(e.title.toLowerCase())
      )

      if (!match) {
        return { success: false, message: `No event found matching "${title}".` }
      }

      // Delete from Google if linked
      if (match.googleEventId && match.googleCalendarId) {
        const connected = await isGoogleConnected()
        if (connected) {
          try {
            await deleteGoogleCalendarEvent(match.googleEventId, match.googleCalendarId)
          } catch {
            // Continue with local delete
          }
        }
      }

      await db.delete(calendarEvents).where(eq(calendarEvents.id, match.id))

      return { success: true, message: `Event "${match.title}" deleted.` }
    },
  }),

  listCalendars: tool({
    description: "List all available Google Calendars the user can add events to.",
    inputSchema: z.object({}),
    execute: async () => {
      const connected = await isGoogleConnected()
      if (!connected) {
        return { calendars: [], message: "Google Calendar is not connected." }
      }

      const calendars = await getGoogleCalendars()
      return {
        calendars: calendars.map((c) => ({
          name: c.summary,
          primary: c.primary,
        })),
        count: calendars.length,
      }
    },
  }),
}
