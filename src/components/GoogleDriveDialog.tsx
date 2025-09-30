import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  webViewLink: string;
  iconLink: string;
}

interface GoogleDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: GoogleDriveFile) => void;
}

export const GoogleDriveDialog = ({ open, onOpenChange, onFileSelect }: GoogleDriveDialogProps) => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-files');
      
      if (error) throw error;
      
      if (data.needsAuth) {
        setIsConnected(false);
      } else {
        setIsConnected(true);
        setFiles(data.files || []);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkConnection();
    }
  }, [open]);

  useEffect(() => {
    const handler = async (ev: MessageEvent) => {
      const data = ev.data;
      if (data && data.type === 'drive-auth') {
        if (data.status === 'success') {
          setIsConnecting(false);
          await checkConnection();
          toast.success('Google Drive connected');
        } else {
          setIsConnecting(false);
          toast.error('Google Drive connection failed');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get auth URL
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { action: 'init' }
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(
        data.authUrl,
        'Google Drive Auth',
        'width=600,height=700'
      );

      // Poll for completion
      const checkAuth = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkAuth);
          await checkConnection();
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect to Google Drive');
      setIsConnecting(false);
    }
  };

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-files');
      
      if (error) throw error;
      
      if (data.needsAuth) {
        setIsConnected(false);
        toast.error('Please connect to Google Drive first');
      } else {
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: GoogleDriveFile) => {
    setSelectedFileId(file.id);
    onFileSelect(file);
    setTimeout(() => {
      onOpenChange(false);
      setSelectedFileId(null);
    }, 500);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select from Google Drive</DialogTitle>
        </DialogHeader>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect to Google Drive to access your files
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Google Drive'
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {files.length} files available
              </p>
              <Button variant="outline" size="sm" onClick={loadFiles} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No files found in your Google Drive
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleFileSelect(file)}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group relative"
                    >
                      {file.iconLink ? (
                        <img src={file.iconLink} alt="" className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{file.mimeType.split('/').pop()}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedFileId === file.id && (
                        <div className="absolute right-3 top-3">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
