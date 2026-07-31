// src/components/SuggestInput.jsx
//
// A text input that offers what you've typed before.
//
// Built on the native <datalist> element rather than a custom dropdown, because:
//   - it still accepts any free text, so nothing you could type before is blocked
//   - it works on mobile browsers, where a custom popup would fight the keyboard
//   - no extra state, no outside-click handling, no z-index problems inside modals
//
// The suggestion lists are derived from records already in the database, so the
// same bank or payee gets spelled the same way every time — which matters,
// because the client and vendor statements match transactions by name.

import React, { useId, useMemo } from 'react';

/**
 * Collects distinct, non-empty values for one or more fields across records.
 *
 * @param {Array<Array>} sources  [[records, 'fieldName'], ...]
 * @param {number} limit          cap the list so the dropdown stays usable
 * @returns {string[]} sorted, de-duplicated values
 */
export function collectSuggestions(sources, limit = 60) {
  const seen = new Map(); // lowercase key -> original casing (first one wins)
  const counts = new Map();

  // A default parameter only covers `undefined`, so guard explicitly.
  for (const pair of (Array.isArray(sources) ? sources : [])) {
    if (!Array.isArray(pair)) continue;
    const [records, field] = pair;
    if (!Array.isArray(records)) continue;
    for (const r of records) {
      const raw = r && r[field];
      if (raw === null || raw === undefined) continue;
      // Objects would stringify to "[object Object]" and pollute the list.
      if (typeof raw === 'object') continue;
      const value = String(raw).trim().replace(/\s+/g, ' ');
      if (!value || value.length > 80) continue;
      const key = value.toLowerCase();
      if (!seen.has(key)) seen.set(key, value);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return [...seen.entries()]
    // Most-used first, then alphabetical — the value you reach for most is on top.
    .sort((a, b) => (counts.get(b[0]) - counts.get(a[0])) || a[1].localeCompare(b[1]))
    .slice(0, limit)
    .map(([, value]) => value);
}

const SuggestInput = ({
  options = [],
  value,
  onChange,
  className = 'form-input',
  ...rest
}) => {
  // useId keeps the list id unique even when the same field renders twice.
  const listId = useId();
  const list = useMemo(
    () => options.filter((o) => typeof o === 'string' && o.trim()),
    [options]
  );

  return (
    <>
      <input
        {...rest}
        className={className}
        value={value ?? ''}
        onChange={onChange}
        list={list.length ? listId : undefined}
        autoComplete="off"
      />
      {list.length > 0 && (
        <datalist id={listId}>
          {list.map((o) => <option key={o} value={o} />)}
        </datalist>
      )}
    </>
  );
};

export default SuggestInput;
