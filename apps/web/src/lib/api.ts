const getApiUrl = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("lh_api_url") ?? process.env.NEXT_PUBLIC_API_URL ?? ""
    : process.env.NEXT_PUBLIC_API_URL ?? "";

const getApiKey = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("lh_api_key") ?? process.env.NEXT_PUBLIC_API_KEY ?? ""
    : process.env.NEXT_PUBLIC_API_KEY ?? "";

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  friends: {
    list: (params?: string) => fetchApi<{ success: boolean; data: unknown[]; total: number }>(`/api/friends${params ? `?${params}` : ""}`),
    count: () => fetchApi<{ success: boolean; data: { count: number } }>("/api/friends/count"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/friends/${id}`),
    addTag: (id: number, tagId: number) => fetchApi(`/api/friends/${id}/tags`, { method: "POST", body: JSON.stringify({ tagId }) }),
    removeTag: (id: number, tagId: number) => fetchApi(`/api/friends/${id}/tags/${tagId}`, { method: "DELETE" }),
    sendMessage: (id: number, type: string, content: string) => fetchApi(`/api/friends/${id}/messages`, { method: "POST", body: JSON.stringify({ type, content }) }),
    setMetadata: (id: number, metadata: Record<string, unknown>) => fetchApi(`/api/friends/${id}/metadata`, { method: "PUT", body: JSON.stringify(metadata) }),
  },
  tags: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/tags"),
    create: (name: string, color?: string) => fetchApi("/api/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
    delete: (id: number) => fetchApi(`/api/tags/${id}`, { method: "DELETE" }),
  },
  scenarios: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/scenarios"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/scenarios/${id}`),
    create: (data: unknown) => fetchApi("/api/scenarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/scenarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/scenarios/${id}`, { method: "DELETE" }),
    addStep: (id: number, data: unknown) => fetchApi(`/api/scenarios/${id}/steps`, { method: "POST", body: JSON.stringify(data) }),
    updateStep: (id: number, stepId: number, data: unknown) => fetchApi(`/api/scenarios/${id}/steps/${stepId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteStep: (id: number, stepId: number) => fetchApi(`/api/scenarios/${id}/steps/${stepId}`, { method: "DELETE" }),
    enroll: (id: number, friendId: number) => fetchApi(`/api/scenarios/${id}/enroll/${friendId}`, { method: "POST" }),
  },
  broadcasts: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/broadcasts"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/broadcasts/${id}`),
    create: (data: unknown) => fetchApi("/api/broadcasts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/broadcasts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/broadcasts/${id}`, { method: "DELETE" }),
    send: (id: number) => fetchApi(`/api/broadcasts/${id}/send`, { method: "POST" }),
    sendSegment: (id: number) => fetchApi(`/api/broadcasts/${id}/send-segment`, { method: "POST" }),
  },
  automations: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/automations"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/automations/${id}`),
    create: (data: unknown) => fetchApi("/api/automations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/automations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/automations/${id}`, { method: "DELETE" }),
    logs: (id: number) => fetchApi<{ success: boolean; data: unknown[] }>(`/api/automations/${id}/logs`),
  },
  templates: {
    list: (category?: string) => fetchApi<{ success: boolean; data: unknown[] }>(`/api/templates${category ? `?category=${category}` : ""}`),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/templates/${id}`),
    create: (data: unknown) => fetchApi("/api/templates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/templates/${id}`, { method: "DELETE" }),
  },
  reminders: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/reminders"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/reminders/${id}`),
    create: (data: unknown) => fetchApi("/api/reminders", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/reminders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/reminders/${id}`, { method: "DELETE" }),
    addStep: (id: number, data: unknown) => fetchApi(`/api/reminders/${id}/steps`, { method: "POST", body: JSON.stringify(data) }),
    updateStep: (id: number, stepId: number, data: unknown) => fetchApi(`/api/reminders/${id}/steps/${stepId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteStep: (id: number, stepId: number) => fetchApi(`/api/reminders/${id}/steps/${stepId}`, { method: "DELETE" }),
    enroll: (id: number, friendId: number, targetDate: string) => fetchApi(`/api/reminders/${id}/enroll/${friendId}`, { method: "POST", body: JSON.stringify({ targetDate }) }),
  },
  scoring: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/scoring-rules"),
    create: (data: unknown) => fetchApi("/api/scoring-rules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/scoring-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/scoring-rules/${id}`, { method: "DELETE" }),
  },
  notifications: {
    rules: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/notification-rules"),
    createRule: (data: unknown) => fetchApi("/api/notification-rules", { method: "POST", body: JSON.stringify(data) }),
    updateRule: (id: number, data: unknown) => fetchApi(`/api/notification-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteRule: (id: number) => fetchApi(`/api/notification-rules/${id}`, { method: "DELETE" }),
    list: (status?: string) => fetchApi<{ success: boolean; data: unknown[] }>(`/api/notifications${status ? `?status=${status}` : ""}`),
  },
  webhooks: {
    incoming: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/webhooks/incoming"),
    createIncoming: (data: unknown) => fetchApi("/api/webhooks/incoming", { method: "POST", body: JSON.stringify(data) }),
    deleteIncoming: (id: number) => fetchApi(`/api/webhooks/incoming/${id}`, { method: "DELETE" }),
    outgoing: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/webhooks/outgoing"),
    createOutgoing: (data: unknown) => fetchApi("/api/webhooks/outgoing", { method: "POST", body: JSON.stringify(data) }),
    updateOutgoing: (id: number, data: unknown) => fetchApi(`/api/webhooks/outgoing/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteOutgoing: (id: number) => fetchApi(`/api/webhooks/outgoing/${id}`, { method: "DELETE" }),
  },
  lineAccounts: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/line-accounts"),
    create: (data: unknown) => fetchApi("/api/line-accounts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/line-accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/line-accounts/${id}`, { method: "DELETE" }),
    analytics: (id: number, date: string) => fetchApi<{ success: boolean; data: unknown }>(`/api/line-accounts/${id}/analytics?date=${encodeURIComponent(date)}`),
  },
  analytics: {
    messages: (accountId: number, from: string, to: string) =>
      fetchApi<{ success: boolean; data: unknown }>(`/api/analytics/messages?accountId=${accountId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  },
  conversions: {
    points: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/conversions/points"),
    createPoint: (data: unknown) => fetchApi("/api/conversions/points", { method: "POST", body: JSON.stringify(data) }),
    deletePoint: (id: number) => fetchApi(`/api/conversions/points/${id}`, { method: "DELETE" }),
    report: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/conversions/report"),
  },
  affiliates: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/affiliates"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/affiliates/${id}/report`),
    create: (data: unknown) => fetchApi("/api/affiliates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/affiliates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/affiliates/${id}`, { method: "DELETE" }),
    report: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/affiliates-report"),
  },
  health: {
    logs: (id: number) => fetchApi<{ success: boolean; data: unknown[] }>(`/api/accounts/${id}/health`),
    migrations: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/accounts/migrations"),
    createMigration: (data: unknown) => fetchApi("/api/accounts/migrations", { method: "POST", body: JSON.stringify(data) }),
  },
  users: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/users"),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/users/${id}`),
    create: (data: unknown) => fetchApi("/api/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchApi(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/users/${id}`, { method: "DELETE" }),
    linkFriend: (id: number, friendId: number) => fetchApi(`/api/users/${id}/link`, { method: "POST", body: JSON.stringify({ friendId }) }),
    accounts: (id: number) => fetchApi<{ success: boolean; data: unknown[] }>(`/api/users/${id}/accounts`),
  },
  chats: {
    list: (status?: string) => fetchApi<{ success: boolean; data: unknown[] }>(`/api/chats${status ? `?status=${status}` : ""}`),
    get: (id: number) => fetchApi<{ success: boolean; data: unknown }>(`/api/chats/${id}`),
    send: (id: number, text: string) => fetchApi(`/api/chats/${id}/send`, { method: "POST", body: JSON.stringify({ text }) }),
    updateStatus: (id: number, status: string) => fetchApi(`/api/chats/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  },
  operators: {
    list: () => fetchApi<{ success: boolean; data: unknown[] }>("/api/operators"),
    create: (data: unknown) => fetchApi("/api/operators", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/operators/${id}`, { method: "DELETE" }),
  },
};
