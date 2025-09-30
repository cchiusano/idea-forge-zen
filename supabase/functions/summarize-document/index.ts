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
    const { source } = await req.json();
    
    if (!source) {
      throw new Error('Source is required');
    }

    console.log("Summarizing document:", source.name);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let content = '';
    
    try {
      // Check if it's a Google Drive link or storage file
      if (source.file_path.startsWith('http')) {
        // Google Drive file
        const urlMatch = source.file_path.match(/[-\w]{25,}/);
        if (urlMatch) {
          const fileId = urlMatch[0];
          
          const isGoogleDoc = source.type === 'application/vnd.google-apps.document';
          const isGoogleSheet = source.type === 'application/vnd.google-apps.spreadsheet';
          const isGoogleSlide = source.type === 'application/vnd.google-apps.presentation';
          
          if (isGoogleDoc || isGoogleSheet || isGoogleSlide) {
            const contentResponse = await fetch(`${supabaseUrl}/functions/v1/google-drive-content`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ fileId, mimeType: source.type }),
            });
            
            if (contentResponse.ok) {
              const { content: driveContent } = await contentResponse.json();
              content = driveContent;
            } else {
              throw new Error('Could not fetch Google Drive content');
            }
          } else {
            throw new Error('Unsupported Google Drive file type for summarization');
          }
        }
      } else {
        // Supabase storage file
        const isPDF = source.type === 'application/pdf' || source.name.endsWith('.pdf');
        const isTextFile = source.type.includes('text') || 
                          source.name.endsWith('.txt') ||
                          source.name.endsWith('.md');
        
        if (isTextFile || isPDF) {
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('sources')
            .download(source.file_path);
          
          if (downloadError || !fileData) {
            throw new Error('Could not download file from storage');
          }
          
          if (isPDF) {
            // Parse PDF
            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/parse-pdf`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ pdfData: base64 }),
            });
            
            if (pdfResponse.ok) {
              const { text, extracted } = await pdfResponse.json();
              if (extracted && text) {
                content = text;
              } else {
                throw new Error('Could not extract text from PDF');
              }
            } else {
              throw new Error('PDF parsing failed');
            }
          } else {
            // Plain text file
            content = await fileData.text();
          }
        } else {
          throw new Error('Unsupported file type for summarization');
        }
      }
    } catch (err) {
      console.error('Error fetching document content:', err);
      throw new Error(`Failed to fetch document content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Document appears to be empty or content could not be extracted');
    }

    // Generate summary using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Please provide a concise summary of the following document. Include:
- Main topics or themes
- Key points or findings
- Any important data or conclusions

Document content:
${content.substring(0, 30000)}`; // Limit to 30k chars to avoid token limits

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that creates clear, concise document summaries.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    console.log("Summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-document function:', error);
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