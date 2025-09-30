import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type TaskInsert = TablesInsert<"tasks">;
type TaskUpdate = TablesUpdate<"tasks">;

export const useTasks = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error: queryError } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      console.log("Fetching tasks...");
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .order("order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        console.log("Tasks fetched:", data);
        return data as Task[];
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

  const createTask = useMutation({
    mutationFn: async (task: TaskInsert) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task: " + error.message,
        variant: "destructive",
      });
    },
  });

  const toggleTask = useMutation({
    mutationFn: async (task: Task) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to toggle task: " + error.message,
        variant: "destructive",
      });
    },
  });

  const reorderTasks = useMutation({
    mutationFn: async (tasks: { id: string; order: number }[]) => {
      const updates = tasks.map(task => 
        supabase
          .from("tasks")
          .update({ order: task.order })
          .eq("id", task.id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reorder tasks: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tasks,
    isLoading,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
    toggleTask: toggleTask.mutate,
    reorderTasks: reorderTasks.mutate,
  };
};
