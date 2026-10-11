import type { ReactNode } from "react";

function boldParts(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>
      : part
  );
}

export function FormattedPrayerMessage({ message, className = "" }: { message: string; className?: string }) {
  return <div className={`space-y-3 ${className}`}>
    {message.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((paragraph, index) =>
      <p key={index} className="whitespace-pre-wrap break-words">{boldParts(paragraph)}</p>
    )}
  </div>;
}
