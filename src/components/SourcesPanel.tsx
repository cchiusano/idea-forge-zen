import { useRef, useState } from "react";
import { Search, Upload, FileText, X, Loader2, Cloud, Eye, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSources } from "@/hooks/useSources";
import { GoogleDriveDialog } from "./GoogleDriveDialog";
import { supabase } from "@/integrations/supabase/client";

interface Source {
  id: string;
  name: string;
  type: string;
  size: number;
  file_path: string;
  uploaded_at: string;
}

export const SourcesPanel = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
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

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('sources').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDownload = async (source: Source) => {
    const url = getPublicUrl(source.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = source.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (previewSource) {
    const url = getPublicUrl(previewSource.file_path);
    const isPdf = previewSource.type === 'application/pdf';
    
    return (
      <div className="flex flex-col h-full border-r bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setPreviewSource(null)}>
                <X className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-sm truncate">{previewSource.name}</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDownload(previewSource)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{previewSource.type}</span>
            <span>•</span>
            <span>{formatFileSize(previewSource.size)}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {isPdf ? (
            <iframe 
              src={url} 
              className="w-full h-full border-0"
              title={previewSource.name}
            />
          ) : (
            <div className="p-4 flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <Button onClick={() => handleDownload(previewSource)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "No sources found" : "No sources uploaded yet"}
            </div>
          ) : (
            filteredSources.map((source) => (
            <div
              key={source.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
            >
              <FileText className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setPreviewSource(source)}
              >
                <p className="font-medium text-sm truncate">{source.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{source.type}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(source.size)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(source.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewSource(source);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSource(source);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
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
          onClick={() => setDriveDialogOpen(true)}
        >
          <Cloud className="h-4 w-4 mr-2" />
          Select from Google Drive
        </Button>
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
              Upload Local File
            </>
          )}
        </Button>
      </div>

      <GoogleDriveDialog
        open={driveDialogOpen}
        onOpenChange={setDriveDialogOpen}
        onFileSelect={addDriveFile}
      />
    </div>
  );
};
