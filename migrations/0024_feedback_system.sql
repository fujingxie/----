-- Migration 0024: 教师反馈工单系统
-- 说明：三类反馈（bug/feature/question），支持多轮对话，超管回复，红点提醒

CREATE TABLE IF NOT EXISTS feedback_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'question',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  user_has_unread_reply INTEGER NOT NULL DEFAULT 0,
  admin_has_unread_reply INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_updated ON feedback_tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_updated ON feedback_tickets(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS feedback_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender_user_id INTEGER NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT,
  image_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES feedback_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_ticket ON feedback_messages(ticket_id, created_at);
