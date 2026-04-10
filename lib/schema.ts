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
