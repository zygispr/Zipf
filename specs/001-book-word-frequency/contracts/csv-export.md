# Contract: CSV Export (FR-022)

The file users download with "Download results". It is the only artifact the app produces for
use outside the app, so its format is a public contract.

## File

- **Filename**: `<book-name-without-extension>-word-frequencies.csv`, with characters not
  allowed in filenames (`\ / : * ? " < > |`) replaced by `-`.
- **Encoding**: UTF-8 with a leading BOM (`EF BB BF`).
- **Line endings**: CRLF (RFC 4180).
- **Content**: the full ranked list for the current common-word setting, not just the top N
  and not limited by the search.

## Columns

| # | Header    | Value                                                       |
|---|-----------|-------------------------------------------------------------|
| 1 | `rank`    | Integer ≥ 1, in the same order as on screen                 |
| 2 | `word`    | The normalized word; RFC 4180 quoting when it has `"`, `,`, CR, or LF |
| 3 | `count`   | Integer ≥ 1                                                 |
| 4 | `percent` | Percentage of total words in the current view, `.` decimal separator, 4 decimal places (e.g. `5.1234`) |

## Example

```csv
rank,word,count,percent
1,the,4205,5.1234
2,and,2901,3.5345
3,don't,120,0.1462
```

## Contract tests (`src/lib/csv.test.ts`)

Header row; BOM present; CRLF; quoting; percent formatting; row count equals the number of
filtered entries + 1; round-trip parsing gives back the same entries.
