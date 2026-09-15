import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
export function richText(source) {
  return sanitizeHtml(marked.parse(source ?? "", { async: false }), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h2",
      "h3",
      "a",
      "code",
    ],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https", "mailto", "tel"],
    allowProtocolRelative: false,
  });
}
