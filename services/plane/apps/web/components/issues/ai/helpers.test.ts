import assert from "node:assert/strict";
import test from "node:test";
import { plainTextHTML } from "./helpers";

test("AI descriptions escape executable markup and preserve newlines and user names", () => {
  const output = plainTextHTML('Đội XBus\n<script>alert("x")</script> & reviewer\'s notes');
  assert.equal(
    output,
    "<p>Đội XBus<br>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; reviewer&#39;s notes</p>"
  );
  assert.ok(!output.includes("<script>"));
});
