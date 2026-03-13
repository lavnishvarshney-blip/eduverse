-- ==========================================
-- EDUVERSE ROOT DATABASE SCHEMA (Supabase)
-- ==========================================

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    school_id TEXT,
    referral_code TEXT UNIQUE,
    tokens INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'FREE', -- FREE, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
    learning_style TEXT,
    premium_expiry TIMESTAMP WITH TIME ZONE,
    twin_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SUBJECTS TABLE
CREATE TABLE subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    difficulty TEXT,
    language TEXT DEFAULT 'en',
    syllabus_type TEXT
);

-- 3. LESSONS TABLE
CREATE TABLE lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id),
    content TEXT,
    generated_by_ai BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'en',
    career_path TEXT
);

-- 4. PROGRESS TABLE
CREATE TABLE progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    lesson_id UUID REFERENCES lessons(id),
    score INTEGER DEFAULT 0,
    completion_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_taken_seconds INTEGER,
    attempts INTEGER DEFAULT 1
);

-- 5. ASSIGNMENTS TABLE
CREATE TABLE assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    subject TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, graded
    ai_grade NUMERIC,
    feedback TEXT
);

-- 6. REFERRALS TABLE
CREATE TABLE referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID REFERENCES users(id),
    referred_id UUID REFERENCES users(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tokens_awarded INTEGER DEFAULT 0,
    milestone_reached TEXT
);

-- 7. DAILY MISSIONS TABLE
CREATE TABLE daily_missions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    mission_text TEXT NOT NULL,
    tokens_reward INTEGER DEFAULT 50,
    date DATE DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT false
);

-- 8. CAMPUS BATTLES TABLE
CREATE TABLE campus_battles (
    school_id TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0,
    month TEXT, -- e.g., '2026-03'
    rank INTEGER,
    is_winner BOOLEAN DEFAULT false
);

-- 9. AI TWIN TABLE
CREATE TABLE ai_twin (
    user_id UUID REFERENCES users(id) PRIMARY KEY,
    weak_areas TEXT[],
    learning_speed TEXT,
    best_study_time TEXT,
    explanation_style TEXT,
    knowledge_graph JSONB
);

-- Enable Row Level Security (RLS) for Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);
