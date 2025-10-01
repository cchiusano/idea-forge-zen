import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Note = Tables<"notes">;
type NoteInsert = TablesInsert<"notes">;
type NoteUpdate = TablesUpdate<"notes">;

export const useNotes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedProjectId } = useProject();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error: queryError } = useQuery({
    queryKey: ["notes", selectedProjectId],
    queryFn: async () => {
      console.log("Fetching notes...");
      try {
        let query = supabase
          .from("notes")
          .select("*")
          .order("created_at", { ascending: false });

        if (selectedProjectId) {
          query = query.eq("project_id", selectedProjectId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        console.log("Notes fetched:", data);
        return data as Note[];
      } catch (err) {
        console.error("Fetch error:", err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  if (queryError) {
    console.error("Query error:", queryError);
  }

  const createNote = useMutation({
    mutationFn: async (note: NoteInsert) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("notes")
        .insert({ ...note, user_id: user.id, project_id: selectedProjectId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", selectedProjectId] });
      toast({
        title: "Note created",
        description: "Your note has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create note: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: NoteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", selectedProjectId] });
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update note: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", selectedProjectId] });
      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete note: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notes,
    isLoading,
    createNote: createNote.mutate,
    updateNote: updateNote.mutate,
    deleteNote: deleteNote.mutate,
  };
};
