import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { SourcesPanel } from "@/components/SourcesPanel";
import { AIAssistantPanel } from "@/components/AIAssistantPanel";
import { TasksNotesPanel } from "@/components/TasksNotesPanel";

const Index = () => {
  return (
    <div className="h-screen w-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <SourcesPanel />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={45} minSize={30}>
          <AIAssistantPanel />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
          <TasksNotesPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
