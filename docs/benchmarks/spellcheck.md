# Spellcheck latency measurements

Measured on 2026-11-04 on this development machine (Intel Core i5-9500T), in
Playwright Chromium. Decision: keep synchronous incremental checking, restricted
to whole words overlapping an edit. Keep full checking for dictionary/preference
refreshes. Do not restore the trailing 180 ms debounce.

## Reproduce

```sh
node scripts/benchmark-spellcheck.mjs 75c82009be79c7fe08455f4c51c6cf4745da68a4
```

Run with the machine otherwise idle. `BENCH_RATES=1` selects native CPU;
`BENCH_CASES='[[1,300]]'` limits document shapes. JSON results are written to
`/tmp/icarus-spellcheck-benchmark.json`; `BENCH_OUTPUT` overrides the filename.
The script starts and closes a private Vite server and Chromium, and removes its
fixture files on normal completion or failure.

## Method and limits

Compare spellcheck disabled, the baseline at the revision above, and the working
copy. Use 1, 100, and 1,000 paragraphs of 300 characters, plus single paragraphs
of 10,000 and 100,000 characters, at native CPU and Chromium's synthetic 4x CPU
slowdown. Each case alternates typo/correction edits, discards 10 warm-up samples,
and records 80 synchronous edit samples, plus 30 novel-word samples, a 9,750
character paste, a full refresh, and DOM underline latency. Markdown serialization
runs on editor updates, as in RichEditor; layout is forced after timed edits.

These are programmatic transactions in a real browser, not end-to-end keyboard,
IME, paint, remote-desktop, or Tauri WebKit timings. The Svelte app and persistence
are excluded. The dictionary is shared and verdicts are cached across cases;
novel-word samples supplement repeated corrections. Fixed condition order, JIT,
GC and layout produce noise; sub-millisecond differences are not meaningful.
Single refresh, paste, and underline observations are illustrative rather than
percentiles. CPU throttling is not a substitute for testing another device.

## Findings

The initial whole-textblock implementation cost about 19 ms median per edit in
the 100,000-character paragraph (baseline about 8 ms). Restricting checking to
the edited words removed most of that overhead, while preserving immediate
underlines. Word boundaries expand on both sides, including when spaces are
inserted/deleted; inline formatting, hard breaks and code retain their semantics.

Large documents still incur editor rendering/Markdown costs even with spellcheck
disabled. This change does not make arbitrarily large entries latency-free.
Initial dictionary loading and full refreshes remain synchronous work once the
lazy assets arrive; paste checks the inserted text immediately and can still be
expensive for large inputs. Those are separate from the removed debounce.

See the accompanying JSON for individual timings and the measured summary below.

## Measured summary

Native CPU, synchronous edit median / p95 (milliseconds):

| Document | Disabled | Previous | Final |
| --- | ---: | ---: | ---: |
| 1 × 300 characters | 1.0 / 1.3 | 0.4 / 1.0 | 0.4 / 0.6 |
| 100 × 300 characters | 0.6 / 0.8 | 1.8 / 2.0 | 2.1 / 2.3 |
| 1000 × 300 characters | 29.6 / 36.1 | 32.4 / 39.9 | 30.4 / 38.4 |
| 1 × 10,000 characters | 3.2 / 4.0 | 3.7 / 4.3 | 3.5 / 5.0 |
| 1 × 100,000 characters | 8.3 / 8.9 | 9.1 / 9.7 | 9.9 / 11.4 |

Initial dictionary loading (assets plus initialization): 204 ms in this local run, not a network benchmark.

At 4x CPU slowdown, the 100,000-character paragraph took 34.9 ms median
with the old checker and 39.8 ms with the final one (disabled: 34.7 ms).
The remaining overhead is real; preserving immediate feedback is the chosen
tradeoff. Native 1,000-paragraph results vary between runs; the disabled editor
already exceeds a 16.7 ms frame budget. No blanket latency claim is warranted.

The original removal probe replaced the entire word and did not reliably detect
remaining partial decorations. Those values are omitted from the primary JSON.
The supplemental removal suite corrects only the word suffix and checks for any
underline overlapping that word, rather than matching its old text.

Supplemental partial-correction DOM removal latency (single observation, ms):

| CPU | Document | Previous | Final |
| --- | --- | ---: | ---: |
| 1x | 1 × 300 characters | 187.6 | 0.3 |
| 1x | 100 × 300 characters | 193.8 | 2.1 |
| 4x | 1 × 300 characters | 188.6 | 1.9 |
| 4x | 100 × 300 characters | 194.9 | 2.0 |

Validation: unit tests compare incremental decorations against full refreshes
through 100 deterministic mixed edits, alongside explicit word split/join,
formatting, code, paragraph, dictionary and position tests.
