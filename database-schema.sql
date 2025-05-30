-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create demos table
CREATE TABLE IF NOT EXISTS demos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_url TEXT,
  thumbnail_url TEXT
);

-- Create demo_steps table
CREATE TABLE IF NOT EXISTS demo_steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demo_id UUID REFERENCES demos(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  order_index INTEGER NOT NULL,
  annotations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create share_links table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demo_id UUID REFERENCES demos(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  max_views INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create demo_views table for analytics
CREATE TABLE IF NOT EXISTS demo_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demo_id UUID REFERENCES demos(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES share_links(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  viewer_location TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_spent INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0
);

-- Create demo_analytics table for aggregated data
CREATE TABLE IF NOT EXISTS demo_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demo_id UUID REFERENCES demos(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Demos policies
CREATE POLICY "Users can view own demos" ON demos
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view public demos" ON demos;
CREATE POLICY "Anyone can view public demos" ON demos
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can create demos" ON demos
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own demos" ON demos
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own demos" ON demos
  FOR DELETE USING (auth.uid() = owner_id);

-- Demo steps policies
DROP POLICY IF EXISTS "Users can view steps of accessible demos" ON demo_steps;
CREATE POLICY "Anyone can view steps of public demos" ON demo_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = demo_steps.demo_id 
      AND (demos.owner_id = auth.uid() OR demos.is_public = TRUE)
    )
  );

CREATE POLICY "Users can manage steps of own demos" ON demo_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = demo_steps.demo_id 
      AND demos.owner_id = auth.uid()
    )
  );

-- Share links policies
CREATE POLICY "Users can view share links for own demos" ON share_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = share_links.demo_id 
      AND demos.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create share links for own demos" ON share_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = share_links.demo_id 
      AND demos.owner_id = auth.uid()
    )
  );

-- Demo views policies (public for analytics)
DROP POLICY IF EXISTS "Anyone can create demo views" ON demo_views;
CREATE POLICY "Anyone can track demo views" ON demo_views
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view analytics for own demos" ON demo_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = demo_views.demo_id 
      AND demos.owner_id = auth.uid()
    )
  );

-- Demo analytics policies
CREATE POLICY "Users can view analytics for own demos" ON demo_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = demo_analytics.demo_id 
      AND demos.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update analytics for own demos" ON demo_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM demos 
      WHERE demos.id = demo_analytics.demo_id 
      AND demos.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_demos_owner_id ON demos(owner_id);
CREATE INDEX IF NOT EXISTS idx_demos_is_public ON demos(is_public);
CREATE INDEX IF NOT EXISTS idx_demo_steps_demo_id ON demo_steps(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_steps_order ON demo_steps(demo_id, order_index);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_demo_id ON share_links(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_views_demo_id ON demo_views(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_views_viewed_at ON demo_views(viewed_at);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demos_updated_at
  BEFORE UPDATE ON demos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demo_steps_updated_at
  BEFORE UPDATE ON demo_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demo_analytics_updated_at
  BEFORE UPDATE ON demo_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update demos table to make demos public by default
ALTER TABLE demos ALTER COLUMN is_public SET DEFAULT TRUE;

-- Update existing demos to be public (optional)
UPDATE demos SET is_public = TRUE WHERE is_public = FALSE;
