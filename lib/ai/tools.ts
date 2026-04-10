import { tool } from "ai"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, calendarEvents, memories } from "@/lib/schema"
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
import {
  getUpcomingAssignments,
  getCourses,
  getGrades,
  isCanvasConnected,
} from "@/lib/integrations/canvas"

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

  // --- Canvas tools ---

  getAssignments: tool({
    description:
      "Get upcoming assignments from Canvas LMS. Shows what's due and when.",
    inputSchema: z.object({
      courseFilter: z
        .string()
        .optional()
        .describe("Optional course name to filter by"),
    }),
    execute: async ({ courseFilter }) => {
      const connected = await isCanvasConnected()
      if (!connected) {
        return { assignments: [], message: "Canvas is not connected." }
      }

      let assignments = await getUpcomingAssignments()

      if (courseFilter) {
        assignments = assignments.filter((a) =>
          a.course_name.toLowerCase().includes(courseFilter.toLowerCase())
        )
      }

      return {
        assignments: assignments.slice(0, 15).map((a) => ({
          name: a.name,
          course: a.course_name,
          dueAt: a.due_at,
          points: a.points_possible,
          url: a.html_url,
        })),
        count: assignments.length,
      }
    },
  }),

  getGradesSummary: tool({
    description: "Get current grades for all Canvas courses.",
    inputSchema: z.object({}),
    execute: async () => {
      const connected = await isCanvasConnected()
      if (!connected) {
        return { grades: [], message: "Canvas is not connected." }
      }

      const grades = await getGrades()
      return {
        grades: grades.map((g) => ({
          course: g.course,
          grade: g.grade || "N/A",
          score: g.score !== null ? `${g.score}%` : "N/A",
        })),
        count: grades.length,
      }
    },
  }),

  getCanvasCourses: tool({
    description: "List all active Canvas courses.",
    inputSchema: z.object({}),
    execute: async () => {
      const connected = await isCanvasConnected()
      if (!connected) {
        return { courses: [], message: "Canvas is not connected." }
      }

      const courses = await getCourses()
      return {
        courses: courses.map((c) => ({
          name: c.name,
          code: c.course_code,
        })),
        count: courses.length,
      }
    },
  }),

  // --- Memory tools ---

  saveMemory: tool({
    description: `Save something to your long-term memory about Ramez. Use this proactively when you learn something worth remembering for future conversations. Categories:
- "preference": How Ramez likes things done (communication style, work habits, preferences)
- "fact": Personal facts (name, role, interests, relationships, important dates)
- "style": How Ramez wants you to communicate (tone, format, length)
- "context": Ongoing projects, goals, situations
- "feedback": When Ramez corrects you or says what he likes/dislikes about your responses`,
    inputSchema: z.object({
      category: z
        .enum(["preference", "fact", "style", "context", "feedback"])
        .describe("Category of the memory"),
      content: z
        .string()
        .describe(
          "What to remember. Be specific and concise. Write it as a statement of fact, not a description of the conversation."
        ),
    }),
    execute: async ({ category, content }) => {
      const now = new Date().toISOString()

      // Check for duplicates — don't save the same thing twice
      const existing = await db.select().from(memories).all()
      const isDuplicate = existing.some(
        (m) =>
          m.content.toLowerCase().includes(content.toLowerCase()) ||
          content.toLowerCase().includes(m.content.toLowerCase())
      )

      if (isDuplicate) {
        return { success: true, message: "Already remembered something similar." }
      }

      await db.insert(memories).values({
        id: nanoid(),
        category,
        content,
        createdAt: now,
        updatedAt: now,
      })

      return { success: true, message: `Remembered: ${content}` }
    },
  }),

  updateMemory: tool({
    description:
      "Update an existing memory when you learn new or corrected information. Searches by content similarity.",
    inputSchema: z.object({
      search: z
        .string()
        .describe("Part of the existing memory content to find"),
      newContent: z
        .string()
        .describe("The updated memory content"),
    }),
    execute: async ({ search, newContent }) => {
      const existing = await db.select().from(memories).all()
      const match = existing.find((m) =>
        m.content.toLowerCase().includes(search.toLowerCase())
      )

      if (!match) {
        return { success: false, message: `No memory found matching "${search}".` }
      }

      await db
        .update(memories)
        .set({ content: newContent, updatedAt: new Date().toISOString() })
        .where(eq(memories.id, match.id))

      return { success: true, message: `Updated memory.` }
    },
  }),

  forgetMemory: tool({
    description: "Remove a memory when Ramez asks you to forget something.",
    inputSchema: z.object({
      search: z
        .string()
        .describe("Part of the memory content to find and remove"),
    }),
    execute: async ({ search }) => {
      const existing = await db.select().from(memories).all()
      const match = existing.find((m) =>
        m.content.toLowerCase().includes(search.toLowerCase())
      )

      if (!match) {
        return { success: false, message: `No memory found matching "${search}".` }
      }

      await db.delete(memories).where(eq(memories.id, match.id))
      return { success: true, message: `Forgot that.` }
    },
  }),

  recallMemories: tool({
    description:
      "Search your memories about Ramez. Use this when you need to recall something you've learned.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Search term to filter memories. Omit to get all memories."),
      category: z
        .enum(["preference", "fact", "style", "context", "feedback"])
        .optional()
        .describe("Filter by category"),
    }),
    execute: async ({ query, category }) => {
      let result = await db.select().from(memories).all()

      if (category) {
        result = result.filter((m) => m.category === category)
      }

      if (query) {
        result = result.filter((m) =>
          m.content.toLowerCase().includes(query.toLowerCase())
        )
      }

      return {
        memories: result.map((m) => ({
          category: m.category,
          content: m.content,
          savedAt: m.createdAt,
        })),
        count: result.length,
      }
    },
  }),
}
