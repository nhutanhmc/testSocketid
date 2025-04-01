// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://djbyzhzkwbftikhhmkjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYnl6aHprd2JmdGlraGhta2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxODU5ODQsImV4cCI6MjA1ODc2MTk4NH0.jdJbKtD_Jw7V-nsN8EaGSRgCnBhFhCceEdJIsiLfnGA';

export const supabase = createClient(supabaseUrl, supabaseKey);
