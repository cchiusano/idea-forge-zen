import { useState } from "react";
import { Plus, CheckSquare, FileEdit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: string;
  dueDate?: string;
  completed: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const TasksNotesPanel = () => {
  const [tasks] = useState<Task[]>([
    {
      id: "1",
      title: "Review project requirements document",
      description: "Go through the uploaded PDF and extract key requirements",
      priority: "high",
      category: "Research",
      dueDate: "Tomorrow",
      completed: false
    },
    {
      id: "2",
      title: "Update presentation with latest data",
      description: "Include findings from the data analysis spreadsheet",
      priority: "medium",
      category: "Presentation",
      dueDate: "10/3/2025",
      completed: false
    },
    {
      id: "3",
      title: "Schedule user interviews",
      description: "",
      priority: "medium",
      category: "Research",
      completed: true
    }
  ]);

  const [notes] = useState<Note[]>([]);

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
              <span className="text-sm text-muted-foreground">1/3</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">All</Button>
              <Button variant="ghost" size="sm">Active</Button>
              <Button variant="ghost" size="sm">Done</Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border bg-card ${task.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={task.completed} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <Badge variant="outline" className="gap-1">
                            <span className="text-xs">🗓</span>
                            {task.dueDate}
                          </Badge>
                        )}
                        <Badge variant="outline">{task.category}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <span className="text-muted-foreground">🗑</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
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
              {notes.length === 0 ? (
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
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <h3 className="font-medium text-sm">{note.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {note.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {note.created_at}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
