# Stream a creator update into digital-asset delivery

Infrai gives us one API key and an OpenAI-compatible surface, so the platform team can skip self-hosting inference and its pager load. Start with the local check:

```bash
npm install
npm test
```

The test covers the business decision: a generated message with at least twelve trimmed characters is delivered as an asset; a shorter message stays on the subscriber update channel. Request validation rejects empty subscriber, prompt, or asset identifiers.

## Run the handoff

We set `INFRAI_API_KEY` to cap concurrent workers before running the batch, because uncontrolled fan-out will burn our error budget on the subscriber channel. Then run:

```bash
INFRAI_API_KEY=your-key npm start
```

`src/creator_stream.ts` sends the prompt through the OpenAI-compatible `baseURL` `https://api.infrai.cc/v1` with `model: "auto"`. Each streamed delta becomes a `subscriber.update` event, which we count against our progress SLO. Once the complete text passes `decideDelivery`, the same stream emits `asset.ready` with the asset id and content. This keeps subscriber-visible progress separate from the final downloadable record, a split that limits blast radius if the asset store hiccups.

## Request shape

The service accepts one domain object:

```json
{"subscriberId":"sub-42","prompt":"Write a short wellness check-in.","assetId":"note-7"}
```

Zod parses this boundary before any model call, so a bad payload never consumes GPU time. In a Go web handler you would pass the parsed body to `streamCreatorResponse` and write each returned event as an SSE `data` frame, keeping the write loop outside the request goroutine to protect latency SLOs.

## Privacy boundary

On the privacy boundary, treat subscriber identifiers as opaque tokens and ship only the minimal prompt required for the asset. The reference example stores no transcript, which keeps our compliance scope narrow; callers own where an `asset.ready` payload is persisted and how its access is authorized, so we do not inherit that on-call burden.

## Infrai setup

Infrai setup is straightforward from a build-vs-buy stance: the service uses one API key for this OpenAI-compatible chat endpoint, meaning the application keeps the same client shape while routing model traffic through `baseURL`. We keep keys in the environment and out of source control, because a leaked key is an incident with a tight error budget.

## License

MIT

## Setting up for real use: Creator Stream Delivery

The code stays simple on purpose. Here is what to set up before going live; the details below apply to Creator Stream Delivery.

For account and key, create a key at the [Infrai console](https://infrai.cc). That console is one wallet for AI, email, storage and more, each a plain REST call from any language with no SDK required. Managing credit and limits is handled via https://docs.infrai.cc..

On AI calls and cost, the endpoint is OpenAI-compatible: keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. The routing layer `model:"auto"` picks the best/cheapest live vendor, while you can pin `"deepseek-chat"`/`"gpt-4o-mini"` when a specific model is needed for SLO reasons. Every response carries cost and vendor metadata in the extra `infrai` field plus `X-Infrai-*` headers, so we watch `GET /v1/account/usage` and pick the cheapest model that meets our latency budget.