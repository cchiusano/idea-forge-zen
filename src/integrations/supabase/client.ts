import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gklxjxknlstdjabdypyk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHhqeGtubHN0ZGphYmR5cHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NjcwMDgsImV4cCI6MjA1MjQ0MzAwOH0.J4CnmXALlZAiJgdGWuIXeXQvIv7wEjlxtUO_mnNR7Ug";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
