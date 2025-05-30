import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Demo {
  id: string
  title: string
  description: string | null
  is_public: boolean
  owner_id: string
  created_at: string
  updated_at: string
  published_url: string | null
  thumbnail_url: string | null
}

export interface DemoStep {
  id: string
  demo_id: string
  title: string | null
  description: string | null
  image_url: string | null
  order_index: number
  created_at: string
  updated_at: string
  annotations: any[]
}

export interface DemoAnalytics {
  id: string
  demo_id: string
  views: number
  unique_visitors: number
  avg_time_spent: number
  created_at: string
  updated_at: string
}

export interface ShareLink {
  id: string
  demo_id: string
  token: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  view_count: number
  max_views: number | null
}

export interface DemoView {
  id: string
  demo_id: string
  share_link_id: string | null
  viewer_ip: string
  viewer_location: string | null
  viewed_at: string
  time_spent: number
  completed_steps: number
  total_steps: number
}

export interface User {
  id: string
  email: string
  role: "user" | "admin"
  created_at: string
  last_login: string | null
}

export interface PublicDemo {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  created_at: string
  steps: DemoStep[]
}
