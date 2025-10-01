import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";

interface Source {
  id: string;
  name: string;
  type: string;
  size: number;
  file_path: string;
  uploaded_at: string;
}

export const useSources = () => {
  const { user } = useAuth();
  const { selectedProjectId } = useProject();
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources", selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from("sources")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (selectedProjectId) {
        query = query.eq("project_id", selectedProjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Source[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated");
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("sources")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get file type
      const fileType = file.type || 'unknown';

      // Save metadata to database
      const { data, error: dbError } = await supabase
        .from("sources")
        .insert({
          name: file.name,
          type: fileType,
          size: file.size,
          file_path: filePath,
          user_id: user.id,
          project_id: selectedProjectId,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", selectedProjectId] });
      toast.success("File uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (source: Source) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("sources")
        .remove([source.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("sources")
        .delete()
        .eq("id", source.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", selectedProjectId] });
      toast.success("File deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const addDriveFileMutation = useMutation({
    mutationFn: async (driveFile: any) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("sources")
        .insert({
          name: driveFile.name,
          type: driveFile.mimeType,
          size: driveFile.size || 0,
          file_path: driveFile.webViewLink,
          user_id: user.id,
          project_id: selectedProjectId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", selectedProjectId] });
      toast.success("Google Drive file added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add file: ${error.message}`);
    },
  });

  return {
    sources,
    isLoading,
    uploadFile: uploadMutation.mutate,
    deleteSource: deleteMutation.mutate,
    addDriveFile: addDriveFileMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
