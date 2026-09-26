-- ================================================================
-- AgriVoice — Supabase SQL Schema (v2)
-- Выполни этот SQL целиком в Supabase SQL Editor нового проекта
-- ================================================================

-- Таблица фермеров
CREATE TABLE farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Таблица сессий (токены авторизации)
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Таблица полей фермера
CREATE TABLE fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  name text NOT NULL,
  crop_type text NOT NULL,   -- пшеница / кукуруза / подсолнух / ячмень / хлопок
  area_ha numeric NOT NULL,
  location text,             -- используется для прогноза погоды (Open-Meteo)
  created_at timestamptz DEFAULT now()
);

-- Таблица сообщений (история чата)
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  field_id uuid REFERENCES fields(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('voice', 'text', 'sms', 'call')),
  created_at timestamptz DEFAULT now()
);

-- Индексы под реальные запросы приложения
CREATE INDEX idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX idx_messages_field_created ON messages(field_id, created_at DESC);          -- история чата
CREATE INDEX idx_messages_farmer_role_created ON messages(farmer_id, role, created_at DESC); -- дашборд и статистика
CREATE INDEX idx_sessions_token ON sessions(token);

-- RLS отключаем для MVP (в проде включить и писать политики!)
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
