-- Seed Departments
INSERT INTO departments (id, name) VALUES
('c7b07384-c113-431a-a563-3f16223405b1', 'Sales & Marketing'),
('c7b07384-c113-431a-a563-3f16223405b2', 'Operations & Bookings'),
('c7b07384-c113-431a-a563-3f16223405b3', 'Customer Support'),
('c7b07384-c113-431a-a563-3f16223405b4', 'Finance & Administration');

-- Seed Users (Password is 'password123' for all)
-- Hash: $2a$10$gPj7G6q0B1xYjC32f91G/OJdC9B6K8Vd.s7C4HwE5u8YxK6H3yOQG (standard bcrypt for 'password123')
INSERT INTO users (id, employee_id, name, email, phone, password_hash, role, designation, department_id, joining_date, reporting_manager_id, team_leader_id, performance_score) VALUES
-- Manager
('d3b07384-d113-431a-a563-3f16223405c1', 'EMP-1001', 'Vikram Malhotra', 'manager@aspire.com', '+919876543210', '$2a$10$gPj7G6q0B1xYjC32f91G/OJdC9B6K8Vd.s7C4HwE5u8YxK6H3yOQG', 'manager', 'General Manager', 'c7b07384-c113-431a-a563-3f16223405b4', '2024-01-15', NULL, NULL, 98.50),

-- Team Leader (Reports to Vikram)
('e7b07384-e113-431a-a563-3f16223405c2', 'EMP-1002', 'Anjali Sharma', 'tl@aspire.com', '+919876543211', '$2a$10$gPj7G6q0B1xYjC32f91G/OJdC9B6K8Vd.s7C4HwE5u8YxK6H3yOQG', 'team_leader', 'Sales Team Leader', 'c7b07384-c113-431a-a563-3f16223405b1', '2024-06-10', 'd3b07384-d113-431a-a563-3f16223405c1', NULL, 92.00),

-- Staff 1 (Reports to Anjali & Vikram)
('f7b07384-f113-431a-a563-3f16223405c3', 'EMP-1003', 'Rohan Das', 'staff@aspire.com', '+919876543212', '$2a$10$gPj7G6q0B1xYjC32f91G/OJdC9B6K8Vd.s7C4HwE5u8YxK6H3yOQG', 'staff', 'Senior Sales Executive', 'c7b07384-c113-431a-a563-3f16223405b1', '2025-01-10', 'd3b07384-d113-431a-a563-3f16223405c1', 'e7b07384-e113-431a-a563-3f16223405c2', 88.00),

-- Staff 2 (Reports to Anjali & Vikram)
('a7b07384-a113-431a-a563-3f16223405c4', 'EMP-1004', 'Pooja Nair', 'pooja@aspire.com', '+919876543213', '$2a$10$gPj7G6q0B1xYjC32f91G/OJdC9B6K8Vd.s7C4HwE5u8YxK6H3yOQG', 'staff', 'Operations Associate', 'c7b07384-c113-431a-a563-3f16223405b2', '2025-02-01', 'd3b07384-d113-431a-a563-3f16223405c1', 'e7b07384-e113-431a-a563-3f16223405c2', 85.50);

-- Seed Projects
INSERT INTO projects (id, project_id, name, client_name, start_date, due_date, priority, status, assigned_team_id, progress_percentage) VALUES
('a1b07384-a113-431a-a563-3f16223405a1', 'PRJ-00001', 'Europe Summer Extravaganza', 'Internal Promotion', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'high', 'in_progress', 'c7b07384-c113-431a-a563-3f16223405b1', 45),
('a1b07384-a113-431a-a563-3f16223405a2', 'PRJ-00002', 'Maldives Luxury Group Bookings', 'Club Mahindra Resorts', NOW() - INTERVAL '5 days', NOW() + INTERVAL '15 days', 'medium', 'in_progress', 'c7b07384-c113-431a-a563-3f16223405b2', 50),
('a1b07384-a113-431a-a563-3f16223405a3', 'PRJ-00003', 'Customer Support Portal Setup', 'Aspire Internal', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'low', 'not_started', 'c7b07384-c113-431a-a563-3f16223405b3', 0);

-- Seed Tasks
INSERT INTO tasks (id, task_id, project_id, title, description, department_id, priority, status, start_date, due_date, assigned_by, assigned_to, progress_percentage, completion_notes) VALUES
('b1b07384-b113-431a-a563-3f16223405d1', 'TSK-00001', 'a1b07384-a113-431a-a563-3f16223405a1', 'Finalize Europe Summer Packages', 'Create itinerary, cost sheet, and marketing banners for Switzerland and Paris summer tours.', 'c7b07384-c113-431a-a563-3f16223405b1', 'high', 'in_progress', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', 'd3b07384-d113-431a-a563-3f16223405c1', 'e7b07384-e113-431a-a563-3f16223405c2', 45, NULL),
('b1b07384-b113-431a-a563-3f16223405d2', 'TSK-00002', 'a1b07384-a113-431a-a563-3f16223405a2', 'Client Booking Confirmation - Mr. Mehta', 'Follow up with hotel partners in Maldives to confirm ocean villa booking and airport transfers.', 'c7b07384-c113-431a-a563-3f16223405b2', 'medium', 'waiting_for_review', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 hour', 'e7b07384-e113-431a-a563-3f16223405c2', 'f7b07384-f113-431a-a563-3f16223405c3', 100, 'Hotel confirmed, waiting for receipt voucher upload.'),
('b1b07384-b113-431a-a563-3f16223405d3', 'TSK-00003', NULL, 'Monthly GST Filing', 'Prepare and file GST reports for June bookings and generate transaction statements.', 'c7b07384-c113-431a-a563-3f16223405b4', 'low', 'completed', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', 'd3b07384-d113-431a-a563-3f16223405c1', 'd3b07384-d113-431a-a563-3f16223405c1', 100, 'GST Filed. Ack number is GST998273612.'),
('b1b07384-b113-431a-a563-3f16223405d4', 'TSK-00004', 'a1b07384-a113-431a-a563-3f16223405a2', 'Configure Push Notification Certificates', 'Add Firebase configuration files in the flutter project code and test iOS/Android FCM setup.', 'c7b07384-c113-431a-a563-3f16223405b2', 'high', 'pending', NOW(), NOW() + INTERVAL '2 days', 'd3b07384-d113-431a-a563-3f16223405c1', 'a7b07384-a113-431a-a563-3f16223405c4', 0, NULL);

-- Seed Comments
INSERT INTO task_comments (id, task_id, user_id, comment) VALUES
(uuid_generate_v4(), 'b1b07384-b113-431a-a563-3f16223405d1', 'e7b07384-e113-431a-a563-3f16223405c2', 'Spoke to Swiss tourism board. We will get special discount rates for group booking.'),
(uuid_generate_v4(), 'b1b07384-b113-431a-a563-3f16223405d1', 'd3b07384-d113-431a-a563-3f16223405c1', 'Excellent. Make sure we include family discount packages as well.'),
(uuid_generate_v4(), 'b1b07384-b113-431a-a563-3f16223405d2', 'f7b07384-f113-431a-a563-3f16223405c3', 'Villas are fully booked. Managed to secure a free upgrade to Water Suite.');

-- Seed Leads
INSERT INTO leads (id, lead_name, mobile_number, destination, package_interested, budget, source, status, assigned_staff_id, notes) VALUES
(uuid_generate_v4(), 'Rajesh Kumar', '+919999888811', 'Maldives', '5D/4N Water Villa Couple Package', 150000.00, 'Website Enquiry', 'new_lead', 'f7b07384-f113-431a-a563-3f16223405c3', 'Wants standard flights + villa upgrade options.'),
('11b07384-1113-431a-a563-3f16223405f2', 'Sarah Jenkins', '+919999888822', 'Bali & Ubud', '7D/6N Honeymoon Luxury Package', 220000.00, 'Instagram Ads', 'follow_up', 'f7b07384-f113-431a-a563-3f16223405c3', 'Follow up regarding customized private pool villa rates.'),
(uuid_generate_v4(), 'Amit Shah', '+919999888833', 'Europe Grand Tour', '12D/11N Swiss-Paris Family Package', 450000.00, 'Referral', 'interested', 'a7b07384-a113-431a-a563-3f16223405c4', 'Interested in August travel. Family of 4.'),
(uuid_generate_v4(), 'Deepika Padukone', '+919999888844', 'Dubai', '4D/3N Shopping Festival Deal', 90000.00, 'Walk-in', 'booking_confirmed', 'f7b07384-f113-431a-a563-3f16223405c3', 'Flight tickets and Visa generated. Invoice paid.');

-- Seed Lead Followups
INSERT INTO lead_follow_ups (id, lead_id, follow_up_date, notes) VALUES
(uuid_generate_v4(), '11b07384-1113-431a-a563-3f16223405f2', NOW() - INTERVAL '1 day', 'Called Sarah. She requested a detailed itinerary by tomorrow afternoon.'),
(uuid_generate_v4(), '11b07384-1113-431a-a563-3f16223405f2', NOW() + INTERVAL '1 day', 'Schedule follow up call to lock down package price.');
