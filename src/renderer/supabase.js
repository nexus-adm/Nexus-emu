import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sfxvfhgcreyjckponmti.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHZmaGdjcmV5amNrcG9ubXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MTUzNTcsImV4cCI6MjA5NDM5MTM1N30.q2k8t9ozmKhCBwqVbN4A0AS57PTP5NhnHN5ca96RuLo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)