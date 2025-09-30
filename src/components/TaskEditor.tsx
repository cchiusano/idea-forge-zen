import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

interface TaskEditorProps {
  task: Task | null;
  onSave: (id: string, updates: Partial<Task>) => void;
  onCancel: () => void;
}

export const TaskEditor = ({ task, onSave, onCancel }: TaskEditorProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority((task.priority as "low" | "medium" | "high") || "medium");
      setCategory(task.category || "");
      setDueDate(task.due_date || "");
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;
    onSave(task.id, {
      title,
      description: description || null,
      priority,
      category: category || null,
      due_date: dueDate || null,
    });
  };

  if (!task) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">Edit Task</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-priority">Priority</Label>
          <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
            <SelectTrigger id="edit-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category</Label>
          <Input
            id="edit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Work, Personal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-dueDate">Due Date</Label>
          <Input
            id="edit-dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 border-t flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
};
