import { useState } from "react";
import { CheckSquare, FileEdit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/useTasks";
import { useNotes } from "@/hooks/useNotes";
import { TaskDialog } from "./TaskDialog";
import { NoteDialog } from "./NoteDialog";
import { TaskEditor } from "./TaskEditor";
import { NoteEditor } from "./NoteEditor";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Note = Tables<"notes">;

export const TasksNotesPanel = () => {
  const { tasks, isLoading: tasksLoading, createTask, updateTask, deleteTask, toggleTask } = useTasks();
  const { notes, isLoading: notesLoading, createNote, updateNote, deleteNote } = useNotes();
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "done") return task.completed;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleTaskSave = (id: string, updates: Partial<Task>) => {
    updateTask({ id, ...updates });
    setEditingTask(null);
  };

  const handleNoteSave = (id: string, title: string, content: string) => {
    updateNote({ id, title, content });
    setEditingNote(null);
  };

  // If editing, show editor instead
  if (editingTask) {
    return <TaskEditor task={editingTask} onSave={handleTaskSave} onCancel={() => setEditingTask(null)} />;
  }

  if (editingNote) {
    return <NoteEditor note={editingNote} onSave={handleNoteSave} onCancel={() => setEditingNote(null)} />;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <Tabs defaultValue="tasks" className="flex flex-col h-full">
        <div className="p-4 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tasks" className="flex-1 mt-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                <span className="font-semibold">Tasks</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{tasks.length}
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === "all" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={filter === "active" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilter("active")}
              >
                Active
              </Button>
              <Button 
                variant={filter === "done" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilter("done")}
              >
                Done
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {tasksLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {filter === "done" 
                    ? "No completed tasks" 
                    : filter === "active"
                    ? "No active tasks"
                    : "No tasks yet"}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border bg-card ${task.completed ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={task.completed || false} 
                          onCheckedChange={() => toggleTask(task)}
                          className="mt-1" 
                        />
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setEditingTask(task)}
                      >
                        <p className={`font-medium text-sm ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {task.priority && (
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          )}
                          {task.due_date && (
                            <Badge variant="outline" className="gap-1">
                              <span className="text-xs">🗓</span>
                              {format(new Date(task.due_date), "MMM dd, yyyy")}
                            </Badge>
                          )}
                          {task.category && (
                            <Badge variant="outline">{task.category}</Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <TaskDialog onCreateTask={createTask} />
          </div>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 mt-0">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              <span className="font-semibold">Notes</span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {notesLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12">
                  <FileEdit className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first note to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group cursor-pointer"
                      onClick={() => setEditingNote(note)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{note.title}</h3>
                          <div 
                            className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm"
                            dangerouslySetInnerHTML={{ __html: note.content || "" }}
                          />
                          {note.created_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(note.created_at), "MMM dd, yyyy")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <NoteDialog onCreateNote={createNote} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
