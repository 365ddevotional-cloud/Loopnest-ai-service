interface RedLetterScriptureProps {
  text: string;
  enabled?: boolean;
  className?: string;
}

export function RedLetterScripture({ 
  text, 
  enabled = true, 
  className = "" 
}: RedLetterScriptureProps) {
  if (!enabled) {
    return <span className={className}>{text}</span>;
  }

  const segments = parseRedLetterText(text);
  
  return (
    <span className={className}>
      {segments.map((segment, idx) => (
        segment.isRedLetter ? (
          <span key={idx} className="text-red-letter">{segment.text}</span>
        ) : (
          <span key={idx}>{segment.text}</span>
        )
      ))}
    </span>
  );
}

interface TextSegment {
  text: string;
  isRedLetter: boolean;
}

function parseRedLetterText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /\[DIVINE\]([\s\S]*?)\[\/DIVINE\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isRedLetter: false,
      });
    }
    segments.push({
      text: match[1],
      isRedLetter: true,
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isRedLetter: false,
    });
  }

  if (segments.length === 0) {
    segments.push({ text, isRedLetter: false });
  }

  return segments;
}

export function formatWithRedLetterMarkers(
  text: string, 
  speaker: "Jesus" | "God" | null
): string {
  if (speaker === "Jesus" || speaker === "God") {
    return `[DIVINE]${text}[/DIVINE]`;
  }
  return text;
}

export function stripRedLetterMarkers(text: string): string {
  return text.replace(/\[DIVINE\]([\s\S]*?)\[\/DIVINE\]/g, "$1");
}
