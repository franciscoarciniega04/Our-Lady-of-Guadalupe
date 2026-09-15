import { richText } from "@/lib/rich-text.mjs";
export function RichText({ text }: { text: string }) {
  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: richText(text) }}
    />
  );
}
