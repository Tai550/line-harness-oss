export interface Friend {
  id: number;
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  status_message: string | null;
  is_following: boolean;
  ref_code: string | null;
  metadata: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface LineFriend extends Friend {
  tags?: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface FriendTag {
  friend_id: number;
  tag_id: number;
  assigned_at: string;
}

export interface Scenario {
  id: number;
  name: string;
  description: string | null;
  trigger_type: 'friend_add' | 'tag_added' | 'manual';
  trigger_tag_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioStep {
  id: number;
  scenario_id: number;
  step_order: number;
  delay_minutes: number;
  message_type: 'text' | 'image' | 'flex';
  message_content: string;
  condition_type: string | null;
  condition_value: string | null;
  next_step_on_false: number | null;
  created_at: string;
}

export interface FriendScenario {
  id: number;
  friend_id: number;
  scenario_id: number;
  current_step: number;
  status: 'active' | 'completed' | 'paused';
  next_delivery_at: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface Broadcast {
  id: number;
  title: string;
  message_type: 'text' | 'image' | 'flex';
  message_content: string;
  target_type: 'all' | 'tag' | 'segment';
  target_tag_id: number | null;
  target_conditions: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  total_count: number;
  success_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageLog {
  id: number;
  friend_id: number;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  scenario_step_id: number | null;
  broadcast_id: number | null;
  created_at: string;
}

export interface AutoReply {
  id: number;
  keyword: string;
  match_type: 'exact' | 'contains';
  reply_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversionPoint {
  id: number;
  name: string;
  description: string | null;
  point_value: number;
  created_at: string;
}

export interface ConversionEvent {
  id: number;
  friend_id: number;
  conversion_point_id: number;
  value: number;
  metadata: string | null;
  created_at: string;
}

export interface Affiliate {
  id: number;
  name: string;
  ref_code: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AffiliateClick {
  id: number;
  affiliate_id: number;
  friend_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CalendarBooking {
  id: number;
  connection_id: number;
  friend_id: number | null;
  google_event_id: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderStep {
  id: number;
  reminder_id: number;
  step_order: number;
  offset_minutes: number;
  message_type: 'text' | 'image' | 'flex';
  message_content: string;
  created_at: string;
}

export interface ScoringRule {
  id: number;
  name: string;
  event_type: string;
  condition: string | null;
  score_delta: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FriendScore {
  id: number;
  friend_id: number;
  rule_id: number | null;
  delta: number;
  reason: string | null;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  trigger_event: string;
  conditions: string;
  actions: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationRule {
  id: number;
  name: string;
  trigger_event: string;
  conditions: string | null;
  channels: string;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  role: 'admin' | 'operator';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserPublic {
  id: number;
  email: string;
  role: 'admin' | 'operator';
  is_active: boolean;
  created_at: string;
}

export interface LineInsightCountResponse {
  status: 'ready' | 'unready' | 'out_of_service';
  [key: string]: number | string | null | undefined;
}

export interface LineInsightDemographicItem {
  percentage: number;
  [key: string]: string | number;
}

export interface LineInsightDemographicResponse {
  available: boolean;
  genders: Array<LineInsightDemographicItem & { gender: string }>;
  ages: Array<LineInsightDemographicItem & { age: string }>;
  areas: Array<LineInsightDemographicItem & { area: string }>;
  appTypes: Array<LineInsightDemographicItem & { appType: string }>;
  subscriptionPeriods: Array<LineInsightDemographicItem & { subscriptionPeriod: string }>;
}

export interface LineAccountAnalytics {
  accountId: number;
  accountName: string;
  requestedDate: string;
  delivery: LineInsightCountResponse;
  followers: LineInsightCountResponse;
  demographic: LineInsightDemographicResponse;
}

export interface MessageLogDailySummary {
  date: string;
  inbound_total: number;
  outbound_total: number;
  inbound_by_type: Record<string, number>;
  outbound_by_type: Record<string, number>;
}

export interface MessageAnalyticsResponse {
  accountId: number;
  accountName: string;
  dateFrom: string;
  dateTo: string;
  insightDelivery: Record<string, LineInsightCountResponse>;
  insightFollowers: Record<string, LineInsightCountResponse>;
  localMessages: MessageLogDailySummary[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
