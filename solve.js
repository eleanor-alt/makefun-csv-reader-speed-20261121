// A fast, dependency-free drop-in for csv-reader 1.0.0 (make.fun's own CSV reader).
//
// run(input) returns, for {text, header}, exactly the answer csv-reader 1.0.0
// returns: {columns, rows, errors} — the same broken-row policy, the same error
// records in the same order. Written from the policy in the kit's RULES.txt and
// checked against the reference on the practice set and on generated cases.
//
// How it stays fast while staying identical:
//  - One left-to-right pass with charCodeAt and slice(): an unquoted field is one
//    slice, never built a character at a time; a quoted field is scanned the same
//    way and only rebuilt (from slices) when it holds a doubled quote or a CR.
//  - A whole record whose line holds no quote and no CR is split natively in one
//    call (String split on a slice of the line), which covers most records.
//  - Rare paths (stray CR, quote junk, unterminated quote) fall back to the same
//    segment logic, so the answers stay identical in every case.
//
// Pure: no clock, no randomness, no locale, nothing kept from one call to the
// next. Deterministic: the same input always gives the same answer.

/** How a field ended: at a comma, at a line break, or at the end of the text. */
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1; // a U+FEFF at the very start is dropped

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  // Scratch for one field read: its value, how it ended, and (for an unquoted
  // read) how many characters it kept.
  let fValue = '';
  let fEnded = END;
  let fAdded = 0;

  // Reads unquoted characters onto `prefix` up to the next comma or line break:
  // a CR not followed by LF is dropped (stray_cr). Sets fValue, fEnded, fAdded.
  function readUnquoted(prefix) {
    let start = pos;
    let i = pos;
    let parts = null;
    let added = 0;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 44) {
        // ','
        fValue = parts === null ? (prefix === '' ? text.slice(start, i) : prefix + text.slice(start, i)) : prefix + parts.join('') + text.slice(start, i);
        fAdded = added + (i - start);
        pos = i + 1;
        fEnded = COMMA;
        return;
      }
      if (c === 10) {
        // '\n'
        fValue = parts === null ? (prefix === '' ? text.slice(start, i) : prefix + text.slice(start, i)) : prefix + parts.join('') + text.slice(start, i);
        fAdded = added + (i - start);
        line += 1;
        pos = i + 1;
        fEnded = LINE_BREAK;
        return;
      }
      if (c === 13) {
        // '\r'
        if (text.charCodeAt(i + 1) === 10) {
          fValue = parts === null ? (prefix === '' ? text.slice(start, i) : prefix + text.slice(start, i)) : prefix + parts.join('') + text.slice(start, i);
          fAdded = added + (i - start);
          line += 1;
          pos = i + 2;
          fEnded = LINE_BREAK;
          return;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        if (parts === null) parts = [];
        parts.push(text.slice(start, i));
        added += i - start;
        i += 1;
        start = i;
        continue;
      }
      i += 1;
    }
    fValue = parts === null ? (prefix === '' ? text.slice(start, i) : prefix + text.slice(start, i)) : prefix + parts.join('') + text.slice(start, i);
    fAdded = added + (i - start);
    pos = i;
    fEnded = END;
  }

  // Reads a quoted field whose opening quote is at pos. Sets fValue, fEnded.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let segStart = pos + 1;
    let i = pos + 1;
    let parts = null;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        // '"'
        if (text.charCodeAt(i + 1) === 34) {
          // '""' inside it is one quote.
          if (parts === null) parts = [];
          parts.push(text.slice(segStart, i), '"');
          i += 2;
          segStart = i;
          continue;
        }
        // The closing quote.
        const value = parts === null ? text.slice(segStart, i) : parts.join('') + text.slice(segStart, i);
        pos = i + 1;
        if (pos >= n) {
          fValue = value;
          fEnded = END;
          return;
        }
        const d = text.charCodeAt(pos);
        if (d === 44) {
          pos += 1;
          fValue = value;
          fEnded = COMMA;
          return;
        }
        if (d === 10) {
          line += 1;
          pos += 1;
          fValue = value;
          fEnded = LINE_BREAK;
          return;
        }
        if (d === 13 && text.charCodeAt(pos + 1) === 10) {
          line += 1;
          pos += 2;
          fValue = value;
          fEnded = LINE_BREAK;
          return;
        }
        // What follows the closing quote is appended as it stands, up to the
        // next comma or line break.
        readUnquoted(value);
        if (fAdded > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        return;
      }
      if (c === 13) {
        // CRLF and a lone CR inside quotes are each one LF.
        if (parts === null) parts = [];
        parts.push(text.slice(segStart, i), '\n');
        line += 1;
        i += text.charCodeAt(i + 1) === 10 ? 2 : 1;
        segStart = i;
        continue;
      }
      if (c === 10) line += 1;
      i += 1;
    }
    // The quote never closes: it is a literal character, and the text after it
    // is read again as unquoted.
    pos = open + 1;
    line = openLine;
    errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
    readUnquoted('"');
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    // Read it field by field. The unquoted scan is inlined here (the hot
    // path); readUnquoted stays for the junk/unterminated rare paths.
    const fields = [];
    let quoted = false;
    do {
      if (text.charCodeAt(pos) === 34) {
        quoted = true;
        readQuoted();
        fields.push(fValue);
        continue;
      }
      quoted = false;
      // Scan to the next comma, line break or CR, then take one slice.
      let i = pos;
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === 44 || c === 10 || c === 13) break;
        i += 1;
      }
      if (i >= n) {
        fields.push(text.slice(pos, i));
        pos = i;
        fEnded = END;
      } else if (text.charCodeAt(i) === 44) {
        fields.push(text.slice(pos, i));
        pos = i + 1;
        fEnded = COMMA;
      } else if (text.charCodeAt(i) === 10) {
        fields.push(text.slice(pos, i));
        line += 1;
        pos = i + 1;
        fEnded = LINE_BREAK;
      } else if (text.charCodeAt(i + 1) === 10) {
        fields.push(text.slice(pos, i));
        line += 1;
        pos = i + 2;
        fEnded = LINE_BREAK;
      } else {
        // A stray CR: hand the field to the segment logic.
        readUnquoted('');
        fields.push(fValue);
      }
    } while (fEnded === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
