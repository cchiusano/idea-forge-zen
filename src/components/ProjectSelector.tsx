import { useState } from "react";
import { Plus, Check, FolderOpen } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProject } from "@/contexts/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const ProjectSelector = () => {
  const { projects, createProject, isCreating } = useProjects();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(
        {
          name: newProjectName,
          description: newProjectDescription || undefined,
        },
        {
          onSuccess: () => {
            setNewProjectName("");
            setNewProjectDescription("");
            setIsDialogOpen(false);
          },
        }
      );
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedProjectId || "all"}
        onValueChange={(value) => setSelectedProjectId(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[200px]">
          <FolderOpen className="mr-2 h-4 w-4" />
          <SelectValue>
            {selectedProject?.name || "All Projects"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 opacity-0" />
              <span>All Projects</span>
            </div>
          </SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center">
                {selectedProjectId === project.id && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {selectedProjectId !== project.id && (
                  <div className="mr-2 w-4" />
                )}
                <span>{project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your sources, tasks, and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Research Project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || isCreating}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
