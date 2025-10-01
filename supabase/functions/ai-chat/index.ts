import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sourceIds, projectId } = await req.json();
    const userMessage = messages[messages.length - 1].content;

    console.log("User message:", userMessage);

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // User client with RLS enforcement - uses auth from request
    const authHeader = req.headers.get('Authorization')!;
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for storage/downloads only
    const supabase = createClient(supabaseUrl, serviceKey);

    // Search tasks, notes, and sources (RLS will filter by user automatically)
    let tasksQuery = userSupabase.from('tasks').select('*').order('created_at', { ascending: false });
    let notesQuery = userSupabase.from('notes').select('*').order('created_at', { ascending: false });
    let sourcesQuery = userSupabase.from('sources').select('*').order('uploaded_at', { ascending: false });

    // Filter by project if provided
    if (projectId) {
      tasksQuery = tasksQuery.eq('project_id', projectId);
      notesQuery = notesQuery.eq('project_id', projectId);
      sourcesQuery = sourcesQuery.eq('project_id', projectId);
    }

    // Filter by specific source IDs if provided
    if (sourceIds && sourceIds.length > 0) {
      sourcesQuery = sourcesQuery.in('id', sourceIds);
    }

    const { data: tasks } = await tasksQuery;
    const { data: notes } = await notesQuery;
    const { data: sources } = await sourcesQuery;

    console.log("Found tasks:", tasks?.length, "notes:", notes?.length, "sources:", sources?.length);

    // Fetch source content for files in storage and Google Drive
    let sourcesContent = '';
    const sourcesUsed: Array<{id: string, name: string}> = [];
    const maxSources = sourceIds && sourceIds.length > 0 ? sourceIds.length : 10;
    
    if (sources && sources.length > 0) {
      for (const source of sources.slice(0, maxSources)) {
        let contentAdded = false;
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
                      'Authorization': `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({ fileId, mimeType: source.type }),
                  });
                  
                  if (contentResponse.ok) {
                    const { content } = await contentResponse.json();
                    const truncatedContent = content.substring(0, 8000);
                    sourcesContent += `\nDocument: ${source.name} (Google ${isGoogleDoc ? 'Doc' : isGoogleSheet ? 'Sheet' : 'Slides'})\nContent:\n${truncatedContent}\n`;
                    contentAdded = true;
                  }
                } catch (fetchErr) {
                  console.error('Error fetching Google Drive content:', source.name, fetchErr);
                }
              }
            }
          } else {
            // Supabase storage file
            const isPDF = source.type === 'application/pdf' || source.name.endsWith('.pdf');
            const isTextFile = source.type.includes('text') || 
                              source.name.endsWith('.txt') ||
                              source.name.endsWith('.md');
            
            if ((isTextFile || isPDF) && source.size < 5000000) {
              const { data: fileData, error: downloadError } = await supabase
                .storage
                .from('sources')
                .download(source.file_path);
              
              if (!downloadError && fileData) {
                if (isPDF) {
                  try {
                    const arrayBuffer = await fileData.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                    
                    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/parse-pdf`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${serviceKey}`,
                      },
                      body: JSON.stringify({ pdfData: base64 }),
                    });
                    
                    if (pdfResponse.ok) {
                      const { text, extracted, wordCount, needsOCR } = await pdfResponse.json();
                      if (extracted && text) {
                        const label = needsOCR ? 'partially readable' : 'text-based';
                        sourcesContent += `\nDocument: ${source.name} (PDF, ${label}, ~${wordCount} words)\nContent:\n${text.substring(0, 10000)}\n`;
                        contentAdded = true;
                      }
                    }
                  } catch (pdfError) {
                    console.error('PDF parse error:', source.name, pdfError);
                  }
                } else {
                  const text = await fileData.text();
                  sourcesContent += `\nDocument: ${source.name}\nContent:\n${text.substring(0, 8000)}\n`;
                  contentAdded = true;
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching source:', source.name, err);
        }
        
        // Only add to sourcesUsed if we actually got content
        if (contentAdded) {
          sourcesUsed.push({ id: source.id, name: source.name });
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

    const isInsightsRequest = sourceIds && sourceIds.length > 1;
    
    const systemPrompt = isInsightsRequest 
      ? `You are an expert research analyst. Analyze these ${sources?.length || 0} documents and generate cross-document insights.

SOURCE DOCUMENTS:
${sourcesContent || 'No source documents provided.'}

Your task:
1. Identify common themes and patterns across all documents
2. Highlight contradictions or different perspectives
3. Find connections and relationships between documents
4. Suggest actionable insights based on the collective information
5. At the end, list the documents you analyzed in this format:
   📄 Sources analyzed: [Document 1], [Document 2], [Document 3]

Be thorough, analytical, and cite specific documents when making points.`
      : `You are a helpful AI assistant that helps users manage their tasks, notes, and analyze their documents. 

Here is the user's current data:

TASKS:
${tasksContext}

NOTES:
${notesContext}

SOURCE DOCUMENTS:
${sourcesContent || 'No source documents uploaded yet.'}

Important: When answering questions about documents or sources:
1. Cite the specific document name in your response like this: "According to [Document Name]..."
2. If you reference information from multiple documents, mention all of them
3. At the end of your response, list which documents you used in this format:
   📄 Sources: [Document 1], [Document 2]

Your primary job is to help with questions about the data above. When the user asks about their tasks, notes, or documents, always reference and prioritize this information.

However, you can also answer general questions on any topic. If a question isn't related to the user's data, feel free to provide helpful general knowledge answers.

Be concise, helpful, and conversational.`;

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

    console.log("AI response generated, sources used:", sourcesUsed.length);

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        sources: sourcesUsed
      }),
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
