import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { SourcesPanel } from "@/components/SourcesPanel";
import { AIAssistantPanel } from "@/components/AIAssistantPanel";
import { TasksNotesPanel } from "@/components/TasksNotesPanel";
import { ProjectSelector } from "@/components/ProjectSelector";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, FileText, Sparkles, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("ai");

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully.",
    });
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      <header className="border-b p-3 md:p-4 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-semibold truncate">My Workspace</h1>
          <div className="hidden md:block">
            <ProjectSelector />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px] md:max-w-none">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:scale-105 transition-transform">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>
      
      <div className="md:hidden border-b px-2">
        <ProjectSelector />
      </div>

      {isMobile ? (
        <div className="flex-1 overflow-hidden animate-fade-in-up">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b h-12">
              <TabsTrigger value="sources" className="gap-1 data-[state=active]:animate-scale-in">
                <FileText className="h-4 w-4" />
                <span className="text-xs">Sources</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1 data-[state=active]:animate-scale-in">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">AI</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1 data-[state=active]:animate-scale-in">
                <CheckSquare className="h-4 w-4" />
                <span className="text-xs">Tasks</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sources" className="flex-1 m-0 overflow-hidden">
              <SourcesPanel />
            </TabsContent>
            <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
              <AIAssistantPanel />
            </TabsContent>
            <TabsContent value="tasks" className="flex-1 m-0 overflow-hidden">
              <TasksNotesPanel />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden animate-fade-in-up">
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
      )}
    </div>
  );
};

export default Index;
