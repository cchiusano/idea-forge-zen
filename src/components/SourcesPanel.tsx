import { useState } from "react";
import { Search, Upload, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Source {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export const SourcesPanel = () => {
  const [sources] = useState<Source[]>([
    {
      id: "1",
      name: "Project Requirements.pdf",
      type: "doc",
      size: 2300000,
      uploaded_at: "2024-01-16"
    },
    {
      id: "2",
      name: "Data Analysis.xlsx",
      type: "spreadsheet",
      size: 890000,
      uploaded_at: "2024-01-14"
    },
    {
      id: "3",
      name: "Presentation Draft.pptx",
      type: "slide",
      size: 5100000,
      uploaded_at: "2024-01-13"
    }
  ]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" />
          <h2 className="font-semibold">Sources</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
            >
              <FileText className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{source.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{source.type}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(source.size)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{source.uploaded_at}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button className="w-full" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>
    </div>
  );
};
