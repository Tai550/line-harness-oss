export interface UserSource {
  type: 'user';
  userId: string;
}

export interface GroupSource {
  type: 'group';
  groupId: string;
  userId?: string;
}

export interface RoomSource {
  type: 'room';
  roomId: string;
  userId?: string;
}

export type Source = UserSource | GroupSource | RoomSource;

export interface BaseEvent {
  type: string;
  timestamp: number;
  source: Source;
  webhookEventId?: string;
  deliveryContext?: { isRedelivery: boolean };
  mode?: 'active' | 'standby';
}

export interface TextMessage {
  type: 'text';
  id: string;
  text: string;
  quoteToken?: string;
}

export interface ImageMessage {
  type: 'image';
  id: string;
  contentProvider: { type: 'line' | 'external'; originalContentUrl?: string; previewImageUrl?: string };
}

export interface VideoMessage {
  type: 'video';
  id: string;
  duration: number;
  contentProvider: { type: 'line' | 'external'; originalContentUrl?: string; previewImageUrl?: string };
}

export interface AudioMessage {
  type: 'audio';
  id: string;
  duration: number;
  contentProvider: { type: 'line' | 'external'; originalContentUrl?: string };
}

export interface FileMessage {
  type: 'file';
  id: string;
  fileName: string;
  fileSize: number;
}

export interface LocationMessage {
  type: 'location';
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface StickerMessage {
  type: 'sticker';
  id: string;
  packageId: string;
  stickerId: string;
  stickerResourceType: string;
}

export type Message = TextMessage | ImageMessage | VideoMessage | AudioMessage | FileMessage | LocationMessage | StickerMessage;

export interface MessageEvent extends BaseEvent {
  type: 'message';
  replyToken: string;
  message: Message;
}

export interface FollowEvent extends BaseEvent {
  type: 'follow';
  replyToken: string;
}

export interface UnfollowEvent extends BaseEvent {
  type: 'unfollow';
}

export interface PostbackEvent extends BaseEvent {
  type: 'postback';
  replyToken: string;
  postback: {
    data: string;
    params?: Record<string, string>;
  };
}

export type LineEvent = MessageEvent | FollowEvent | UnfollowEvent | PostbackEvent;

export interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

export interface OutboundTextMessage {
  type: 'text';
  text: string;
  quoteToken?: string;
}

export interface OutboundImageMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface OutboundVideoMessage {
  type: 'video';
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface OutboundFlexMessage {
  type: 'flex';
  altText: string;
  contents: Record<string, unknown>;
}

export type OutboundMessage = OutboundTextMessage | OutboundImageMessage | OutboundVideoMessage | OutboundFlexMessage;

export interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: PostbackAction | MessageAction | URIAction | DatetimePickerAction | CameraAction;
}

export interface PostbackAction {
  type: 'postback';
  label: string;
  data: string;
  displayText?: string;
}

export interface MessageAction {
  type: 'message';
  label: string;
  text: string;
}

export interface URIAction {
  type: 'uri';
  label: string;
  uri: string;
}

export interface DatetimePickerAction {
  type: 'datetimepicker';
  label: string;
  data: string;
  mode: 'date' | 'time' | 'datetime';
}

export interface CameraAction {
  type: 'camera';
  label: string;
}

export interface RichMenuConfig {
  size: { width: number; height: number };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

export interface PushMessageRequest {
  to: string;
  messages: OutboundMessage[];
}

export interface MulticastRequest {
  to: string[];
  messages: OutboundMessage[];
}

export interface BroadcastRequest {
  messages: OutboundMessage[];
}

export interface ReplyMessageRequest {
  replyToken: string;
  messages: OutboundMessage[];
}

export interface InsightCountResponse {
  status: 'ready' | 'unready' | 'out_of_service';
  [key: string]: number | string | null | undefined;
}

export interface InsightDemographicItem {
  percentage: number;
  [key: string]: string | number;
}

export interface InsightDemographicResponse {
  available: boolean;
  genders: Array<InsightDemographicItem & { gender: string }>;
  ages: Array<InsightDemographicItem & { age: string }>;
  areas: Array<InsightDemographicItem & { area: string }>;
  appTypes: Array<InsightDemographicItem & { appType: string }>;
  subscriptionPeriods: Array<InsightDemographicItem & { subscriptionPeriod: string }>;
}
