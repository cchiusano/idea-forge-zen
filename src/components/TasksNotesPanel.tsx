import { useState } from "react";
import { CheckSquare, FileEdit, Trash2, GripVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/useTasks";
import { useNotes } from "@/hooks/useNotes";
import { TaskEditor } from "./TaskEditor";
import { NoteEditor } from "./NoteEditor";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

const isHtml = (s: string | null | undefined) => !!s && /<[^>]+>/.test(s);
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Task = Tables<"tasks">;
type Note = Tables<"notes">;

interface SortableTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggle: (task: Task) => void;
  getPriorityColor: (priority: string) => "default" | "destructive" | "secondary";
}

const SortableTask = ({ task, onEdit, onDelete, onToggle, getPriorityColor }: SortableTaskProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border bg-card ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div 
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={task.completed || false} 
            onCheckedChange={() => onToggle(task)}
            className="mt-1" 
          />
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(task)}
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
            onDelete(task.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

export const TasksNotesPanel = () => {
  const { tasks, isLoading: tasksLoading, createTask, updateTask, deleteTask, toggleTask, reorderTasks } = useTasks();
  const { notes, isLoading: notesLoading, createNote, updateNote, deleteNote } = useNotes();
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleTaskCreate = (taskData: Omit<Task, "id" | "created_at" | "updated_at" | "completed">) => {
    createTask(taskData);
    setCreatingTask(false);
  };

  const handleNoteSave = (id: string, title: string, content: string) => {
    updateNote({ id, title, content });
    setEditingNote(null);
  };

  const handleNoteCreate = (title: string, content: string) => {
    createNote({ title, content });
    setCreatingNote(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex((task) => task.id === active.id);
      const newIndex = filteredTasks.findIndex((task) => task.id === over.id);

      const reorderedTasks = arrayMove(filteredTasks, oldIndex, newIndex);
      
      const updates = reorderedTasks.map((task, index) => ({
        id: task.id,
        order: index,
      }));

      reorderTasks(updates);
    }
  };

  // If editing or creating, show editor instead
  if (editingTask || creatingTask) {
    return (
      <TaskEditor 
        task={editingTask} 
        onSave={editingTask ? handleTaskSave : undefined}
        onCreate={creatingTask ? handleTaskCreate : undefined}
        onCancel={() => {
          setEditingTask(null);
          setCreatingTask(false);
        }} 
      />
    );
  }

  if (editingNote || creatingNote) {
    return (
      <NoteEditor 
        note={editingNote} 
        onSave={editingNote ? handleNoteSave : undefined}
        onCreate={creatingNote ? handleNoteCreate : undefined}
        onCancel={() => {
          setEditingNote(null);
          setCreatingNote(false);
        }} 
      />
    );
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredTasks.map((task) => (
                      <SortableTask
                        key={task.id}
                        task={task}
                        onEdit={setEditingTask}
                        onDelete={deleteTask}
                        onToggle={toggleTask}
                        getPriorityColor={getPriorityColor}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <Button onClick={() => setCreatingTask(true)} className="w-full">
              + New Task
            </Button>
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
                          <h3 className="font-medium text-sm mb-1">{note.title}</h3>
                          {isHtml(note.content) ? (
                            <div
                              className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm"
                              dangerouslySetInnerHTML={{ __html: note.content || "" }}
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              <MarkdownRenderer content={note.content || ""} />
                            </div>
                          )}
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
            <Button onClick={() => setCreatingNote(true)} className="w-full">
              + New Note
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
