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
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const url = new URL(req.url);

    // Handle Google OAuth callback (GET with ?code=...)
    if (req.method === 'GET') {
      const code = url.searchParams.get('code');
      const errorParam = url.searchParams.get('error');

      if (errorParam) {
        const html = `<!doctype html><html><body>
<script>if (window.opener){window.opener.postMessage({type:'drive-auth', status:'error', error: '${errorParam}'}, '*');} window.close();</script>
<p>Authorization cancelled. You can close this window.</p>
</body></html>`;
        return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
      }

      if (!code) {
        const html = `<!doctype html><html><body>
<script>if (window.opener){window.opener.postMessage({type:'drive-auth', status:'error', error: 'missing_code'}, '*');} window.close();</script>
<p>Missing authorization code.</p>
</body></html>`;
        return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
      }

      const redirectUri = `${supabaseUrl}/functions/v1/google-drive-auth`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errTxt = await tokenResponse.text();
        console.error('Token exchange failed:', errTxt);
        const html = `<!doctype html><html><body>
<script>if (window.opener){window.opener.postMessage({type:'drive-auth', status:'error', error: 'token_exchange_failed'}, '*');} window.close();</script>
<p>Token exchange failed.</p>
</body></html>`;
        return new Response(html, { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
      }

      const tokens = await tokenResponse.json();

      const supabase = createClient(supabaseUrl!, supabaseKey!);
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      const { error: dbError } = await supabase
        .from('google_drive_tokens')
        .insert({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: expiresAt.toISOString(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
        const html = `<!doctype html><html><body>
<script>if (window.opener){window.opener.postMessage({type:'drive-auth', status:'error', error: 'db_error'}, '*');} window.close();</script>
<p>Failed to store tokens.</p>
</body></html>`;
        return new Response(html, { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
      }

      const successHtml = `<!doctype html><html><head><title>Connected</title></head><body>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'drive-auth', status: 'success' }, '*');
    }
  } catch (e) {
    console.error('postMessage failed:', e);
  }
  setTimeout(() => {
    window.close();
    // Fallback if close doesn't work
    setTimeout(() => {
      document.body.innerHTML = '<p style="font-family: sans-serif; padding: 20px; text-align: center;">✓ Connected successfully!<br><br>You can close this window.</p>';
    }, 100);
  }, 500);
</script>
<p style="font-family: sans-serif; padding: 20px; text-align: center;">✓ Connecting...</p>
</body></html>`;
      return new Response(successHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
    }

    // Handle POST actions from app (init auth or manual callback)
    const { code, action } = await req.json().catch(() => ({ }));

    if (action === 'init') {
      const redirectUri = `${supabaseUrl}/functions/v1/google-drive-auth`;
      const scope = 'https://www.googleapis.com/auth/drive.readonly';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback' && code) {
      const redirectUri = `${supabaseUrl}/functions/v1/google-drive-auth`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();
      const supabase = createClient(supabaseUrl!, supabaseKey!);
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      const { error: dbError } = await supabase
        .from('google_drive_tokens')
        .insert({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: expiresAt.toISOString(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to store tokens');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request');

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
