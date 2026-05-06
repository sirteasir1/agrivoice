-- ================================================================
-- AgriVoice — Supabase SQL Schema
-- Выполни этот SQL в Supabase SQL Editor
-- ================================================================

-- Таблица фермеров
CREATE TABLE farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Таблица сессий (токены авторизации)
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Таблица полей фермера
CREATE TABLE fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  name text NOT NULL,
  crop_type text NOT NULL,   -- пшеница / кукуруза / подсолнух / ячмень / хлопок
  area_ha numeric NOT NULL,
  location text,
  created_at timestamp DEFAULT now()
);

-- Таблица сообщений (история чата)
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('voice', 'text', 'sms', 'call')),
  created_at timestamp DEFAULT now()
);

-- Индексы для быстрых запросов
CREATE INDEX idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX idx_messages_field_id ON messages(field_id);
CREATE INDEX idx_messages_farmer_id ON messages(farmer_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_sessions_token ON sessions(token);

-- RLS отключаем для хакатона (в проде включить!)
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
