interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className = "" }: MarkdownRendererProps) => {
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, lineIndex) => {
      // Handle headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={lineIndex} className="text-base font-semibold mt-3 mb-1">
            {processInlineFormatting(line.substring(4))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={lineIndex} className="text-lg font-semibold mt-4 mb-2">
            {processInlineFormatting(line.substring(3))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={lineIndex} className="text-xl font-bold mt-4 mb-2">
            {processInlineFormatting(line.substring(2))}
          </h1>
        );
      }
      // Handle bullet points
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <div key={lineIndex} className="flex gap-2 ml-2 mb-1">
            <span className="text-muted-foreground mt-1">•</span>
            <span className="flex-1">{processInlineFormatting(line.trim().substring(2))}</span>
          </div>
        );
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line.trim())) {
        const match = line.trim().match(/^(\d+)\.\s(.*)$/);
        if (match) {
          elements.push(
            <div key={lineIndex} className="flex gap-2 ml-2 mb-1">
              <span className="text-muted-foreground">{match[1]}.</span>
              <span className="flex-1">{processInlineFormatting(match[2])}</span>
            </div>
          );
        }
      }
      // Handle empty lines
      else if (line.trim() === '') {
        elements.push(<div key={lineIndex} className="h-2" />);
      }
      // Handle regular paragraphs
      else {
        elements.push(
          <p key={lineIndex} className="mb-2">
            {processInlineFormatting(line)}
          </p>
        );
      }
    });

    return elements;
  };

  const processInlineFormatting = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    let keyCounter = 0;

    // Handle **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }

      // Add the bold text
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="font-semibold">
          {match[1]}
        </strong>
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {renderContent(content)}
    </div>
  );
};
