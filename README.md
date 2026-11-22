# makefun-csv-reader-speed-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/eleanor-alt/makefun-csv-reader-speed-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/eleanor-alt/makefun-csv-reader-speed-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, dependency-free drop-in for csv-reader 1.0.0: it reads broken CSV files (BOM, CRLF/LF, stray CRs, quoted fields with `""` escapes, quote junk, unterminated quotes, short and long rows) and returns exactly the same `{columns, rows, errors}` answer — only faster. One left-to-right pass with `charCodeAt` and `slice()`: an unquoted field is one slice, a quoted field is scanned the same way, and only the rare broken paths rebuild a field from slices.

## Run it

```sh
node main.ts  # reads /input/cases.json, writes /output/answers.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mfztwn6d&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
