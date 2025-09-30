import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, mimeType } = await req.json();
    
    if (!fileId) {
      throw new Error('File ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Get stored tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No Google Drive connection found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt <= new Date()) {
      console.log('Refreshing access token');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;

      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
      await supabase
        .from('google_drive_tokens')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', tokenData.id);
    }

    // Determine export format based on mime type
    let exportUrl = '';
    let exportMimeType = 'text/plain';

    if (mimeType === 'application/vnd.google-apps.document') {
      // Google Docs -> plain text
      exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      exportMimeType = 'text/plain';
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      // Google Sheets -> CSV
      exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
      exportMimeType = 'text/csv';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      // Google Slides -> plain text
      exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      exportMimeType = 'text/plain';
    } else {
      // Regular file download
      exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    // Fetch the file content
    const contentResponse = await fetch(exportUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!contentResponse.ok) {
      const error = await contentResponse.text();
      console.error('Drive API error:', error);
      throw new Error('Failed to fetch file content');
    }

    const content = await contentResponse.text();

    return new Response(
      JSON.stringify({ content, mimeType: exportMimeType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
