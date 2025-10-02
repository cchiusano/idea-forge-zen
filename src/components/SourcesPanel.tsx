import { useRef, useState } from "react";
import { Search, Upload, X, Loader2, Cloud, Eye, Download, Maximize2, Minimize2, ExternalLink, Sparkles, Lightbulb, Plus, MoreVertical, FileText, PanelLeftClose } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useSources } from "@/hooks/useSources";
import { GoogleDriveDialog } from "./GoogleDriveDialog";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { FileIcon } from "@/components/FileIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Source {
  id: string;
  name: string;
  type: string;
  size: number;
  file_path: string;
  uploaded_at: string;
}

interface SourcesPanelProps {
  onCollapse?: () => void;
}

export const SourcesPanel = ({ onCollapse }: SourcesPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");
  const [summarizingSource, setSummarizingSource] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const { sources, isLoading, uploadFile, deleteSource, isUploading, addDriveFile } = useSources();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
      event.target.value = ""; // Reset input
    }
  };

  const filteredSources = sources.filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileUrl = (source: Source) => {
    // Check if it's a Google Drive file
    if (source.file_path.includes('docs.google.com')) {
      return source.file_path;
    }
    // Otherwise it's from Supabase storage
    const { data } = supabase.storage.from('sources').getPublicUrl(source.file_path);
    return data.publicUrl;
  };

  const isGoogleDriveFile = (source: Source) => {
    return source.file_path.includes('docs.google.com');
  };

  const canPreview = (source: Source) => {
    if (isGoogleDriveFile(source)) {
      return true; // All Google Drive files can be previewed
    }
    return source.type === 'application/pdf';
  };

  const handleOpenExternal = (source: Source) => {
    const url = getFileUrl(source);
    window.open(url, '_blank');
  };

  const handleSummarize = async (source: Source) => {
    setSummarizingSource(source.id);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-document', {
        body: { source }
      });

      if (error) throw error;

      setCurrentSummary(data.summary);
      setSummaryDialogOpen(true);
    } catch (error) {
      console.error('Error summarizing document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to summarize document');
    } finally {
      setSummarizingSource(null);
    }
  };

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };

  const handleGenerateInsights = async () => {
    if (selectedSourceIds.size < 2) {
      toast.error('Please select at least 2 sources to generate insights');
      return;
    }

    setGeneratingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [{ 
            role: 'user', 
            content: 'Analyze these documents and generate cross-document insights.' 
          }],
          sourceIds: Array.from(selectedSourceIds)
        }
      });

      if (error) throw error;
      
      setCurrentSummary(data.message);
      setSummaryDialogOpen(true);
      setSelectedSourceIds(new Set()); // Clear selection
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (previewSource) {
    const url = getFileUrl(previewSource);
    const canShow = canPreview(previewSource);
    
    return (
      <div className={`flex flex-col h-full border-r bg-background ${isExpanded ? 'fixed inset-0 z-50' : ''}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => {
                setPreviewSource(null);
                setIsExpanded(false);
              }}>
                <X className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-sm truncate">{previewSource.name}</h3>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleOpenExternal(previewSource)}
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{previewSource.type}</span>
            <span>•</span>
            <span>{formatFileSize(previewSource.size)}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-muted/20">
          {canShow ? (
            <iframe 
              src={url} 
              className="w-full h-full border-0"
              title={previewSource.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <div className="p-4 flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <Button onClick={() => handleOpenExternal(previewSource)}>
                  <Download className="h-4 w-4 mr-2" />
                  Open in new tab
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sources</h2>
          <div className="flex items-center gap-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setDriveDialogOpen(true)}
              className="rounded-full gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
            {onCollapse && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onCollapse}
                className="h-10 w-10"
              >
                <PanelLeftClose className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-background border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery ? "No sources found" : "No sources uploaded yet"}
            </div>
          ) : (
            filteredSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all group cursor-pointer"
                onClick={() => setPreviewSource(source)}
              >
                <FileIcon type={source.type} className="h-10 w-10 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{source.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span>{new Date(source.uploaded_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{formatFileSize(source.size)}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSummarize(source);
                      }}
                      disabled={summarizingSource === source.id}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Summarize
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewSource(source);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSource(source);
                      }}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        />
        <Button 
          className="w-full" 
          variant="outline"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </>
          )}
        </Button>
      </div>

      <GoogleDriveDialog
        open={driveDialogOpen}
        onOpenChange={setDriveDialogOpen}
        onFileSelect={addDriveFile}
      />

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSourceIds.size > 1 ? 'Cross-Document Insights' : 'Document Summary'}
            </DialogTitle>
          </DialogHeader>
          <MarkdownRenderer content={currentSummary} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
