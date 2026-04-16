import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "done"] })
    .notNull()
    .default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  dueDate: text("due_date"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  eventId: text("event_id"),
  eventDate: text("event_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  notes: text("notes"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  color: text("color"),
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  localCalendarId: text("local_calendar_id"),
  recurrence: text("recurrence"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  conversationId: text("conversation_id").notNull(),
  createdAt: text("created_at").notNull(),
})

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull(),
  status: text("status", { enum: ["active", "paused", "completed"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const projectTasks = sqliteTable("project_tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "done"] })
    .notNull()
    .default("todo"),
  dueDate: text("due_date"),
  calendarId: text("calendar_id"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const pomodoroSessions = sqliteTable("pomodoro_sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id"),
  projectId: text("project_id"),
  duration: integer("duration").notNull(),
  completedAt: text("completed_at").notNull(),
})

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color").notNull(),
  frequency: text("frequency", {
    enum: ["daily", "weekdays", "weekly"],
  })
    .notNull()
    .default("daily"),
  targetPerDay: integer("target_per_day").notNull().default(1),
  createdAt: text("created_at").notNull(),
})

export const habitLogs = sqliteTable("habit_logs", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").notNull(),
  date: text("date").notNull(),
  count: integer("count").notNull().default(1),
  createdAt: text("created_at").notNull(),
})

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  content: text("content"),
  mood: integer("mood"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const localCalendars = sqliteTable("local_calendars", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: text("created_at").notNull(),
})

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  category: text("category", {
    enum: ["preference", "fact", "style", "context", "feedback"],
  }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const oauthTokens = sqliteTable("oauth_tokens", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: text("expires_at").notNull(),
  scope: text("scope").notNull(),
  updatedAt: text("updated_at").notNull(),
})
