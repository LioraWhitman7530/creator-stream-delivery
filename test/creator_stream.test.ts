import assert from "node:assert/strict";
import { CreatorRequest, decideDelivery } from "../src/creator_stream";

assert.equal(decideDelivery("A considered update"), "deliver");
assert.equal(decideDelivery("short"), "hold");
assert.throws(() => CreatorRequest.parse({ subscriberId: "", prompt: "x", assetId: "a" }));
console.log("creator stream decisions: ok");
