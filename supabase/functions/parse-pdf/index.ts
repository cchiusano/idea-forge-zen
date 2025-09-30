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

    // Decode base64 PDF
    const binaryString = atob(pdfData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Use pdfjs with proper configuration
    const pdfjs = await import("https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs");
    
    // Disable worker for server-side rendering
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let text = '';
    const numPages = Math.min(pdf.numPages, 20); // Extract up to 20 pages
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += `\n--- Page ${i} ---\n${pageText}\n`;
    }

    return new Response(
      JSON.stringify({ 
        text: text.trim(), 
        numPages: pdf.numPages,
        extracted: numPages 
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
