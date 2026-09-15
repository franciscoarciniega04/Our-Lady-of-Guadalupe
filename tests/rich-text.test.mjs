import { test } from "node:test";
import assert from "node:assert/strict";
import { richText } from "../lib/rich-text.mjs";
test("rich text preserves formatting and removes executable markup", () => {
  const out = richText(
    "**Comunidad**\n\n<script>alert(1)</script>\n\n[mal](javascript:alert(1))\n\n<img src=x onerror=alert(1)>",
  );
  assert.match(out, /<strong>Comunidad<\/strong>/);
  assert.doesNotMatch(out, /<script|javascript:|onerror|<img/);
});
