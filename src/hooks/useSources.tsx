import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as Source[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
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
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
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
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success("File deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  return {
    sources,
    isLoading,
    uploadFile: uploadMutation.mutate,
    deleteSource: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
