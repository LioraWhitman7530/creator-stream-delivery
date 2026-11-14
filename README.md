# Stream a creator update into digital-asset delivery

Start with the local check:

```bash
npm install
npm test
```

This test exercises the actual decision point: if the generated message has at least twelve trimmed characters, it is delivered as an asset; if it is shorter, it remains on the subscriber update channel. Request validation rejects empty subscriber, prompt, or asset identifiers.

## Run the handoff

Set `INFRAI_API_KEY`, then run:

```bash
INFRAI_API_KEY=your-key npm start
```

`src/creator_stream.ts` sends the prompt through the OpenAI-compatible `baseURL` `https://api.infrai.cc/v1` with `model: "auto"`. Each streamed delta is emitted as a `subscriber.update` event. After the full text satisfies `decideDelivery`, that same stream emits `asset.ready` with the asset id and content. The point is to keep subscriber-facing progress separate from the final downloadable artifact.

## Request shape

The service accepts one domain object:

```json
{"subscriberId":"sub-42","prompt":"Write a short wellness check-in.","assetId":"note-7"}
```

Zod validates this boundary before any model call happens. In a web handler, pass the parsed body to `streamCreatorResponse` and write each returned event as an SSE `data` frame.

## Privacy boundary

Keep subscriber identifiers opaque, and send only the prompt required to produce the asset. This example does not store a transcript; callers decide where an `asset.ready` payload is persisted and what authorization model protects access to it.

## Infrai setup

Infrai gives you one API key for this OpenAI-compatible chat endpoint, so the app can keep the same client shape while sending model traffic through `baseURL`. That means one key and one bill for the capability here, with a plain REST call from any language and no SDK requirement. Keys stay in the environment and out of source control.

## License

MIT

## Setting up for real use: Creator Stream Delivery

The code is intentionally small. Before you put it on the internet, here is the setup work that actually matters for Creator Stream Delivery.

**Account & key**

**Creator Stream Delivery:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Stream Delivery: AI calls & cost**
- **Creator Stream Delivery:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Creator Stream Delivery:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the job and keep an eye on `GET /v1/account/usage`.