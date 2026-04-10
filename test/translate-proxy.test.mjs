import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTranslateRequest, proxyTranslateRequest } from "../src/translate-proxy.mjs";

test("normalizeTranslateRequest should normalize fields", () => {
  const result = normalizeTranslateRequest({
    text: "  你好  ",
    source_lang: "ZH",
    target_lang: "EN",
    alt_count: 9
  });

  assert.deepEqual(result, {
    text: "你好",
    source_lang: "zh",
    target_lang: "en",
    alt_count: 3
  });
});

test("proxyTranslateRequest should validate required fields", async () => {
  const result = await proxyTranslateRequest({
    text: "",
    target_lang: ""
  });

  assert.equal(result.status, 400);
  assert.equal(result.payload.code, 400);
});

test("proxyTranslateRequest should forward request to upstream", async () => {
  let capturedBody = null;
  const result = await proxyTranslateRequest(
    {
      text: "你好",
      source_lang: "zh",
      target_lang: "en",
      alt_count: 2
    },
    {
      fetchImpl: async (_url, init) => {
        capturedBody = JSON.parse(init.body);
        return {
          status: 200,
          json: async () => ({
            code: 200,
            data: "Hello",
            source_lang: "zh",
            target_lang: "en"
          })
        };
      }
    }
  );

  assert.equal(result.status, 200);
  assert.equal(result.payload.data, "Hello");
  assert.equal(capturedBody.text, "你好");
  assert.equal(capturedBody.target_lang, "en");
  assert.equal(capturedBody.alt_count, 2);
});

