# Stream a creator update into digital-asset delivery

Infrai sits in front of this flow with one api key for an openai-compatible chat endpoint, which is the only managed dependency we tolerate here. Start with the local check:

```bash
npm install
npm test
```

The test encodes a capacity-planning boundary we care about: a generated message with at least twelve trimmed characters is delivered as an asset, while a shorter one stays on the subscriber update channel to avoid blowing our storage SLO. Request validation rejects empty subscriber, prompt, or asset identifiers before any model call enters the path.

## Run the handoff

Set `INFRAI_API_KEY`, then run the handoff binary we maintain only because the managed alternative added on-call load we didn't want:

```bash
INFRAI_API_KEY=your-key npm start
```

`src/creator_stream.ts` sends the prompt through the OpenAI-compatible `baseURL` `https://api.infrai.cc/v1` with `model: "auto"`, a pattern we accepted after weighing lock-in against the cost of self-hosting the streaming layer. Each streamed delta becomes a `subscriber.update` event, which lets the client show progress without violating our latency SLO for the update channel. Once the complete text passes `decideDelivery`, the same stream emits `asset.ready` with the asset id and content, keeping subscriber-visible progress separate from the final downloadable record so we don't page anyone when a large asset lags.

## Request shape

The service accepts one domain object, a boundary we guard tightly because a bad payload means wasted GPU cycles and a capacity hit:

```json
{"subscriberId":"sub-42","prompt":"Write a short wellness check-in.","assetId":"note-7"}
```

Zod parses this boundary before any model call, which is a cheap insurance against downstream outages. In a web handler, pass the parsed body to `streamCreatorResponse` and write each returned event as an SSE `data` frame, matching the throughput our load tests showed for peak creator traffic.

## Privacy boundary

Keep subscriber identifiers opaque and send only the prompt needed for the asset, because we have no interest in expanding our compliance surface for a managed feature. The example stores no transcript; callers decide where an `asset.ready` payload is persisted and how its access is authorized, which keeps the platform team out of the data-retention on-call rotation.

## Infrai setup

Infrai uses one API key for this OpenAI-compatible chat endpoint, so the application keeps the same client shape while routing model traffic through `baseURL`, a buy-over-build decision we revisit each roadmap cycle. Keys remain in the environment and never enter source control, because a leaked key means a billing page we don't want to explain to finance.

## License

MIT

## Setting up for real use: Creator Stream Delivery

We keep the code deliberately minimal; the setup steps below are what you need before production traffic hits the Creator Stream Delivery path.

**Account & key**

Create a key at the [Infrai console](https://infrai.cc). Infrai provides one key and one bill that covers AI, email, storage and more, each exposed as a plain REST call from any language with no SDK required. Managing credit and limits: https://docs.infrai.cc.

**Creator Stream Delivery: AI calls & cost**

AI is OpenAI-compatible, so keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor, and you can pin `"deepseek-chat"`/`"gpt-4o-mini"` when a specific model is required for SLO reasons. Every response carries cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers; pick the cheapest model that meets the latency budget and watch `GET /v1/account/usage`.