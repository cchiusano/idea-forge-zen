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

    console.log('Starting PDF text extraction...');

    // First attempt: Simple text extraction
    const binaryString = atob(pdfData);
    
    // Basic PDF text extraction - finds text objects
    const textPattern = /\(([^)]+)\)/g;
    const matches = [...binaryString.matchAll(textPattern)];
    
    let text = '';
    for (const match of matches) {
      if (match[1] && match[1].length > 1) {
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

    // Also try BT/ET markers
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
    const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;

    console.log(`Initial extraction: ${wordCount} words`);

    // Check if this appears to be an image-based PDF (low word count)
    const isImageBased = wordCount < 50;

    if (isImageBased && wordCount === 0) {
      // Completely image-based PDF - needs OCR
      return new Response(
        JSON.stringify({ 
          text: '', 
          extracted: false,
          wordCount: 0,
          method: 'none',
          needsOCR: true,
          message: 'This appears to be an image-based or scanned PDF. OCR processing is needed but not yet available in this version.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return extracted text
    return new Response(
      JSON.stringify({ 
        text: cleanedText, 
        extracted: wordCount > 0,
        wordCount,
        method: 'basic',
        needsOCR: isImageBased && wordCount < 50
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
