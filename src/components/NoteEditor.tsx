import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bold, Italic, List, ListOrdered, ArrowLeft } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Note = Tables<"notes">;

interface NoteEditorProps {
  note: Note | null;
  onSave?: (id: string, title: string, content: string) => void;
  onCreate?: (title: string, content: string) => void;
  onCancel: () => void;
}

export const NoteEditor = ({ note, onSave, onCreate, onCancel }: NoteEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: note?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  useEffect(() => {
    if (editor && note?.content !== undefined) {
      editor.commands.setContent(note.content || "");
    }
  }, [note?.id, editor]);

  const handleSubmit = () => {
    if (!editor) return;
    const title = (document.getElementById("note-title") as HTMLInputElement)?.value;
    if (!title?.trim()) return;
    
    const content = editor.getHTML();
    
    if (note && onSave) {
      // Edit mode
      onSave(note.id, title, content);
    } else if (onCreate) {
      // Create mode
      onCreate(title, content);
    }
  };

  if (!note && !onCreate) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">{note ? 'Edit Note' : 'New Note'}</h2>
        </div>
        <Input
          id="note-title"
          defaultValue={note?.title || ""}
          placeholder="Note title"
          className="text-lg font-medium"
        />
        {editor && (
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? "bg-accent" : ""}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? "bg-accent" : ""}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive("bulletList") ? "bg-accent" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive("orderedList") ? "bg-accent" : ""}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto border-b">
        <EditorContent editor={editor} />
      </div>

      <div className="p-4 flex gap-2">
        <Button onClick={handleSubmit} className="flex-1">
          {note ? 'Save Changes' : 'Create Note'}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
};
