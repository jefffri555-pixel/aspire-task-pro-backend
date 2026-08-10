--
-- PostgreSQL database dump
--

\restrict t89zT539KovftySdaAkF8oMyp0Z2Z2weqpLoHcmi6a3MK3JKGoPshLVjneG8mec

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.departments VALUES ('c7b07384-c113-431a-a563-3f16223405b4', 'Digital Marketing', '2026-07-24 10:47:00.676585+05:30', '2026-08-06 12:39:44.570005+05:30', true);
INSERT INTO public.departments VALUES ('4acf03c8-17b5-47b8-a93f-acd6eadf5120', 'Aspire Holidays Tiruppur', '2026-07-31 14:43:59.555147+05:30', '2026-08-06 12:40:21.760569+05:30', true);
INSERT INTO public.departments VALUES ('c7b07384-c113-431a-a563-3f16223405b2', 'Aspire Holidays Erode', '2026-07-24 10:47:00.676585+05:30', '2026-08-06 12:40:35.980178+05:30', true);
INSERT INTO public.departments VALUES ('c7b07384-c113-431a-a563-3f16223405b1', 'Aspire Holidays Chennai', '2026-07-24 10:47:00.676585+05:30', '2026-08-06 12:40:52.755517+05:30', true);
INSERT INTO public.departments VALUES ('ce406f33-3059-4e79-940e-7159d4ebece0', 'Vibhu', '2026-08-06 12:41:01.982203+05:30', '2026-08-06 12:41:01.982203+05:30', true);
INSERT INTO public.departments VALUES ('0abcc4f5-7bf3-46c4-ad2c-c4d7d4d91ec2', 'Season Bird Holidays', '2026-08-06 12:41:13.971132+05:30', '2026-08-06 12:41:13.971132+05:30', true);
INSERT INTO public.departments VALUES ('244c9027-92ad-485a-9299-bae562e771ba', 'Chit Funds', '2026-08-06 12:41:25.315917+05:30', '2026-08-06 12:41:25.315917+05:30', true);
INSERT INTO public.departments VALUES ('1e88e0d0-5aa1-4588-9aef-ce947063c3bc', 'Aspire Holidays Coimbatore', '2026-08-06 12:41:37.947798+05:30', '2026-08-06 12:41:37.947798+05:30', true);
INSERT INTO public.departments VALUES ('c7b07384-c113-431a-a563-3f16223405b3', 'Admin Staffs', '2026-07-24 10:47:00.676585+05:30', '2026-08-06 15:03:48.916179+05:30', true);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES ('d3b07384-d113-431a-a563-3f16223405c1', 'EMP-1001', 'Vivek Ravichandran', 'manager@aspire.com', '9698871715', '$2a$10$lzVNwxi6RHII3IZklD0EKeXMzDj7wwoOSJNeiZWNJFXnDt2OGiigC', 'manager', 'General Manager', 'c7b07384-c113-431a-a563-3f16223405b4', '2024-01-15', NULL, NULL, 98.50, '2026-07-24 10:47:00.695565+05:30', '2026-07-24 10:47:00.695565+05:30', 'active', NULL);
INSERT INTO public.users VALUES ('775bb52b-3617-49d3-ae99-893e36366c8a', 'EMP-1005', 'Rashi', 'rashiban15@gmail.com', '7397512447', '$2a$10$jHbh5cuAMLZUxE0ns0D4TOA/8stG0U6aQFmhQLjlULHo0oqUOiQMO', 'staff', 'Performance Marketing', 'c7b07384-c113-431a-a563-3f16223405b1', '2026-07-29', NULL, NULL, 100.00, '2026-07-29 13:21:08.291528+05:30', '2026-07-29 13:21:08.291528+05:30', 'active', NULL);
INSERT INTO public.users VALUES ('e7b07384-e113-431a-a563-3f16223405c2', 'EMP-1002', 'Karthikeyan', 'tl@aspire.com', '1111111111', '$2a$10$7uunoH6kK6nb//nS95XKp.q95.9ZGbJ37r8uoz2N8lgaT8UOUF8qa', 'team_leader', 'Sales Team Leader', 'c7b07384-c113-431a-a563-3f16223405b1', '2024-06-10', 'd3b07384-d113-431a-a563-3f16223405c1', NULL, 92.00, '2026-07-24 10:47:00.695565+05:30', '2026-08-06 12:03:34.485208+05:30', 'active', NULL);
INSERT INTO public.users VALUES ('24cd4213-a181-4b04-99f0-aa8360c9715f', 'EMP-1000', 'Administrator', 'admin@aspire.com', '9999999999', '$2a$10$wZ.11hYbytyH6w8lrdPGduDbBR5VOj6WenllFNGk8.TJCxV1H2bFS', 'admin', 'Super Admin', NULL, '2026-07-24', NULL, NULL, 100.00, '2026-07-24 14:26:12.627291+05:30', '2026-08-06 15:04:38.441486+05:30', 'active', NULL);


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.attendance VALUES ('fe0d5d1f-339a-4f03-befa-277941c44b33', '775bb52b-3617-49d3-ae99-893e36366c8a', '2026-08-08', 'present', '2026-08-08 09:00:00+05:30', '2026-08-08 18:00:00+05:30', '2026-08-08 17:22:38.878111+05:30', '2026-08-08 17:22:38.878111+05:30');


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.leads VALUES ('6c6b08f1-4fa7-470e-9cff-18dea1e76b3b', 'Amit Shah', '+919999888833', 'Europe Grand Tour', '12D/11N Swiss-Paris Family Package', 450000.00, 'Referral', 'interested', NULL, 'Interested in August travel. Family of 4.', '2026-07-24 10:47:00.734558+05:30', '2026-07-24 10:47:00.734558+05:30');
INSERT INTO public.leads VALUES ('f38bb3e2-c535-4389-93fc-a2120665c81f', 'Rajesh Kumar', '+919999888811', 'Maldives', '5D/4N Water Villa Couple Package', 150000.00, 'Website Enquiry', 'new_lead', NULL, 'Wants standard flights + villa upgrade options.', '2026-07-24 10:47:00.734558+05:30', '2026-07-24 10:47:00.734558+05:30');
INSERT INTO public.leads VALUES ('11b07384-1113-431a-a563-3f16223405f2', 'Sarah Jenkins', '+919999888822', 'Bali & Ubud', '7D/6N Honeymoon Luxury Package', 220000.00, 'Instagram Ads', 'follow_up', NULL, 'Follow up regarding customized private pool villa rates.', '2026-07-24 10:47:00.734558+05:30', '2026-07-24 10:47:00.734558+05:30');
INSERT INTO public.leads VALUES ('e375777b-7388-42e1-9755-c03f6d4cbdd2', 'Deepika Padukone', '+919999888844', 'Dubai', '4D/3N Shopping Festival Deal', 90000.00, 'Walk-in', 'booking_confirmed', NULL, 'Flight tickets and Visa generated. Invoice paid.', '2026-07-24 10:47:00.734558+05:30', '2026-07-24 10:47:00.734558+05:30');


--
-- Data for Name: lead_follow_ups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.lead_follow_ups VALUES ('795e0f32-aade-4cd2-a2fc-6015a3405c76', '11b07384-1113-431a-a563-3f16223405f2', '2026-07-23 10:47:00.742984+05:30', 'Called Sarah. She requested a detailed itinerary by tomorrow afternoon.', '2026-07-24 10:47:00.742984+05:30');
INSERT INTO public.lead_follow_ups VALUES ('c4ff84e1-6164-418a-9bb8-b61e2581c444', '11b07384-1113-431a-a563-3f16223405f2', '2026-07-25 10:47:00.742984+05:30', 'Schedule follow up call to lock down package price.', '2026-07-24 10:47:00.742984+05:30');
INSERT INTO public.lead_follow_ups VALUES ('361805a8-6460-4bd3-a7d7-b3fecb88cffb', '11b07384-1113-431a-a563-3f16223405f2', '2026-07-23 11:04:25.683782+05:30', 'Called Sarah. She requested a detailed itinerary by tomorrow afternoon.', '2026-07-24 11:04:25.683782+05:30');
INSERT INTO public.lead_follow_ups VALUES ('836de532-e4c5-48e5-a9e2-7476c73ee6b4', '11b07384-1113-431a-a563-3f16223405f2', '2026-07-25 11:04:25.683782+05:30', 'Schedule follow up call to lock down package price.', '2026-07-24 11:04:25.683782+05:30');


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.leave_requests VALUES ('3fd573f0-29db-4cfb-9e80-e84809eab045', '775bb52b-3617-49d3-ae99-893e36366c8a', 'sick', '2026-08-09', '2026-08-10', 'pending', 'Fever and cold. Need rest.', NULL, '2026-08-08 17:26:33.726838+05:30', '2026-08-08 17:26:33.726838+05:30');
INSERT INTO public.leave_requests VALUES ('5cc2d6b7-c570-4949-a8d1-b8e331b6b292', '775bb52b-3617-49d3-ae99-893e36366c8a', 'casual', '2026-08-03', '2026-08-04', 'approved', 'Family event.', NULL, '2026-08-08 17:26:33.726838+05:30', '2026-08-08 17:26:33.726838+05:30');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.notifications VALUES ('f45f6a31-2050-4fde-a733-c0a7c87e54b8', NULL, 'Welcome', 'Welcome to Aspire Task Pro Admin Dashboard!', 'system', false, '2026-07-25 12:32:58.532152+05:30');
INSERT INTO public.notifications VALUES ('1ca14a92-ad2d-4535-974e-36862bc5b470', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New User Account Created', 'Employee Rashi (staff) has been registered with ID EMP-1005.', 'new_user', false, '2026-07-29 13:21:08.979366+05:30');
INSERT INTO public.notifications VALUES ('a719a88f-ff12-47cd-b59b-b88e448525ea', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "Ads Run now" has been created and assigned.', 'new_task', false, '2026-07-29 16:13:14.435993+05:30');
INSERT INTO public.notifications VALUES ('5ae4ad80-9d07-4a12-af77-7b9c25981bb9', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "Ads Run now" has been created and assigned.', 'new_task', false, '2026-07-29 16:13:14.597922+05:30');
INSERT INTO public.notifications VALUES ('66869f4b-9830-4eb7-bb33-6bee014f6bac', 'd3b07384-d113-431a-a563-3f16223405c1', 'Task Submitted for Review', 'Task "Ads Run now" has been submitted for review.', 'task_review', false, '2026-07-30 13:24:53.427892+05:30');
INSERT INTO public.notifications VALUES ('db6f62a0-c271-4fdc-854f-ccebb87fdeaa', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "seo report where" has been created and assigned.', 'new_task', false, '2026-07-30 14:43:17.39333+05:30');
INSERT INTO public.notifications VALUES ('6af939a1-94c0-4b93-b709-611aa6af7cab', 'd3b07384-d113-431a-a563-3f16223405c1', 'Task Submitted for Review', 'Task "seo report where" has been submitted for review.', 'task_review', false, '2026-07-30 14:45:30.402073+05:30');
INSERT INTO public.notifications VALUES ('a3010dc3-fa34-438c-af80-16c94c3dffa0', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "Content Calender" has been created and assigned.', 'new_task', false, '2026-07-31 11:27:05.187061+05:30');
INSERT INTO public.notifications VALUES ('66709791-4c87-4f31-91eb-de8d9eddaa19', 'd3b07384-d113-431a-a563-3f16223405c1', 'Task Submitted for Review', 'Task "Content Calender" has been submitted for review.', 'task_review', false, '2026-07-31 14:16:57.868856+05:30');
INSERT INTO public.notifications VALUES ('29128c29-1854-4564-a81e-5f22e56af09e', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "seo" has been created and assigned.', 'new_task', false, '2026-07-31 14:42:34.471859+05:30');
INSERT INTO public.notifications VALUES ('5cbb6739-ecf6-4f2f-8c71-327da0d1cefe', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "seo" has been created and assigned.', 'new_task', false, '2026-08-03 16:53:17.870454+05:30');
INSERT INTO public.notifications VALUES ('1f01a812-6898-43bf-b608-3b7ec292a95a', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "app" has been created and assigned.', 'new_task', false, '2026-08-04 10:34:07.149209+05:30');
INSERT INTO public.notifications VALUES ('bd1baf71-e888-49b5-bc7f-22cfac620389', 'd3b07384-d113-431a-a563-3f16223405c1', 'Task Submitted for Review', 'Task "Ads Run now" has been submitted for review.', 'task_review', false, '2026-08-08 13:09:54.58575+05:30');
INSERT INTO public.notifications VALUES ('b5154f0a-6009-4df7-ba6d-5d61e41be7ec', 'd3b07384-d113-431a-a563-3f16223405c1', 'Task Submitted for Review', 'Task "Finalize Europe Summer Packages" has been submitted for review.', 'task_review', false, '2026-08-08 13:10:24.767294+05:30');
INSERT INTO public.notifications VALUES ('0df7f989-49e6-4eae-aa0f-0443bffde948', '775bb52b-3617-49d3-ae99-893e36366c8a', 'New Task Assigned', 'Task "ads" has been created and assigned.', 'new_task', false, '2026-08-08 13:15:00.931279+05:30');
INSERT INTO public.notifications VALUES ('030dd8b4-a116-49bc-a6ab-c586369d726e', 'd3b07384-d113-431a-a563-3f16223405c1', 'Task Submitted for Review', 'Task "ads" has been submitted for review.', 'task_review', false, '2026-08-08 13:15:52.004279+05:30');


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.projects VALUES ('a1b07384-a113-431a-a563-3f16223405a1', 'PRJ-00001', 'Europe Summer Extravaganza', 'Internal Promotion', '2026-07-14 10:47:00.71264+05:30', '2026-08-13 10:47:00.71264+05:30', 'high', 'in_progress', 'c7b07384-c113-431a-a563-3f16223405b1', 45, '2026-07-24 10:47:00.71264+05:30', '2026-07-24 10:47:00.71264+05:30', NULL, NULL);
INSERT INTO public.projects VALUES ('a1b07384-a113-431a-a563-3f16223405a2', 'PRJ-00002', 'Maldives Luxury Group Bookings', 'Club Mahindra Resorts', '2026-07-19 10:47:00.71264+05:30', '2026-08-08 10:47:00.71264+05:30', 'medium', 'in_progress', 'c7b07384-c113-431a-a563-3f16223405b2', 50, '2026-07-24 10:47:00.71264+05:30', '2026-07-24 10:47:00.71264+05:30', NULL, NULL);
INSERT INTO public.projects VALUES ('a1b07384-a113-431a-a563-3f16223405a3', 'PRJ-00003', 'Customer Support Portal Setup', 'Aspire Internal', '2026-07-23 10:47:00.71264+05:30', '2026-08-23 10:47:00.71264+05:30', 'low', 'not_started', 'c7b07384-c113-431a-a563-3f16223405b3', 0, '2026-07-24 10:47:00.71264+05:30', '2026-07-24 10:47:00.71264+05:30', NULL, NULL);


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: push_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.system_settings VALUES ('company_name', 'Aspire Holidays', '2026-07-25 11:47:13.949342+05:30');
INSERT INTO public.system_settings VALUES ('company_logo', '/uploads/logo_default.png', '2026-07-25 11:47:13.960608+05:30');
INSERT INTO public.system_settings VALUES ('working_hours_start', '09:00', '2026-07-25 11:47:13.962118+05:30');
INSERT INTO public.system_settings VALUES ('working_hours_end', '18:00', '2026-07-25 11:47:13.963249+05:30');
INSERT INTO public.system_settings VALUES ('password_min_length', '8', '2026-07-25 11:47:13.964747+05:30');
INSERT INTO public.system_settings VALUES ('smtp_host', 'smtp.mailtrap.io', '2026-07-25 11:47:13.966135+05:30');
INSERT INTO public.system_settings VALUES ('smtp_port', '2525', '2026-07-25 11:47:13.967433+05:30');
INSERT INTO public.system_settings VALUES ('smtp_secure', 'false', '2026-07-25 11:47:13.968647+05:30');
INSERT INTO public.system_settings VALUES ('backup_frequency', 'daily', '2026-07-25 11:47:13.969605+05:30');


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tasks VALUES ('b1b07384-b113-431a-a563-3f16223405d3', 'TSK-00003', NULL, 'Monthly GST Filing', 'Prepare and file GST reports for June bookings and generate transaction statements.', 'c7b07384-c113-431a-a563-3f16223405b4', 'low', 'completed', '2026-07-14 10:47:00.717237+05:30', '2026-07-19 10:47:00.717237+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', 'd3b07384-d113-431a-a563-3f16223405c1', 100, 'GST Filed. Ack number is GST998273612.', '2026-07-24 10:47:00.717237+05:30', '2026-07-24 10:47:00.717237+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('b1b07384-b113-431a-a563-3f16223405d4', 'TSK-00004', 'a1b07384-a113-431a-a563-3f16223405a2', 'Configure Push Notification Certificates', 'Add Firebase configuration files in the flutter project code and test iOS/Android FCM setup.', 'c7b07384-c113-431a-a563-3f16223405b2', 'high', 'pending', '2026-07-24 10:47:00.717237+05:30', '2026-07-26 10:47:00.717237+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', NULL, 0, NULL, '2026-07-24 10:47:00.717237+05:30', '2026-07-24 10:47:00.717237+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('b1b07384-b113-431a-a563-3f16223405d2', 'TSK-00002', 'a1b07384-a113-431a-a563-3f16223405a2', 'Client Booking Confirmation - Mr. Mehta', 'Follow up with hotel partners in Maldives to confirm ocean villa booking and airport transfers.', 'c7b07384-c113-431a-a563-3f16223405b2', 'medium', 'waiting_for_review', '2026-07-20 10:47:00.717237+05:30', '2026-07-24 09:47:00.717237+05:30', 'e7b07384-e113-431a-a563-3f16223405c2', NULL, 100, 'Hotel confirmed, waiting for receipt voucher upload.', '2026-07-24 10:47:00.717237+05:30', '2026-07-24 10:47:00.717237+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('adc31088-bb32-483f-8540-b5698896d025', 'TSK-00006', NULL, 'Ads Run now', 'need detailed report', 'c7b07384-c113-431a-a563-3f16223405b1', 'medium', 'completed', '2026-07-29 16:12:44.539+05:30', '2026-08-01 16:12:44.539+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-07-29 16:13:14.591277+05:30', '2026-07-30 13:25:30.070535+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('65c05f5b-8b04-49c9-a977-4aee67d1c4ae', 'TSK-00007', NULL, 'seo report where', 'epo kedaikum', 'c7b07384-c113-431a-a563-3f16223405b1', 'medium', 'completed', '2026-07-30 14:42:54.645+05:30', '2026-08-02 14:42:54.645+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-07-30 14:43:17.349591+05:30', '2026-07-30 14:47:05.081964+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('3148b8a6-3ade-4111-9e90-d4f1b483182b', 'TSK-00008', NULL, 'Content Calender', 'due today 5pm', 'c7b07384-c113-431a-a563-3f16223405b1', 'medium', 'completed', '2026-07-31 11:26:38.245+05:30', '2026-08-03 11:26:38.245+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-07-31 11:27:04.978522+05:30', '2026-07-31 14:17:22.745052+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('17bd70d7-f8ab-44a9-b961-5e3ae11e7452', 'TSK-00009', NULL, 'seo', '', NULL, 'medium', 'pending', '2026-07-31 14:42:11.686+05:30', '2026-08-03 14:42:11.686+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-07-31 14:42:34.410336+05:30', '2026-07-31 14:42:34.410336+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('81908145-8048-41e5-865a-6b3425f64629', 'TSK-00010', NULL, 'seo', '', NULL, 'medium', 'pending', '2026-08-03 16:52:33.852+05:30', '2026-08-06 16:52:33.852+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-08-03 16:53:17.434178+05:30', '2026-08-03 16:53:17.434178+05:30', NULL, NULL, NULL, NULL, '/uploads/voice/1785756197413-voice-message-1785756169916.webm', 'voice-message-1785756169916.webm', 'application/octet-stream', 9);
INSERT INTO public.tasks VALUES ('fdce2bde-f737-4d1f-8359-5e155d55bd9c', 'TSK-00011', NULL, 'app', '', NULL, 'medium', 'pending', '2026-08-04 10:32:56.881+05:30', '2026-08-07 10:32:56.881+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-08-04 10:34:06.972589+05:30', '2026-08-04 10:34:06.972589+05:30', NULL, NULL, NULL, NULL, '/uploads/voice/1785819846962-voice-message-1785819834719.webm', 'voice-message-1785819834719.webm', 'audio/webm', 8);
INSERT INTO public.tasks VALUES ('117c2a2a-6343-4a82-803b-fcb296c6d1f3', 'TSK-00005', NULL, 'Ads Run now', 'need detailed report', 'c7b07384-c113-431a-a563-3f16223405b1', 'medium', 'in_review', '2026-07-29 16:12:44.539+05:30', '2026-08-01 16:12:44.539+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-07-29 16:13:14.412258+05:30', '2026-08-08 13:09:53.48782+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('b1b07384-b113-431a-a563-3f16223405d1', 'TSK-00001', 'a1b07384-a113-431a-a563-3f16223405a1', 'Finalize Europe Summer Packages', 'Create itinerary, cost sheet, and marketing banners for Switzerland and Paris summer tours.', 'c7b07384-c113-431a-a563-3f16223405b1', 'high', 'in_review', '2026-07-22 10:47:00.717237+05:30', '2026-07-27 10:47:00.717237+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', 'e7b07384-e113-431a-a563-3f16223405c2', 45, NULL, '2026-07-24 10:47:00.717237+05:30', '2026-08-08 13:10:24.756387+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.tasks VALUES ('ad10c448-169c-43f7-b895-99eb08e2c5fb', 'TSK-00012', NULL, 'ads', 'hhh', 'c7b07384-c113-431a-a563-3f16223405b4', 'medium', 'completed', '2026-08-08 00:00:00+05:30', '2026-08-11 13:14:29.4557+05:30', 'd3b07384-d113-431a-a563-3f16223405c1', '775bb52b-3617-49d3-ae99-893e36366c8a', 0, NULL, '2026-08-08 13:15:00.743504+05:30', '2026-08-08 13:16:34.896964+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: task_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.task_attachments VALUES ('14468954-d43b-451d-b666-a32b045fa685', 'adc31088-bb32-483f-8540-b5698896d025', '/uploads/1785395838698-Rashiban_AA.BU.P2MBA26015102_MProj_report.pdf', 'Rashiban_AA.BU.P2MBA26015102_MProj_report.pdf', '775bb52b-3617-49d3-ae99-893e36366c8a', '2026-07-30 12:47:18.713072+05:30');
INSERT INTO public.task_attachments VALUES ('9072c80c-62df-4a22-8686-9831bd0400e3', 'adc31088-bb32-483f-8540-b5698896d025', '/uploads/1785395867294-WhatsApp_Image_2026-07-28_at_3.32.40_PM.jpeg', 'WhatsApp Image 2026-07-28 at 3.32.40 PM.jpeg', '775bb52b-3617-49d3-ae99-893e36366c8a', '2026-07-30 12:47:47.2998+05:30');
INSERT INTO public.task_attachments VALUES ('80814a5a-1f4e-4d62-99bf-a5abcbbb8c74', '65c05f5b-8b04-49c9-a977-4aee67d1c4ae', '/uploads/1785402924663-WhatsApp_Image_2026-07-28_at_3.32.40_PM.jpeg', 'WhatsApp Image 2026-07-28 at 3.32.40 PM.jpeg', '775bb52b-3617-49d3-ae99-893e36366c8a', '2026-07-30 14:45:24.674779+05:30');
INSERT INTO public.task_attachments VALUES ('2c4c1d45-d073-4127-9182-2f1352b4b63d', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '/uploads/1785487609501-WhatsApp_Image_2026-07-02_at_11.56.32_AM.jpeg', 'WhatsApp Image 2026-07-02 at 11.56.32 AM.jpeg', '775bb52b-3617-49d3-ae99-893e36366c8a', '2026-07-31 14:16:49.506216+05:30');
INSERT INTO public.task_attachments VALUES ('07ebbde4-ba89-4306-a8f4-62583deb7f8a', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '/uploads/1785489267059-WhatsApp_Image_2026-07-28_at_3.32.40_PM_(1).jpeg', 'WhatsApp Image 2026-07-28 at 3.32.40 PM (1).jpeg', 'd3b07384-d113-431a-a563-3f16223405c1', '2026-07-31 14:44:27.06524+05:30');


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.task_comments VALUES ('aaf57fd6-1eb0-438e-abe4-32cb341a3325', 'b1b07384-b113-431a-a563-3f16223405d1', 'e7b07384-e113-431a-a563-3f16223405c2', 'Spoke to Swiss tourism board. We will get special discount rates for group booking.', '2026-07-24 10:47:00.721737+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('06ed1aea-c562-447e-9555-8cae50e1090f', 'b1b07384-b113-431a-a563-3f16223405d1', 'd3b07384-d113-431a-a563-3f16223405c1', 'Excellent. Make sure we include family discount packages as well.', '2026-07-24 10:47:00.721737+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('b12743b4-fac7-49c2-9b5f-e0b1fd75b97d', 'b1b07384-b113-431a-a563-3f16223405d1', 'e7b07384-e113-431a-a563-3f16223405c2', 'Spoke to Swiss tourism board. We will get special discount rates for group booking.', '2026-07-24 11:04:25.653553+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('1c22529d-b7ce-4a65-b7f4-d3ab2e8b8b74', 'b1b07384-b113-431a-a563-3f16223405d1', 'd3b07384-d113-431a-a563-3f16223405c1', 'Excellent. Make sure we include family discount packages as well.', '2026-07-24 11:04:25.653553+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('7035717c-26c0-4430-b602-82f31a3cc7c3', 'b1b07384-b113-431a-a563-3f16223405d2', NULL, 'Villas are fully booked. Managed to secure a free upgrade to Water Suite.', '2026-07-24 10:47:00.721737+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('42e81acf-c41d-40c1-9c00-da0a4aabf64e', 'b1b07384-b113-431a-a563-3f16223405d2', NULL, 'Villas are fully booked. Managed to secure a free upgrade to Water Suite.', '2026-07-24 11:04:25.653553+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('481e604a-59b5-4d91-8035-4333dea99fdb', '117c2a2a-6343-4a82-803b-fcb296c6d1f3', '775bb52b-3617-49d3-ae99-893e36366c8a', 'done', '2026-07-29 16:14:41.478755+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('057afaf5-f661-403d-8d5a-fc07f11a90b4', 'adc31088-bb32-483f-8540-b5698896d025', '775bb52b-3617-49d3-ae99-893e36366c8a', 'budget evalo anna', '2026-07-29 16:24:20.51476+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('97d8e0db-5109-4d7f-b742-3f69ed8f0042', 'adc31088-bb32-483f-8540-b5698896d025', 'd3b07384-d113-431a-a563-3f16223405c1', '5000 for week', '2026-07-29 16:24:43.52048+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('5e0c7aa0-c894-43e4-b465-2bae9f85e363', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'Voice message', '2026-07-31 12:40:12.990435+05:30', 'voice', '/uploads/voice/1785481812969-voice-message-1785481812914.webm', 'voice-message-1785481812914.webm', 'application/octet-stream', 4);
INSERT INTO public.task_comments VALUES ('726d36ed-e9e8-4490-a5a9-7e9bbc819490', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'Voice message', '2026-07-31 12:40:37.06124+05:30', 'voice', '/uploads/voice/1785481837057-voice-message-1785481837035.webm', 'voice-message-1785481837035.webm', 'application/octet-stream', 5);
INSERT INTO public.task_comments VALUES ('6ea59c5c-29e9-436a-af2f-1c325dc982f7', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '775bb52b-3617-49d3-ae99-893e36366c8a', 'Voice message', '2026-07-31 12:41:43.08492+05:30', 'voice', '/uploads/voice/1785481903081-voice-message-1785481903051.webm', 'voice-message-1785481903051.webm', 'application/octet-stream', 4);
INSERT INTO public.task_comments VALUES ('259bd00f-fa6d-460b-99ab-1acc2afe0598', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'Voice message', '2026-07-31 14:15:12.360576+05:30', 'voice', '/uploads/voice/1785487512312-voice-message-1785487512116.webm', 'voice-message-1785487512116.webm', 'application/octet-stream', 7);
INSERT INTO public.task_comments VALUES ('a9f22a80-6d19-4e03-a53e-c77a56602cac', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '775bb52b-3617-49d3-ae99-893e36366c8a', 'Voice message', '2026-07-31 14:16:09.020882+05:30', 'voice', '/uploads/voice/1785487569018-voice-message-1785487569005.webm', 'voice-message-1785487569005.webm', 'application/octet-stream', 3);
INSERT INTO public.task_comments VALUES ('f0603155-eaf4-4c28-b209-6f04377bd681', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '775bb52b-3617-49d3-ae99-893e36366c8a', 'done', '2026-07-31 14:16:28.812745+05:30', 'text', NULL, NULL, NULL, NULL);
INSERT INTO public.task_comments VALUES ('ff6cee4c-d752-4ebf-aecf-e46aaa634f70', '17bd70d7-f8ab-44a9-b961-5e3ae11e7452', 'd3b07384-d113-431a-a563-3f16223405c1', 'Voice message', '2026-07-31 14:42:47.831925+05:30', 'voice', '/uploads/voice/1785489167817-voice-message-1785489167784.webm', 'voice-message-1785489167784.webm', 'application/octet-stream', 4);
INSERT INTO public.task_comments VALUES ('23eaeec2-e43f-4429-aec2-fcf08911b1d2', 'fdce2bde-f737-4d1f-8359-5e155d55bd9c', '775bb52b-3617-49d3-ae99-893e36366c8a', 'Voice message', '2026-08-04 10:35:26.311202+05:30', 'voice', '/uploads/voice/1785819926307-voice-message-1785819926288.webm', 'voice-message-1785819926288.webm', 'application/octet-stream', 5);
INSERT INTO public.task_comments VALUES ('cfee19d1-7dc3-43aa-9370-b95e7fe94804', 'ad10c448-169c-43f7-b895-99eb08e2c5fb', '775bb52b-3617-49d3-ae99-893e36366c8a', 'ghgjgh', '2026-08-08 13:15:42.870023+05:30', 'text', NULL, NULL, NULL, NULL);


--
-- Data for Name: task_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.task_history VALUES ('df64c2a1-67b5-44b3-977f-354f5f59b43f', '117c2a2a-6343-4a82-803b-fcb296c6d1f3', 'd3b07384-d113-431a-a563-3f16223405c1', 'created', NULL, 'Ads Run now', '2026-07-29 16:13:14.424446+05:30');
INSERT INTO public.task_history VALUES ('e442779c-468e-4443-9243-f7ba628f881a', 'adc31088-bb32-483f-8540-b5698896d025', 'd3b07384-d113-431a-a563-3f16223405c1', 'created', NULL, 'Ads Run now', '2026-07-29 16:13:14.595283+05:30');
INSERT INTO public.task_history VALUES ('b3b2750d-1d45-4e0a-868f-4f32b1b6aad6', 'adc31088-bb32-483f-8540-b5698896d025', '775bb52b-3617-49d3-ae99-893e36366c8a', 'Status updated', 'pending', 'in_review', '2026-07-30 13:24:53.39825+05:30');
INSERT INTO public.task_history VALUES ('cabc3422-78c4-42a7-82b3-002830340e30', 'adc31088-bb32-483f-8540-b5698896d025', 'd3b07384-d113-431a-a563-3f16223405c1', 'Status updated', 'in_review', 'completed', '2026-07-30 13:25:30.073907+05:30');
INSERT INTO public.task_history VALUES ('c68e67ce-cb3f-4aa0-bc87-03ed937cdff5', '65c05f5b-8b04-49c9-a977-4aee67d1c4ae', 'd3b07384-d113-431a-a563-3f16223405c1', 'created', NULL, 'seo report where', '2026-07-30 14:43:17.385997+05:30');
INSERT INTO public.task_history VALUES ('42959be8-269b-4a34-8f82-cba021149e22', '65c05f5b-8b04-49c9-a977-4aee67d1c4ae', '775bb52b-3617-49d3-ae99-893e36366c8a', 'Status updated', 'pending', 'in_review', '2026-07-30 14:45:30.392515+05:30');
INSERT INTO public.task_history VALUES ('c3117a86-bafa-4dda-8395-42590f673de2', '65c05f5b-8b04-49c9-a977-4aee67d1c4ae', 'd3b07384-d113-431a-a563-3f16223405c1', 'Status updated', 'in_review', 'completed', '2026-07-30 14:47:05.092377+05:30');
INSERT INTO public.task_history VALUES ('2f4cae5d-2f58-4746-937b-b6bd654e65c7', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'created', NULL, 'Content Calender', '2026-07-31 11:27:05.175486+05:30');
INSERT INTO public.task_history VALUES ('d36c3fd7-f805-4213-9e12-655f0a1465ea', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'voice_message_sent', NULL, 'Voice message sent — 7 seconds', '2026-07-31 14:15:12.550088+05:30');
INSERT INTO public.task_history VALUES ('c6e68dd8-5dd3-4b25-a342-d2c72ff5b490', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '775bb52b-3617-49d3-ae99-893e36366c8a', 'voice_message_sent', NULL, 'Voice message sent — 3 seconds', '2026-07-31 14:16:09.051311+05:30');
INSERT INTO public.task_history VALUES ('fe6cae33-0428-4dc2-b1c2-78871a5bf768', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '775bb52b-3617-49d3-ae99-893e36366c8a', 'file_uploaded', NULL, 'WhatsApp Image 2026-07-02 at 11.56.32 AM.jpeg', '2026-07-31 14:16:49.520556+05:30');
INSERT INTO public.task_history VALUES ('42e44a8b-c960-413e-83bd-1b0b92c39f82', '3148b8a6-3ade-4111-9e90-d4f1b483182b', '775bb52b-3617-49d3-ae99-893e36366c8a', 'submitted_for_review', 'pending', 'in_review', '2026-07-31 14:16:57.855206+05:30');
INSERT INTO public.task_history VALUES ('30deb17e-139b-43f7-ab25-a9e502c1dd2c', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_completed', 'in_review', 'completed', '2026-07-31 14:17:22.746508+05:30');
INSERT INTO public.task_history VALUES ('4d43b3d5-2ee1-4e58-89a1-b21f308536d6', '17bd70d7-f8ab-44a9-b961-5e3ae11e7452', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_created', NULL, 'Task created: seo', '2026-07-31 14:42:34.457719+05:30');
INSERT INTO public.task_history VALUES ('a4cbfd00-c319-4f9b-bee1-7cf53a10e3c3', '17bd70d7-f8ab-44a9-b961-5e3ae11e7452', 'd3b07384-d113-431a-a563-3f16223405c1', 'voice_message_sent', NULL, 'Voice message sent — 4 seconds', '2026-07-31 14:42:47.845779+05:30');
INSERT INTO public.task_history VALUES ('7c400a59-5b81-4dc9-8f0f-3a299bfbe226', '3148b8a6-3ade-4111-9e90-d4f1b483182b', 'd3b07384-d113-431a-a563-3f16223405c1', 'file_uploaded', NULL, 'WhatsApp Image 2026-07-28 at 3.32.40 PM (1).jpeg', '2026-07-31 14:44:27.088104+05:30');
INSERT INTO public.task_history VALUES ('d9927a05-b2d4-4383-b503-bd9a2081a958', '81908145-8048-41e5-865a-6b3425f64629', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_created', NULL, 'Task created: seo', '2026-08-03 16:53:17.853534+05:30');
INSERT INTO public.task_history VALUES ('836c9ee8-dc65-404f-abca-b9d040b7f18d', '81908145-8048-41e5-865a-6b3425f64629', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_created', NULL, 'Task created with description voice note', '2026-08-03 16:53:17.866079+05:30');
INSERT INTO public.task_history VALUES ('7f129490-8e64-4e67-be2d-eeeea8c3560c', 'fdce2bde-f737-4d1f-8359-5e155d55bd9c', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_created', NULL, 'Task created: app', '2026-08-04 10:34:07.140952+05:30');
INSERT INTO public.task_history VALUES ('1335bee5-2916-472d-b3a6-09930b8d97fc', 'fdce2bde-f737-4d1f-8359-5e155d55bd9c', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_created', NULL, 'Task created with description voice note', '2026-08-04 10:34:07.146996+05:30');
INSERT INTO public.task_history VALUES ('f9e22d7b-4656-49ed-92be-4de3bb2bc885', 'fdce2bde-f737-4d1f-8359-5e155d55bd9c', '775bb52b-3617-49d3-ae99-893e36366c8a', 'voice_message_sent', NULL, 'Voice message sent — 5 seconds', '2026-08-04 10:35:26.340277+05:30');
INSERT INTO public.task_history VALUES ('ca8d82f5-290b-4c72-8abc-d7246c531147', '117c2a2a-6343-4a82-803b-fcb296c6d1f3', 'e7b07384-e113-431a-a563-3f16223405c2', 'submitted_for_review', 'pending', 'in_review', '2026-08-08 13:09:53.525182+05:30');
INSERT INTO public.task_history VALUES ('07eeccd1-9bfe-4937-99da-f8c9989c6c4f', 'b1b07384-b113-431a-a563-3f16223405d1', 'e7b07384-e113-431a-a563-3f16223405c2', 'submitted_for_review', 'in_progress', 'in_review', '2026-08-08 13:10:24.760094+05:30');
INSERT INTO public.task_history VALUES ('713a716f-f54f-48e4-b7ac-ba062e6e0c35', 'ad10c448-169c-43f7-b895-99eb08e2c5fb', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_created', NULL, 'Task created: ads', '2026-08-08 13:15:00.815422+05:30');
INSERT INTO public.task_history VALUES ('e5ba3a5e-ab4b-4f77-a411-6c2778f7f155', 'ad10c448-169c-43f7-b895-99eb08e2c5fb', '775bb52b-3617-49d3-ae99-893e36366c8a', 'submitted_for_review', 'pending', 'in_review', '2026-08-08 13:15:51.990926+05:30');
INSERT INTO public.task_history VALUES ('901f71b9-7669-41f0-85bd-5aba3f22446a', 'ad10c448-169c-43f7-b895-99eb08e2c5fb', 'd3b07384-d113-431a-a563-3f16223405c1', 'task_completed', 'in_review', 'completed', '2026-08-08 13:16:34.903011+05:30');


--
-- Name: project_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_seq', 1, false);


--
-- Name: task_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_seq', 12, true);


--
-- PostgreSQL database dump complete
--

\unrestrict t89zT539KovftySdaAkF8oMyp0Z2Z2weqpLoHcmi6a3MK3JKGoPshLVjneG8mec

