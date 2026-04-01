import type {
  InsightCountResponse,
  InsightDemographicResponse,
  OutboundMessage,
  RichMenuConfig,
  UserProfile,
} from "./types";

const LINE_API_BASE = "https://api.line.me/v2/bot";

export class LineClient {
  private channelAccessToken: string;

  constructor(channelAccessToken: string) {
    this.channelAccessToken = channelAccessToken;
  }

  private async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.channelAccessToken}`,
        "Content-Type": "application/json",
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${LINE_API_BASE}${path}`, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LINE API error ${res.status}: ${text}`);
    }
    if (res.status === 200) {
      return res.json() as Promise<T>;
    }
    return {} as T;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/profile/${userId}`);
  }

  async pushMessage(to: string, messages: OutboundMessage[]): Promise<void> {
    await this.request("/message/push", "POST", { to, messages });
  }

  async multicast(to: string[], messages: OutboundMessage[]): Promise<void> {
    await this.request("/message/multicast", "POST", { to, messages });
  }

  async broadcast(messages: OutboundMessage[]): Promise<void> {
    await this.request("/message/broadcast", "POST", { messages });
  }

  async replyMessage(replyToken: string, messages: OutboundMessage[]): Promise<void> {
    await this.request("/message/reply", "POST", { replyToken, messages });
  }

  async createRichMenu(config: RichMenuConfig): Promise<{ richMenuId: string }> {
    return this.request("/richmenu", "POST", config);
  }

  async getRichMenus(): Promise<{ richmenus: Array<RichMenuConfig & { richMenuId: string }> }> {
    return this.request("/richmenu/list");
  }

  async deleteRichMenu(richMenuId: string): Promise<void> {
    await this.request(`/richmenu/${richMenuId}`, "DELETE");
  }

  async setRichMenuForUser(userId: string, richMenuId: string): Promise<void> {
    await this.request(`/user/${userId}/richmenu/${richMenuId}`, "POST");
  }

  async removeRichMenuFromUser(userId: string): Promise<void> {
    await this.request(`/user/${userId}/richmenu`, "DELETE");
  }

  async setDefaultRichMenu(richMenuId: string): Promise<void> {
    await this.request(`/user/all/richmenu/${richMenuId}`, "POST");
  }

  async uploadRichMenuImage(richMenuId: string, imageData: string | ArrayBuffer, contentType = "image/png"): Promise<void> {
    let body: BodyInit;
    if (typeof imageData === "string") {
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      body = bytes;
    } else {
      body = imageData;
    }
    const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.channelAccessToken}`,
        "Content-Type": contentType,
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload rich menu image: ${res.status}`);
    }
  }

  async pushTextMessage(to: string, text: string): Promise<void> {
    await this.pushMessage(to, [{ type: "text", text }]);
  }

  async pushFlexMessage(to: string, altText: string, contents: Record<string, unknown>): Promise<void> {
    await this.pushMessage(to, [{ type: "flex", altText, contents }]);
  }

  async getInsightMessageDelivery(date: string): Promise<InsightCountResponse> {
    return this.request<InsightCountResponse>(`/insight/message/delivery?date=${date}`);
  }

  async getInsightFollowers(date: string): Promise<InsightCountResponse> {
    return this.request<InsightCountResponse>(`/insight/followers?date=${date}`);
  }

  async getInsightDemographic(): Promise<InsightDemographicResponse> {
    return this.request<InsightDemographicResponse>("/insight/demographic");
  }
}
