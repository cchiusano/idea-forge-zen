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
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [notebookCollapsed, setNotebookCollapsed] = useState(false);

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
      <header className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">My Workspace</h1>
          <div className="hidden md:block">
            <ProjectSelector />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {user.email?.[0].toUpperCase()}
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
              <SourcesPanel onCollapse={undefined} />
            </TabsContent>
            <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
              <AIAssistantPanel />
            </TabsContent>
            <TabsContent value="tasks" className="flex-1 m-0 overflow-hidden">
              <TasksNotesPanel onCollapse={undefined} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden animate-fade-in-up flex">
          {sourcesCollapsed && (
            <div className="w-16 border-r bg-card flex items-center justify-center py-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSourcesCollapsed(false)}
                className="h-10 w-10"
              >
                <FileText className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {!sourcesCollapsed && (
              <>
                <ResizablePanel 
                  defaultSize={25} 
                  minSize={20} 
                  maxSize={35}
                  collapsible={true}
                  collapsedSize={0}
                  onCollapse={() => setSourcesCollapsed(true)}
                  onExpand={() => setSourcesCollapsed(false)}
                >
                  <SourcesPanel onCollapse={() => setSourcesCollapsed(true)} />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
            
            <ResizablePanel 
              defaultSize={sourcesCollapsed && notebookCollapsed ? 100 : (!sourcesCollapsed && !notebookCollapsed ? 50 : 75)} 
              minSize={30}
            >
              <AIAssistantPanel />
            </ResizablePanel>
            
            {!notebookCollapsed && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={25} 
                  minSize={20} 
                  maxSize={40}
                  collapsible={true}
                  collapsedSize={0}
                  onCollapse={() => setNotebookCollapsed(true)}
                  onExpand={() => setNotebookCollapsed(false)}
                >
                  <TasksNotesPanel onCollapse={() => setNotebookCollapsed(true)} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
          
          {notebookCollapsed && (
            <div className="w-16 border-l bg-card flex items-center justify-center py-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setNotebookCollapsed(false)}
                className="h-10 w-10"
              >
                <CheckSquare className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
