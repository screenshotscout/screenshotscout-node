import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildCanonicalQuery } from "../src/serialization.js";
import type { WirePair } from "../src/serialization.js";

interface SigningVector {
  readonly name: string;
  readonly access_key: string;
  readonly secret_key: string;
  readonly params: readonly WirePair[];
  readonly signed_text: string;
  readonly signature: string;
}

// The API gateway and every SDK test against copies of the same file.
const { vectors } = JSON.parse(
  readFileSync(
    new URL("./fixtures/signing-vectors.json", import.meta.url),
    "utf8",
  ),
) as { vectors: SigningVector[] };

test("the signed text and signature match the shared signing vectors", async (t) => {
  for (const vector of vectors) {
    await t.test(vector.name, () => {
      const signedText = buildCanonicalQuery(vector.params, vector.access_key);

      assert.equal(signedText, vector.signed_text);
      assert.equal(
        createHmac("sha256", vector.secret_key)
          .update(signedText, "utf8")
          .digest("hex"),
        vector.signature,
      );
    });
  }
});
