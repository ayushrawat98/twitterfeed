export default function escapeHTML(str) {
  let out = "", i = 0, ch;
  for (; i < str.length; i++) {
    ch = str[i];
    if (ch === '<') out += '&lt;';
    else if (ch === '>') out += '&gt;';
    else if (ch === '&') out += '&amp;';
    else if (ch === '"') out += '&quot;';
    else if (ch === "'") out += '&#39;';
    else out += ch;
  }
  return out;
}