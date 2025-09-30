import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1].content;

    console.log("User message:", userMessage);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search tasks, notes, and sources
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .order('uploaded_at', { ascending: false });

    console.log("Found tasks:", tasks?.length, "notes:", notes?.length, "sources:", sources?.length);

    // Fetch source content for files in storage and Google Drive
    let sourcesContent = '';
    if (sources && sources.length > 0) {
      for (const source of sources.slice(0, 5)) { // Limit to 5 most recent sources
        try {
          // Check if it's a Google Drive link or storage file
          if (source.file_path.startsWith('http')) {
            // Google Drive file - extract file ID and fetch content
            const urlMatch = source.file_path.match(/[-\w]{25,}/);
            if (urlMatch) {
              const fileId = urlMatch[0];
              
              // Check if it's a Google Workspace file
              const isGoogleDoc = source.type === 'application/vnd.google-apps.document';
              const isGoogleSheet = source.type === 'application/vnd.google-apps.spreadsheet';
              const isGoogleSlide = source.type === 'application/vnd.google-apps.presentation';
              
              if (isGoogleDoc || isGoogleSheet || isGoogleSlide) {
                try {
                  const contentResponse = await fetch(`${supabaseUrl}/functions/v1/google-drive-content`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify({ fileId, mimeType: source.type }),
                  });
                  
                  if (contentResponse.ok) {
                    const { content } = await contentResponse.json();
                    const truncatedContent = content.substring(0, 3000);
                    sourcesContent += `\nDocument: ${source.name} (Google ${isGoogleDoc ? 'Doc' : isGoogleSheet ? 'Sheet' : 'Slides'})\nContent:\n${truncatedContent}\n`;
                  } else {
                    sourcesContent += `\nDocument: ${source.name} (${source.type}) - Could not fetch content\n`;
                  }
                } catch (fetchErr) {
                  console.error('Error fetching Google Drive content:', source.name, fetchErr);
                  sourcesContent += `\nDocument: ${source.name} (${source.type}) - Error fetching content\n`;
                }
              } else {
                sourcesContent += `\nDocument: ${source.name} (${source.type}) - Google Drive file\n`;
              }
            } else {
              sourcesContent += `\nDocument: ${source.name} - Google Drive file\n`;
            }
          } else {
            // Supabase storage file
            const isPDF = source.type === 'application/pdf' || source.name.endsWith('.pdf');
            const isTextFile = source.type.includes('text') || 
                              source.name.endsWith('.txt') ||
                              source.name.endsWith('.md');
            
            if ((isTextFile || isPDF) && source.size < 5000000) { // Files < 5MB
              const { data: fileData, error: downloadError } = await supabase
                .storage
                .from('sources')
                .download(source.file_path);
              
              if (!downloadError && fileData) {
                if (isPDF) {
                  try {
                    // Parse PDF using pdfjs
                    const arrayBuffer = await fileData.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    const loadingTask = pdfjs.getDocument({ data: uint8Array });
                    const pdf = await loadingTask.promise;
                    
                    let text = '';
                    const numPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages
                    
                    for (let i = 1; i <= numPages; i++) {
                      const page = await pdf.getPage(i);
                      const content = await page.getTextContent();
                      const pageText = content.items.map((item: any) => item.str).join(' ');
                      text += pageText + '\n';
                    }
                    
                    sourcesContent += `\nDocument: ${source.name} (PDF, ${numPages} pages)\nContent:\n${text.substring(0, 3000)}\n`;
                  } catch (pdfError) {
                    console.error('PDF parse error:', source.name, pdfError);
                    sourcesContent += `\nDocument: ${source.name} (PDF) - Could not parse content\n`;
                  }
                } else {
                  // Plain text file
                  const text = await fileData.text();
                  sourcesContent += `\nDocument: ${source.name}\nContent:\n${text.substring(0, 3000)}\n`;
                }
              } else {
                sourcesContent += `\nDocument: ${source.name} (${source.type})\n`;
              }
            } else {
              sourcesContent += `\nDocument: ${source.name} (${source.type})\n`;
            }
          }
        } catch (err) {
          console.error('Error fetching source:', source.name, err);
          sourcesContent += `\nDocument: ${source.name} (${source.type})\n`;
        }
      }
    }

    // Build context for AI
    const tasksContext = tasks?.map(t => 
      `Task: ${t.title}${t.description ? ` - ${t.description}` : ''} (Priority: ${t.priority}, Status: ${t.completed ? 'Done' : 'Active'})`
    ).join('\n') || 'No tasks found.';

    const notesContext = notes?.map(n => 
      `Note: ${n.title} - ${n.content?.replace(/<[^>]*>/g, '').substring(0, 200)}`
    ).join('\n') || 'No notes found.';

    const systemPrompt = `You are a helpful AI assistant that helps users manage their tasks, notes, and analyze their documents. 

Here is the current data:

TASKS:
${tasksContext}

NOTES:
${notesContext}

SOURCE DOCUMENTS:
${sourcesContent || 'No source documents uploaded yet.'}

Answer the user's question based on this data. Be concise and helpful. If asked about tasks, notes, or documents, reference the actual data above. For document analysis, provide insights based on the content shown.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    console.log("AI response generated");

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
