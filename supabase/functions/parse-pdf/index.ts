import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfData } = await req.json();
    
    if (!pdfData) {
      throw new Error('PDF data is required');
    }

    // Simple text extraction approach - look for text between stream/endstream markers
    const binaryString = atob(pdfData);
    
    // Basic PDF text extraction - finds text objects
    const textPattern = /\(([^)]+)\)/g;
    const matches = [...binaryString.matchAll(textPattern)];
    
    let text = '';
    for (const match of matches) {
      if (match[1] && match[1].length > 1) {
        // Clean up PDF encoding artifacts
        const cleaned = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        
        if (cleaned.trim().length > 0) {
          text += cleaned + ' ';
        }
      }
    }

    // Also try to extract text between BT and ET markers (text objects)
    const btPattern = /BT\s+(.*?)\s+ET/gs;
    const btMatches = [...binaryString.matchAll(btPattern)];
    
    for (const match of btMatches) {
      const textContent = match[1];
      const innerMatches = [...textContent.matchAll(textPattern)];
      for (const inner of innerMatches) {
        if (inner[1] && inner[1].length > 1) {
          text += inner[1].replace(/\\n/g, '\n').replace(/\\\\/g, '\\') + ' ';
        }
      }
    }

    const cleanedText = text.trim();
    const wordCount = cleanedText.split(/\s+/).length;

    return new Response(
      JSON.stringify({ 
        text: cleanedText, 
        extracted: wordCount > 0,
        wordCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF parsing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
