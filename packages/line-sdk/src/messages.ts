import type { OutboundMessage } from "./types";

export const textMessage = (text: string): OutboundMessage => ({ type: "text", text });

export const imageMessage = (originalContentUrl: string, previewImageUrl: string): OutboundMessage => ({
  type: "image",
  originalContentUrl,
  previewImageUrl,
});

export const videoMessage = (originalContentUrl: string, previewImageUrl: string): OutboundMessage => ({
  type: "video",
  originalContentUrl,
  previewImageUrl,
});

export const flexMessage = (altText: string, contents: Record<string, unknown>): OutboundMessage => ({
  type: "flex",
  altText,
  contents,
});

export const buttonsTemplate = (
  altText: string,
  text: string,
  actions: Array<{ type: string; label: string; [key: string]: unknown }>
) =>
  flexMessage(altText, {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text, wrap: true },
        ...actions.map((a) => ({ type: "button", action: a })),
      ],
    },
  });

export const confirmTemplate = (
  altText: string,
  text: string,
  yesLabel: string,
  yesData: string,
  noLabel: string,
  noData: string
) =>
  flexMessage(altText, {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "button", action: { type: "postback", label: yesLabel, data: yesData } },
            { type: "button", action: { type: "postback", label: noLabel, data: noData } },
          ],
        },
      ],
    },
  });

export const carouselTemplate = (altText: string, bubbles: Record<string, unknown>[]) =>
  flexMessage(altText, { type: "carousel", contents: bubbles });

export const flexBubble = (body: Record<string, unknown>, footer?: Record<string, unknown>) => ({
  type: "bubble",
  body,
  ...(footer ? { footer } : {}),
});

export const flexBox = (layout: "vertical" | "horizontal" | "baseline", contents: unknown[]) => ({
  type: "box",
  layout,
  contents,
});

export const flexText = (text: string, options?: Record<string, unknown>) => ({
  type: "text",
  text,
  ...options,
});

export const flexImage = (url: string, options?: Record<string, unknown>) => ({
  type: "image",
  url,
  ...options,
});

export const flexButton = (action: Record<string, unknown>, options?: Record<string, unknown>) => ({
  type: "button",
  action,
  ...options,
});

export const quickReply = (items: Array<{ type: string; action: Record<string, unknown> }>) => ({
  items,
});

export const withQuickReply = (message: OutboundMessage, items: Array<{ type: string; action: Record<string, unknown> }>) => ({
  ...message,
  quickReply: { items },
});

export const productCard = (
  imageUrl: string,
  title: string,
  price: string,
  buyData: string
) =>
  flexBubble(
    flexBox("vertical", [
      flexImage(imageUrl, { size: "full", aspectMode: "cover" }),
      flexBox("vertical", [
        flexText(title, { weight: "bold", size: "xl" }),
        flexText(price, { color: "#aaaaaa" }),
      ]),
    ]),
    flexBox("vertical", [
      flexButton({ type: "postback", label: "購入する", data: buyData }, { style: "primary", color: "#06C755" }),
    ])
  );

export const receiptMessage = (altText: string, title: string, items: Array<{ name: string; price: string }>, total: string) =>
  flexMessage(altText, {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: title, weight: "bold", size: "xl" },
        ...items.map((item) => ({
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: item.name },
            { type: "text", text: item.price, align: "end" },
          ],
        })),
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "合計", weight: "bold" },
            { type: "text", text: total, weight: "bold", align: "end" },
          ],
        },
      ],
    },
  });
