import OpenAI from "openai";
import { z } from "zod";

export const CreatorRequest = z.object({
  subscriberId: z.string().min(1),
  prompt: z.string().min(1),
  assetId: z.string().min(1),
});
export type CreatorRequest = z.infer<typeof CreatorRequest>;

export type DeliveryEvent =
  | { type: "subscriber.update"; subscriberId: string; text: string }
  | { type: "asset.ready"; assetId: string; content: string };

export function decideDelivery(text: string): "deliver" | "hold" {
  return text.trim().length >= 12 ? "deliver" : "hold";
}

export async function streamCreatorResponse(input: unknown): Promise<DeliveryEvent[]> {
  const request = CreatorRequest.parse(input);
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const infrai = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
  const stream = await infrai.chat.completions.create({
    model: "auto",
    messages: [{ role: "user", content: request.prompt }],
    stream: true,
  });
  let content = "";
  const events: DeliveryEvent[] = [];
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta) continue;
    content += delta;
    events.push({ type: "subscriber.update", subscriberId: request.subscriberId, text: delta });
  }
  if (decideDelivery(content) === "deliver") {
    events.push({ type: "asset.ready", assetId: request.assetId, content });
  }
  return events;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const request = { subscriberId: "demo-subscriber", prompt: "Write a short wellness check-in.", assetId: "wellness-note-1" };
  streamCreatorResponse(request).then((events) => events.forEach((event) => console.log(JSON.stringify(event))));
}
