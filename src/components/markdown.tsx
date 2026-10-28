import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders content-file Markdown with the site's prose styles. */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prose ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
