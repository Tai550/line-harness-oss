-- Core tables
CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  picture_url TEXT,
  status_message TEXT,
  is_following INTEGER NOT NULL DEFAULT 1,
  ref_code TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_tags (
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (friend_id, tag_id)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_tag_id INTEGER REFERENCES tags(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_content TEXT NOT NULL,
  condition_type TEXT,
  condition_value TEXT,
  next_step_on_false INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  next_delivery_at TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_content TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_tag_id INTEGER REFERENCES tags(id),
  target_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  sent_at TEXT,
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auto_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'exact',
  reply_content TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER REFERENCES friends(id),
  direction TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  scenario_step_id INTEGER REFERENCES scenario_steps(id),
  broadcast_id INTEGER REFERENCES broadcasts(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_log_date_direction ON messages_log(created_at, direction);

-- Round 2 tables
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  name TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS line_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  channel_id TEXT UNIQUE NOT NULL,
  channel_secret TEXT NOT NULL,
  channel_access_token TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_line_links (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS conversion_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  point_value INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER REFERENCES friends(id),
  conversion_point_id INTEGER REFERENCES conversion_points(id),
  value INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ref_code TEXT UNIQUE NOT NULL,
  commission_rate REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
  friend_id INTEGER REFERENCES friends(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Round 3 tables
CREATE TABLE IF NOT EXISTS webhooks_incoming (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  secret TEXT,
  event_types TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhooks_outgoing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  event_types TEXT NOT NULL DEFAULT '[]',
  headers TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  available_hours TEXT NOT NULL DEFAULT '{"start":"09:00","end":"18:00"}',
  buffer_minutes INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL REFERENCES google_calendar_connections(id),
  friend_id INTEGER REFERENCES friends(id),
  google_event_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  offset_minutes INTEGER NOT NULL DEFAULT 0,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  target_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS friend_reminder_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_reminder_id INTEGER NOT NULL REFERENCES friend_reminders(id) ON DELETE CASCADE,
  reminder_step_id INTEGER NOT NULL REFERENCES reminder_steps(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  delivered_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS scoring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  condition TEXT,
  score_delta INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  rule_id INTEGER REFERENCES scoring_rules(id),
  delta INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  operator_id INTEGER REFERENCES operators(id),
  status TEXT NOT NULL DEFAULT 'unread',
  notes TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  conditions TEXT,
  channels TEXT NOT NULL DEFAULT '[]',
  message_template TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER REFERENCES notification_rules(id),
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_health_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER REFERENCES line_accounts(id),
  risk_level TEXT NOT NULL DEFAULT 'normal',
  message_count INTEGER,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_account_id INTEGER REFERENCES line_accounts(id),
  to_account_id INTEGER REFERENCES line_accounts(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_friends INTEGER,
  migrated_friends INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  conditions TEXT NOT NULL DEFAULT '[]',
  actions TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES friends(id),
  trigger_event TEXT NOT NULL,
  actions_executed TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'success',
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ref_code TEXT UNIQUE NOT NULL,
  scenario_id INTEGER REFERENCES scenarios(id),
  tag_ids TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracked_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  scenario_id INTEGER REFERENCES scenarios(id),
  click_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS link_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL REFERENCES tracked_links(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES friends(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  fields TEXT NOT NULL DEFAULT '[]',
  tag_ids TEXT NOT NULL DEFAULT '[]',
  scenario_id INTEGER REFERENCES scenarios(id),
  submit_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES friends(id),
  data TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT NOT NULL
);

-- Account-friend association
ALTER TABLE friends ADD COLUMN account_id INTEGER REFERENCES line_accounts(id);
CREATE INDEX IF NOT EXISTS idx_friends_account_id ON friends(account_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_friends_line_user_id ON friends(line_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_scenarios_next_delivery ON friend_scenarios(next_delivery_at, status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_messages_log_friend ON messages_log(friend_id, created_at);
