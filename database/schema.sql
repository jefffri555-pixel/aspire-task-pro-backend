-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS push_tokens CASCADE;
DROP TABLE IF EXISTS lead_follow_ups CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;

-- Drop sequences if they exist
DROP SEQUENCE IF EXISTS task_seq;
DROP SEQUENCE IF EXISTS project_seq;

-- Create Enums
CREATE TYPE user_role AS ENUM ('manager', 'team_leader', 'staff');
CREATE TYPE task_status AS ENUM (
  'pending', 'assigned', 'in_progress', 
  'waiting_for_review', 'completed', 'rejected', 'overdue'
);
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'under_review', 'completed', 'on_hold');
CREATE TYPE lead_status AS ENUM (
  'new_lead', 'contacted', 'follow_up', 
  'interested', 'not_interested', 'booking_confirmed'
);

-- Create Sequences
CREATE SEQUENCE task_seq START WITH 1;
CREATE SEQUENCE project_seq START WITH 1;

-- 1. Departments Table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Employees) Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  designation VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  joining_date DATE DEFAULT CURRENT_DATE,
  reporting_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  performance_score DECIMAL(5,2) DEFAULT 100.00 CHECK (performance_score >= 0.00 AND performance_score <= 100.00),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id VARCHAR(50) DEFAULT ('PRJ-' || lpad(nextval('project_seq')::text, 5, '0')) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  client_name VARCHAR(150) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status project_status NOT NULL DEFAULT 'not_started',
  assigned_team_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id VARCHAR(50) DEFAULT ('TSK-' || lpad(nextval('task_seq')::text, 5, '0')) UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Task Comments Table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  audio_url TEXT,
  audio_file_name TEXT,
  audio_mime_type VARCHAR(100),
  audio_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Task Attachments Table
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_url VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Leads Table (Aspire Holidays Special Module)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  destination VARCHAR(150) NOT NULL,
  package_interested VARCHAR(200) NOT NULL,
  budget DECIMAL(12,2) NOT NULL,
  source VARCHAR(100) NOT NULL,
  status lead_status NOT NULL DEFAULT 'new_lead',
  assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lead Follow-Ups Table
CREATE TABLE lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Device Tokens Table (For Push Notifications)
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  device_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
