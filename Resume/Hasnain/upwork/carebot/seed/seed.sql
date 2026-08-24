-- ============================================================
-- CareBot Seed Data — City Health Clinic, Lahore
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================================

-- ============================================================
-- 1. Clinic
-- ============================================================
INSERT INTO clinics (id, name, address, phone, email, operating_hours) VALUES
('a0000000-0000-0000-0000-000000000001',
 'City Health Clinic',
 '45-B Main Boulevard, Gulberg III, Lahore, Punjab, Pakistan',
 '+92-42-35761234',
 'info@cityhealthclinic.pk',
 '{
   "monday":    {"open": "08:00", "close": "20:00"},
   "tuesday":   {"open": "08:00", "close": "20:00"},
   "wednesday": {"open": "08:00", "close": "20:00"},
   "thursday":  {"open": "08:00", "close": "20:00"},
   "friday":    {"open": "08:00", "close": "20:00"},
   "saturday":  {"open": "09:00", "close": "14:00"},
   "sunday":    null
 }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Departments
-- ============================================================
INSERT INTO departments (id, clinic_id, name, description) VALUES
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'General Medicine', 'Primary care for adults including routine checkups, chronic disease management, and acute illness treatment.'),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'Cardiology', 'Diagnosis and treatment of heart and cardiovascular conditions including hypertension, arrhythmias, and heart failure.'),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'Dermatology', 'Treatment of skin, hair, and nail conditions including eczema, acne, psoriasis, and allergic skin reactions.'),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'Pediatrics', 'Healthcare for infants, children, and adolescents including vaccinations, growth monitoring, and childhood illnesses.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Doctors
-- ============================================================
INSERT INTO doctors (id, clinic_id, department_id, name, specialization, qualification, bio, available_days, slot_duration_min, slots_start, slots_end, consultation_fee, is_active) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000001',
 'Dr. Ahmed Khan', 'General Medicine', 'MBBS, FCPS (Medicine)',
 'Dr. Ahmed Khan has 15 years of experience in general medicine. He specializes in managing diabetes, hypertension, and respiratory infections.',
 ARRAY['monday','tuesday','wednesday','thursday','friday'], 30, '09:00', '17:00', 2000.00, true),

('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000002',
 'Dr. Fatima Naz', 'Cardiology', 'MBBS, FCPS (Cardiology), MRCP',
 'Dr. Fatima Naz is a board-certified cardiologist with expertise in preventive cardiology, echocardiography, and heart failure management.',
 ARRAY['monday','wednesday','friday'], 30, '10:00', '16:00', 3000.00, true),

('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000003',
 'Dr. Omar Rashid', 'Dermatology', 'MBBS, FCPS (Dermatology)',
 'Dr. Omar Rashid treats a wide range of skin conditions including eczema, psoriasis, acne, and allergic dermatitis. He also offers cosmetic dermatology consultations.',
 ARRAY['tuesday','thursday','saturday'], 20, '09:00', '14:00', 2500.00, true),

('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000004',
 'Dr. Ayesha Malik', 'Pediatrics', 'MBBS, FCPS (Pediatrics)',
 'Dr. Ayesha Malik specializes in childhood illnesses, vaccinations, growth monitoring, and pediatric asthma management. She has a gentle approach with young patients.',
 ARRAY['monday','tuesday','wednesday','thursday'], 30, '09:00', '15:00', 1800.00, true),

('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000001',
 'Dr. Hassan Ali', 'General Medicine', 'MBBS, MCPS (Medicine)',
 'Dr. Hassan Ali provides evening general medicine consultations. He has a focus on preventive healthcare and chronic pain management.',
 ARRAY['monday','wednesday','friday'], 30, '14:00', '20:00', 2000.00, true),

('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'd0000000-0000-0000-0000-000000000002',
 'Dr. Sana Iqbal', 'Cardiology', 'MBBS, FCPS (Cardiology), PhD',
 'Dr. Sana Iqbal is a senior cardiologist specializing in interventional cardiology, ECG interpretation, and lipid management. She runs the cardiac risk assessment clinic.',
 ARRAY['tuesday','thursday'], 45, '09:00', '13:00', 3500.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Patients
-- ============================================================

-- Reset sequence for idempotent re-runs
SELECT setval('patient_number_seq', 8, true);

INSERT INTO patients (id, clinic_id, patient_number, name, email, phone, date_of_birth, gender, blood_type, address, allergies, chronic_conditions, emergency_contact, insurance) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'CH-0001', 'Hamza Tariq', 'hamza@email.com', '+92-300-1234567',
 '1981-03-15', 'male', 'A+',
 '12 Street 5, Model Town, Lahore',
 ARRAY['Penicillin'], ARRAY['Type 2 Diabetes','Hypertension'],
 '{"name": "Sara Tariq", "relationship": "Wife", "phone": "+92-300-7654321"}'::jsonb,
 '{"provider": "State Life Insurance", "policy_number": "SL-20210045", "coverage": "Outpatient + Labs"}'::jsonb),

('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'CH-0002', 'Aisha Bibi', 'aisha@email.com', '+92-321-2345678',
 '1990-07-22', 'female', 'B+',
 '78 Faisal Town, Lahore',
 ARRAY['Sulfa drugs'], ARRAY['Pregnancy','Anemia'],
 '{"name": "Bilal Ahmed", "relationship": "Husband", "phone": "+92-321-8765432"}'::jsonb,
 '{"provider": "EFU Life", "policy_number": "EFU-20230112", "coverage": "Maternity + Labs"}'::jsonb),

('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'CH-0003', 'Tariq Mehmood', 'tariq@email.com', '+92-333-3456789',
 '1965-11-08', 'male', 'O+',
 '23 Johar Town, Block F, Lahore',
 NULL, ARRAY['Heart Disease','High Cholesterol'],
 '{"name": "Nasreen Mehmood", "relationship": "Wife", "phone": "+92-333-9876543"}'::jsonb,
 '{"provider": "Jubilee Insurance", "policy_number": "JI-20190078", "coverage": "Full Coverage"}'::jsonb),

('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'CH-0004', 'Zainab Fatima', 'zainab.parent@email.com', '+92-345-4567890',
 '2015-04-12', 'female', 'AB+',
 '56 DHA Phase 5, Lahore',
 NULL, ARRAY['Asthma'],
 '{"name": "Fatima Zahra", "relationship": "Mother", "phone": "+92-345-0987654"}'::jsonb,
 '{"provider": "Adamjee Insurance", "policy_number": "AI-20240034", "coverage": "Pediatric Plan"}'::jsonb),

('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'CH-0005', 'Ali Raza', 'ali.raza@email.com', '+92-311-5678901',
 '1975-09-30', 'male', 'B-',
 '90 Garden Town, Lahore',
 NULL, ARRAY['Chronic Back Pain','Kidney Stones'],
 '{"name": "Noor Raza", "relationship": "Wife", "phone": "+92-311-1098765"}'::jsonb,
 NULL),

('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'CH-0006', 'Nadia Hassan', 'nadia@email.com', '+92-322-6789012',
 '1988-01-25', 'female', 'A-',
 '34 Cantt Area, Lahore',
 NULL, ARRAY['Thyroid Disorder','PCOS'],
 '{"name": "Asif Hassan", "relationship": "Husband", "phone": "+92-322-2109876"}'::jsonb,
 '{"provider": "Allianz EFU", "policy_number": "AE-20220067", "coverage": "Outpatient"}'::jsonb),

('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'CH-0007', 'Rabia Khan', 'rabia@email.com', '+92-302-7890123',
 '1995-06-18', 'female', 'O-',
 '67 Iqbal Town, Lahore',
 ARRAY['Dust Mites','Pollen'], ARRAY['Eczema','Seasonal Allergies'],
 '{"name": "Imran Khan", "relationship": "Father", "phone": "+92-302-3210987"}'::jsonb,
 NULL),

('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
 'CH-0008', 'Usman Ahmed', 'usman@email.com', '+92-313-8901234',
 '2000-12-05', 'male', 'AB-',
 '15 Wapda Town, Lahore',
 NULL, NULL,
 '{"name": "Ahmed Usman", "relationship": "Father", "phone": "+92-313-4321098"}'::jsonb,
 NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Staff
-- ============================================================
INSERT INTO staff (id, clinic_id, name, email, password_hash, role, is_active) VALUES
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'Admin User', 'admin@carebot.pk',
 '$2b$12$placeholder_hash_for_demo', 'admin', true),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'Receptionist', 'reception@carebot.pk',
 '$2b$12$placeholder_hash_for_demo', 'receptionist', true),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'Lab Technician', 'lab@carebot.pk',
 '$2b$12$placeholder_hash_for_demo', 'lab_technician', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Appointments (30 total)
--    20 completed, 5 scheduled, 3 cancelled, 2 no_show
-- ============================================================

-- Use a fixed UUID pattern: f1000000-...-00000000000N for appointments

-- --- 20 COMPLETED appointments (past 2 months) ---
INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, duration_min, status, reason) VALUES
-- Hamza - General Medicine (Dr. Ahmed Khan)
('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '2026-06-02', '09:00', 30, 'completed', 'Diabetes follow-up and blood sugar review'),
('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '2026-06-23', '10:00', 30, 'completed', 'Blood pressure monitoring and medication adjustment'),
('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '2026-07-14', '09:30', 30, 'completed', 'Lab results review — HbA1c and lipid panel'),

-- Aisha - General Medicine (Dr. Ahmed Khan) then Cardiology (Dr. Fatima Naz)
('f1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 '2026-06-05', '11:00', 30, 'completed', 'Prenatal checkup — first trimester'),
('f1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 '2026-07-03', '11:30', 30, 'completed', 'Anemia follow-up and iron levels check'),

-- Tariq - Cardiology (Dr. Fatima Naz and Dr. Sana Iqbal)
('f1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
 '2026-06-04', '10:30', 30, 'completed', 'Cardiac risk assessment and lipid review'),
('f1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006',
 '2026-06-17', '09:45', 45, 'completed', 'ECG and detailed cardiac evaluation'),
('f1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
 '2026-07-09', '11:00', 30, 'completed', 'Cholesterol medication review and follow-up'),

-- Zainab - Pediatrics (Dr. Ayesha Malik)
('f1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
 '2026-06-09', '09:00', 30, 'completed', 'Asthma flare-up — coughing and wheezing'),
('f1000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
 '2026-07-07', '10:00', 30, 'completed', 'Asthma control review and inhaler technique'),

-- Ali - General Medicine (Dr. Hassan Ali)
('f1000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
 '2026-06-11', '14:30', 30, 'completed', 'Lower back pain — worsening over 2 weeks'),
('f1000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
 '2026-07-02', '15:00', 30, 'completed', 'Kidney stone pain management follow-up'),

-- Nadia - General Medicine (Dr. Ahmed Khan) for thyroid
('f1000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
 '2026-06-12', '14:00', 30, 'completed', 'Thyroid medication dosage adjustment'),
('f1000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
 '2026-07-10', '14:30', 30, 'completed', 'PCOS symptoms follow-up and weight management'),

-- Rabia - Dermatology (Dr. Omar Rashid)
('f1000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
 '2026-06-10', '09:20', 20, 'completed', 'Eczema flare-up on arms and legs'),
('f1000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
 '2026-07-08', '10:00', 20, 'completed', 'Seasonal allergy skin reaction follow-up'),

-- Usman - General Medicine (Dr. Hassan Ali)
('f1000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000005',
 '2026-06-16', '16:00', 30, 'completed', 'Sports injury — twisted ankle during cricket'),

-- Additional completed appointments to reach 20
('f1000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
 '2026-07-16', '10:30', 30, 'completed', 'Cardiovascular risk screening — diabetic patient'),
('f1000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
 '2026-07-21', '09:00', 30, 'completed', 'Kidney stone follow-up and urology referral'),
('f1000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004',
 '2026-07-22', '11:00', 30, 'completed', 'General health checkup — pre-sports clearance')
ON CONFLICT (id) DO NOTHING;

-- --- 5 SCHEDULED appointments (next 2 weeks) ---
INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, duration_min, status, reason) VALUES
('f1000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '2026-08-04', '09:00', 30, 'scheduled', 'Quarterly diabetes review and HbA1c recheck'),
('f1000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
 '2026-08-06', '10:00', 30, 'scheduled', 'Lipid panel review and medication adjustment'),
('f1000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
 '2026-08-05', '09:30', 30, 'scheduled', 'Routine asthma control checkup'),
('f1000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
 '2026-08-07', '09:40', 20, 'scheduled', 'Eczema treatment plan review'),
('f1000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 '2026-08-11', '11:00', 30, 'scheduled', 'Prenatal checkup — second trimester')
ON CONFLICT (id) DO NOTHING;

-- --- 3 CANCELLED appointments ---
INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, duration_min, status, reason, cancellation_reason) VALUES
('f1000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
 '2026-06-19', '15:00', 30, 'cancelled', 'Thyroid follow-up',
 'Patient requested cancellation due to travel plans'),
('f1000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000005',
 '2026-07-04', '14:00', 30, 'cancelled', 'General checkup',
 'Clinic closed for public holiday'),
('f1000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
 '2026-07-18', '15:30', 30, 'cancelled', 'Back pain consultation',
 'Patient feeling better, no longer needs appointment')
ON CONFLICT (id) DO NOTHING;

-- --- 2 NO-SHOW appointments ---
INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, duration_min, status, reason) VALUES
('f1000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
 '2026-06-25', '10:00', 30, 'no_show', 'Kidney stone pain evaluation'),
('f1000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000005',
 '2026-07-11', '17:00', 30, 'no_show', 'Follow-up ankle injury')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. Visit Notes (20 — one per completed appointment)
-- ============================================================
INSERT INTO visit_notes (id, appointment_id, doctor_id, chief_complaint, examination_findings, diagnosis, treatment_plan, follow_up_instructions, follow_up_days) VALUES

-- Appt 1: Hamza — diabetes follow-up
('d1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'Patient presents for routine diabetes follow-up. Reports increased thirst and frequent urination over past 2 weeks.',
 'BP 140/90 mmHg, Weight 82 kg, BMI 27.1. Fasting glucose elevated at 145 mg/dL. Feet examination normal, no ulcers or neuropathy signs.',
 'Type 2 Diabetes Mellitus — suboptimal glycemic control. Stage 1 Hypertension.',
 'Continue Metformin 500mg BD. Add Lisinopril 10mg OD for blood pressure. Order HbA1c and fasting glucose. Dietary counseling: reduce refined carbs, increase fiber.',
 'Return in 3 weeks for lab results review. Monitor blood sugar at home twice daily. Report any dizziness or persistent headaches.',
 21),

-- Appt 2: Hamza — BP monitoring
('d1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002',
 'b0000000-0000-0000-0000-000000000001',
 'Follow-up for hypertension management. Patient started Lisinopril 3 weeks ago.',
 'BP 132/85 mmHg (improved from 140/90). No dizziness or cough. Pedal edema absent. Heart sounds normal.',
 'Hypertension — responding to treatment. Type 2 Diabetes Mellitus.',
 'Continue Lisinopril 10mg OD. Continue Metformin 500mg BD. Recheck BP in 3 weeks.',
 'Monitor BP at home. Low-sodium diet. Walk 30 minutes daily.',
 21),

-- Appt 3: Hamza — lab review
('d1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000001',
 'Patient here for lab results review. HbA1c and lipid panel results available.',
 'BP 128/82 mmHg. Weight 81 kg. HbA1c 6.5% (borderline). LDL 140 mg/dL elevated. HDL 45 mg/dL acceptable.',
 'Type 2 Diabetes — borderline control (HbA1c 6.5%). Dyslipidemia — elevated LDL cholesterol.',
 'Continue current medications. Consider adding statin if LDL does not improve with lifestyle changes. Increase physical activity to 45 min/day. Recheck lipid panel in 3 months.',
 'Dietary modifications: reduce saturated fats, increase omega-3. Follow up in 3 weeks.',
 21),

-- Appt 4: Aisha — prenatal
('d1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000001',
 'First prenatal visit. Patient is 10 weeks pregnant. Complains of morning sickness and fatigue.',
 'BP 110/70 mmHg, Weight 58 kg. Uterus palpable. FHR not yet detectable. Mild pallor noted.',
 'Intrauterine pregnancy — 10 weeks. Mild iron-deficiency anemia.',
 'Start Folic Acid 5mg OD. Start Iron Supplement 200mg OD. Start Calcium 500mg BD. Order CBC and blood group. Anti-emetic (Pyridoxine) PRN for morning sickness.',
 'Return in 4 weeks for follow-up. Report any bleeding or severe abdominal pain immediately.',
 28),

-- Appt 5: Aisha — anemia follow-up
('d1000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000005',
 'b0000000-0000-0000-0000-000000000001',
 'Anemia follow-up. Patient reports improved energy but still some fatigue.',
 'BP 108/68 mmHg, Weight 60 kg. Pallor improved. Hemoglobin 9.8 g/dL (up from 8.5). No edema.',
 'Iron-deficiency anemia — improving. Pregnancy progressing normally at 14 weeks.',
 'Continue Iron Supplement 200mg OD. Continue Folic Acid and Calcium. Order OGTT for gestational diabetes screening.',
 'Eat iron-rich foods (spinach, lentils, red meat). Take iron with vitamin C for better absorption. Return in 3 weeks.',
 21),

-- Appt 6: Tariq — cardiac risk assessment
('d1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006',
 'b0000000-0000-0000-0000-000000000002',
 'Patient presents for cardiac risk assessment. Family history of heart disease. Complains of occasional chest tightness during exertion.',
 'BP 150/95 mmHg. Heart rate 82 bpm regular. Heart sounds S1 S2 normal, no murmurs. BMI 29.3. Peripheral pulses palpable.',
 'Hypertensive heart disease. Dyslipidemia. High cardiovascular risk (Framingham score >20%).',
 'Start Atorvastatin 20mg at bedtime. Start Aspirin 75mg OD. Start Amlodipine 5mg OD. Order lipid panel and ECG.',
 'Low-fat diet, reduce salt intake. Stop smoking (counseled). Exercise moderately — walking 30 min daily. Return in 2 weeks for ECG results.',
 14),

-- Appt 7: Tariq — ECG evaluation
('d1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007',
 'b0000000-0000-0000-0000-000000000006',
 'ECG evaluation follow-up. Patient reports chest tightness reduced since starting medication.',
 'BP 138/88 mmHg (improved). ECG: sinus rhythm, rate 76 bpm, left ventricular hypertrophy pattern. No ST changes.',
 'Left ventricular hypertrophy secondary to longstanding hypertension. Dyslipidemia under treatment.',
 'Continue Atorvastatin, Aspirin, Amlodipine. Add Losartan 50mg OD for LVH regression. Order echocardiogram in 3 months.',
 'Monitor BP daily. Report any chest pain, shortness of breath, or palpitations immediately. Return in 4 weeks.',
 28),

-- Appt 8: Tariq — cholesterol review
('d1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008',
 'b0000000-0000-0000-0000-000000000002',
 'Follow-up for lipid management. Patient on Atorvastatin 20mg for 5 weeks.',
 'BP 134/84 mmHg. Weight stable. No muscle pain or weakness (statin side effects). Lipid panel: total cholesterol 260, LDL 180 (still elevated).',
 'Dyslipidemia — inadequate response to Atorvastatin 20mg. Persistent elevated LDL.',
 'Increase Atorvastatin to 40mg at bedtime. Continue other medications. Recheck lipid panel in 6 weeks. Reinforce dietary changes.',
 'Strict low-fat diet. Avoid processed foods. Increase fiber intake. Return in 6 weeks with fasting lipid panel.',
 42),

-- Appt 9: Zainab — asthma flare-up
('d1000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009',
 'b0000000-0000-0000-0000-000000000004',
 'Mother reports child has been coughing and wheezing for 3 days. Worsens at night. Triggered by dust exposure during home renovation.',
 'Temperature 37.2C. Respiratory rate 28/min. Bilateral expiratory wheeze. O2 sat 96%. No intercostal recession. Active child.',
 'Acute asthma exacerbation — mild to moderate. Triggered by dust exposure.',
 'Salbutamol inhaler 2 puffs PRN (max 4-hourly). Start Montelukast 5mg OD at bedtime. Nebulization with Salbutamol in clinic. Avoid dust triggers.',
 'Keep child away from dust and paint fumes. Use inhaler with spacer. If breathing worsens or child becomes lethargic, go to ER immediately. Return in 1 week.',
 7),

-- Appt 10: Zainab — asthma control review
('d1000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000004',
 'Follow-up asthma review. Mother reports wheezing has stopped. Using inhaler 1-2 times per week.',
 'Chest clear. No wheeze. O2 sat 99%. Peak flow 85% predicted for age. Well-appearing child.',
 'Asthma — well controlled on current regimen.',
 'Continue Montelukast 5mg OD. Continue Salbutamol inhaler PRN. No step-up needed. Review in 2 months.',
 'Keep asthma action plan. Avoid known triggers (dust, smoke). Annual flu vaccination recommended. Return in 8 weeks.',
 56),

-- Appt 11: Ali — back pain
('d1000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000011',
 'b0000000-0000-0000-0000-000000000005',
 'Patient presents with severe lower back pain radiating to left leg. Worsening over 2 weeks. Difficulty sitting for long periods.',
 'Tenderness over L4-L5 region. Straight leg raise positive on left at 45 degrees. No neurological deficit. Muscle spasm palpable.',
 'Lumbar disc prolapse — suspected L4-L5. Sciatica — left side.',
 'Diclofenac 50mg BD with meals. Omeprazole 20mg OD (gastric protection). Muscle relaxant for 5 days. Refer for lumbar MRI. Physiotherapy referral.',
 'Avoid heavy lifting. Use firm mattress. Apply warm compress. If numbness in legs or urinary issues develop, go to ER immediately. Return in 2 weeks with MRI.',
 14),

-- Appt 12: Ali — kidney stone
('d1000000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000012',
 'b0000000-0000-0000-0000-000000000005',
 'Follow-up for kidney stone. Patient had episode of severe flank pain last week. Reports pain has subsided with analgesics.',
 'No costovertebral angle tenderness. Abdomen soft. Urine dipstick: trace blood. Ultrasound shows 4mm stone in right ureter.',
 'Right ureteric calculus — 4mm. Likely to pass spontaneously.',
 'Continue Diclofenac PRN for pain. Increase fluid intake to 3L/day. Tamsulosin 0.4mg OD to aid stone passage. Strain urine to catch stone.',
 'Drink plenty of water. Reduce salt and protein intake. If fever, severe pain, or inability to urinate, go to ER. Return in 3 weeks.',
 21),

-- Appt 13: Nadia — thyroid
('d1000000-0000-0000-0000-000000000013', 'f1000000-0000-0000-0000-000000000013',
 'b0000000-0000-0000-0000-000000000001',
 'Patient presents for thyroid medication review. Reports weight gain, fatigue, and cold intolerance despite taking Levothyroxine.',
 'Weight 72 kg (up 3 kg). Thyroid not enlarged. Dry skin noted. Heart rate 62 bpm. Reflexes slightly delayed.',
 'Hypothyroidism — inadequately controlled on current dose. Possible medication timing issue.',
 'Increase Levothyroxine to 50mcg OD (from 25mcg). Take on empty stomach 30 min before breakfast. Recheck TSH in 6 weeks.',
 'Take thyroid medication first thing in morning with water only. No food, tea, or other medications for 30 minutes after. Return in 6 weeks with TSH result.',
 42),

-- Appt 14: Nadia — PCOS follow-up
('d1000000-0000-0000-0000-000000000014', 'f1000000-0000-0000-0000-000000000014',
 'b0000000-0000-0000-0000-000000000001',
 'PCOS follow-up. Patient reports irregular periods and difficulty losing weight. Mood changes noted.',
 'Weight 71 kg (slight improvement). Acne on chin. Mild hirsutism. BP 118/76 mmHg. Fasting glucose 108 mg/dL (pre-diabetic range).',
 'Polycystic Ovary Syndrome. Pre-diabetes — insulin resistance.',
 'Start Metformin 500mg OD (insulin sensitizer). Continue Levothyroxine 50mcg. Lifestyle modifications: 1500 kcal diet, 45 min exercise daily.',
 'Track menstrual cycles. Low-glycemic diet. Exercise regularly. Return in 4 weeks to assess Metformin tolerance.',
 28),

-- Appt 15: Rabia — eczema flare-up
('d1000000-0000-0000-0000-000000000015', 'f1000000-0000-0000-0000-000000000015',
 'b0000000-0000-0000-0000-000000000003',
 'Patient presents with eczema flare-up. Red, itchy patches on both forearms and behind knees. Worsened after switching laundry detergent.',
 'Erythematous, lichenified plaques on bilateral antecubital fossae and popliteal fossae. Excoriation marks present. No secondary infection.',
 'Atopic dermatitis — moderate flare. Contact irritant dermatitis — likely detergent related.',
 'Betamethasone cream 0.1% apply BD to affected areas for 2 weeks. Cetirizine 10mg OD for itch. Emollient (petroleum jelly) after every wash. Switch to fragrance-free detergent.',
 'Moisturize frequently. Avoid hot water — use lukewarm. Wear cotton clothing. Switch back to previous detergent. Return in 4 weeks.',
 28),

-- Appt 16: Rabia — seasonal allergy
('d1000000-0000-0000-0000-000000000016', 'f1000000-0000-0000-0000-000000000016',
 'b0000000-0000-0000-0000-000000000003',
 'Follow-up for seasonal allergy reaction. Patient reports improvement in eczema but developed hives last week during pollen season.',
 'Urticarial wheals on trunk and arms. No angioedema. Eczema patches improved — less erythema. No signs of infection.',
 'Acute urticaria — pollen-triggered. Atopic dermatitis — improving.',
 'Continue Cetirizine 10mg OD. Betamethasone cream only on eczema patches PRN. Calamine lotion for hives. Consider allergen testing if recurrent.',
 'Stay indoors during high pollen count. Shower after outdoor activity. Keep windows closed. Return if hives worsen or facial swelling occurs.',
 28),

-- Appt 17: Usman — sports injury
('d1000000-0000-0000-0000-000000000017', 'f1000000-0000-0000-0000-000000000017',
 'b0000000-0000-0000-0000-000000000005',
 'Patient twisted right ankle while playing cricket 2 days ago. Swelling and pain on walking. No popping sound at time of injury.',
 'Right ankle: moderate swelling over lateral malleolus. Tenderness over ATFL. Anterior drawer test mildly positive. No bony tenderness on Ottawa rules. Range of motion limited by pain.',
 'Right ankle sprain — Grade II (partial ligament tear). No fracture clinically.',
 'RICE protocol: Rest, Ice 20 min 4x/day, Compression bandage, Elevation. Diclofenac gel topical. Ankle brace for 2 weeks. X-ray if no improvement in 5 days.',
 'No sports for 3-4 weeks. Gentle range-of-motion exercises after 1 week. Weight-bear as tolerated with support. Return in 2 weeks.',
 14),

-- Appt 18: Hamza — cardiovascular screening
('d1000000-0000-0000-0000-000000000018', 'f1000000-0000-0000-0000-000000000018',
 'b0000000-0000-0000-0000-000000000002',
 'Diabetic patient referred for cardiovascular risk screening. No acute complaints.',
 'BP 130/82 mmHg. Heart sounds normal. No murmurs. Carotid bruits absent. Peripheral pulses normal. ECG: sinus rhythm, normal.',
 'Low to moderate cardiovascular risk in setting of Type 2 Diabetes. No structural heart disease on clinical exam.',
 'Continue current diabetic and antihypertensive medications. Annual cardiac screening. Lifestyle modifications.',
 'Continue regular exercise. Low-fat, low-sugar diet. Report any chest pain or breathlessness to cardiologist. Follow up annually.',
 365),

-- Appt 19: Ali — kidney follow-up
('d1000000-0000-0000-0000-000000000019', 'f1000000-0000-0000-0000-000000000019',
 'b0000000-0000-0000-0000-000000000001',
 'Follow-up for kidney stone. Patient reports stone passed 5 days ago. Flank pain resolved. Brought stone sample.',
 'No tenderness. Abdomen soft. Urine clear. Stone sample: 3mm, brownish — sent for composition analysis.',
 'Passed ureteric calculus — resolved. Pending stone composition analysis.',
 'Continue high fluid intake (3L/day). Await stone analysis for dietary recommendations. Renal ultrasound in 3 months to check for new stones.',
 'Drink plenty of water. Reduce oxalate-rich foods (spinach, nuts) if calcium oxalate stone. Reduce salt. Return in 3 months with ultrasound.',
 90),

-- Appt 20: Usman — pre-sports clearance
('d1000000-0000-0000-0000-000000000020', 'f1000000-0000-0000-0000-000000000020',
 'b0000000-0000-0000-0000-000000000004',
 'Pre-participation sports physical for university cricket team. No current complaints.',
 'Height 178 cm, Weight 74 kg, BMI 23.4. BP 118/72 mmHg. Heart rate 68 bpm. Cardiovascular exam normal. Musculoskeletal exam normal. Previous ankle injury — fully healed.',
 'Healthy young male. Cleared for sports participation.',
 'No restrictions. Annual sports physical recommended. Proper warm-up and stretching before matches. Ankle-strengthening exercises.',
 'Wear supportive footwear during sports. Adequate hydration. Use ankle brace during intense matches as preventive measure.',
 365)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Prescriptions + Prescription Items
-- ============================================================

-- Hamza: Metformin + Lisinopril
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000001', 'active',
 'Diabetes and hypertension management. Review at next visit.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
 'Metformin', '500mg', 'Twice daily (BD)', 'Ongoing',
 'Take with meals to reduce GI side effects. Morning and evening.'),
('ab000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001',
 'Lisinopril', '10mg', 'Once daily (OD)', 'Ongoing',
 'Take in the morning. Monitor for dry cough. Report any facial swelling.')
ON CONFLICT (id) DO NOTHING;

-- Aisha: Folic Acid + Iron + Calcium
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000004', 'active',
 'Prenatal supplements and anemia treatment.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000002',
 'Folic Acid', '5mg', 'Once daily (OD)', 'Throughout pregnancy',
 'Essential for fetal neural tube development. Take daily without fail.'),
('ab000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000002',
 'Iron Supplement (Ferrous Sulfate)', '200mg', 'Once daily (OD)', 'Until hemoglobin normalizes',
 'Take on empty stomach with vitamin C (orange juice). May cause dark stools — this is normal.'),
('ab000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000002',
 'Calcium', '500mg', 'Twice daily (BD)', 'Throughout pregnancy',
 'Take with food. Space at least 2 hours apart from iron supplement.')
ON CONFLICT (id) DO NOTHING;

-- Tariq: Atorvastatin + Aspirin + Amlodipine
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
 'f1000000-0000-0000-0000-000000000006', 'active',
 'Cardiovascular risk reduction — statin, antiplatelet, antihypertensive.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000003',
 'Atorvastatin', '20mg', 'Once daily at bedtime (HS)', 'Ongoing',
 'Take at bedtime for optimal cholesterol reduction. Report any unexplained muscle pain.'),
('ab000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-000000000003',
 'Aspirin', '75mg', 'Once daily (OD)', 'Ongoing',
 'Take after breakfast. Antiplatelet for cardiovascular protection. Stop if unusual bleeding.'),
('ab000000-0000-0000-0000-000000000008', 'aa000000-0000-0000-0000-000000000003',
 'Amlodipine', '5mg', 'Once daily (OD)', 'Ongoing',
 'Blood pressure control. Take in the morning. Report ankle swelling or dizziness.')
ON CONFLICT (id) DO NOTHING;

-- Zainab: Salbutamol + Montelukast
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
 'f1000000-0000-0000-0000-000000000009', 'active',
 'Asthma controller and reliever regimen for pediatric patient.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-000000000004',
 'Salbutamol Inhaler', '100mcg/puff, 2 puffs', 'As needed (PRN)', 'Ongoing',
 'Use with spacer device. Maximum 4-hourly. If using more than 3 times per week, consult doctor.'),
('ab000000-0000-0000-0000-000000000010', 'aa000000-0000-0000-0000-000000000004',
 'Montelukast', '5mg', 'Once daily at bedtime (OD)', 'Ongoing',
 'Chewable tablet. Give at bedtime for best effect. Do not stop without consulting doctor.')
ON CONFLICT (id) DO NOTHING;

-- Ali: Diclofenac + Omeprazole
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
 'f1000000-0000-0000-0000-000000000011', 'active',
 'Pain management for back pain with gastric protection.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000011', 'aa000000-0000-0000-0000-000000000005',
 'Diclofenac', '50mg', 'Twice daily (BD)', '2 weeks',
 'Take after meals. Do not take on empty stomach. Stop if stomach pain occurs.'),
('ab000000-0000-0000-0000-000000000012', 'aa000000-0000-0000-0000-000000000005',
 'Omeprazole', '20mg', 'Once daily (OD)', '2 weeks',
 'Take 30 minutes before breakfast. Gastric protection while on Diclofenac.')
ON CONFLICT (id) DO NOTHING;

-- Nadia: Levothyroxine + Metformin
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000014', 'active',
 'Thyroid replacement and insulin sensitizer for PCOS.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000013', 'aa000000-0000-0000-0000-000000000006',
 'Levothyroxine', '50mcg', 'Once daily (OD)', 'Ongoing',
 'Take on empty stomach 30 minutes before breakfast with water only. Do not take with calcium or iron.'),
('ab000000-0000-0000-0000-000000000014', 'aa000000-0000-0000-0000-000000000006',
 'Metformin', '500mg', 'Once daily (OD)', '3 months then review',
 'Take with dinner. For insulin resistance in PCOS. May cause GI upset initially — this usually settles.')
ON CONFLICT (id) DO NOTHING;

-- Rabia: Cetirizine + Betamethasone cream
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, appointment_id, status, notes) VALUES
('aa000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
 'f1000000-0000-0000-0000-000000000015', 'active',
 'Eczema and allergy management — antihistamine and topical steroid.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
('ab000000-0000-0000-0000-000000000015', 'aa000000-0000-0000-0000-000000000007',
 'Cetirizine', '10mg', 'Once daily (OD)', 'Ongoing during allergy season',
 'Non-drowsy antihistamine. Take in the evening if slight drowsiness occurs.'),
('ab000000-0000-0000-0000-000000000016', 'aa000000-0000-0000-0000-000000000007',
 'Betamethasone Cream 0.1%', 'Thin layer', 'Apply twice daily (BD)', '2 weeks then reassess',
 'Apply thin layer to affected areas only. Do not use on face. Moisturize 30 minutes before or after applying.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. Lab Orders + Lab Results
-- ============================================================

-- Hamza — Lab Order 1: CBC + HbA1c + Fasting Glucose + Creatinine
INSERT INTO lab_orders (id, clinic_id, patient_id, doctor_id, appointment_id, test_panel, priority, status, ordered_at, completed_at) VALUES
('bb000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000001',
 'CBC + HbA1c + Metabolic Panel', 'routine', 'completed',
 '2026-06-02 09:30:00+05', '2026-06-03 14:00:00+05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (id, lab_order_id, test_name, value, unit, reference_range, status) VALUES
('bc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001',
 'Hemoglobin', '12.5', 'g/dL', '12.0 - 17.5', 'normal'),
('bc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001',
 'WBC Count', '7500', '/uL', '4000 - 11000', 'normal'),
('bc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000001',
 'Platelet Count', '250000', '/uL', '150000 - 400000', 'normal'),
('bc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000001',
 'HbA1c', '6.5', '%', '< 5.7 (normal), 5.7-6.4 (pre-diabetic)', 'abnormal'),
('bc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000001',
 'Fasting Glucose', '126', 'mg/dL', '70 - 100', 'abnormal'),
('bc000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000001',
 'Creatinine', '1.1', 'mg/dL', '0.7 - 1.3', 'normal')
ON CONFLICT (id) DO NOTHING;

-- Hamza — Lab Order 2: Lipid Panel
INSERT INTO lab_orders (id, clinic_id, patient_id, doctor_id, appointment_id, test_panel, priority, status, ordered_at, completed_at) VALUES
('bb000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000003',
 'Lipid Panel', 'routine', 'completed',
 '2026-07-14 10:00:00+05', '2026-07-15 11:00:00+05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (id, lab_order_id, test_name, value, unit, reference_range, status) VALUES
('bc000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000002',
 'Total Cholesterol', '220', 'mg/dL', '< 200', 'abnormal'),
('bc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000002',
 'LDL Cholesterol', '140', 'mg/dL', '< 100', 'abnormal'),
('bc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000002',
 'HDL Cholesterol', '45', 'mg/dL', '> 40', 'normal'),
('bc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000002',
 'Triglycerides', '180', 'mg/dL', '< 150', 'abnormal')
ON CONFLICT (id) DO NOTHING;

-- Tariq — Lab Order 3: Lipid Panel
INSERT INTO lab_orders (id, clinic_id, patient_id, doctor_id, appointment_id, test_panel, priority, status, ordered_at, completed_at) VALUES
('bb000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
 'f1000000-0000-0000-0000-000000000008',
 'Lipid Panel', 'urgent', 'completed',
 '2026-07-09 11:30:00+05', '2026-07-10 09:00:00+05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (id, lab_order_id, test_name, value, unit, reference_range, status) VALUES
('bc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000003',
 'Total Cholesterol', '260', 'mg/dL', '< 200', 'critical'),
('bc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000003',
 'LDL Cholesterol', '180', 'mg/dL', '< 100', 'critical'),
('bc000000-0000-0000-0000-000000000013', 'bb000000-0000-0000-0000-000000000003',
 'HDL Cholesterol', '38', 'mg/dL', '> 40', 'abnormal'),
('bc000000-0000-0000-0000-000000000014', 'bb000000-0000-0000-0000-000000000003',
 'Triglycerides', '220', 'mg/dL', '< 150', 'abnormal')
ON CONFLICT (id) DO NOTHING;

-- Tariq — Lab Order 4: ECG
INSERT INTO lab_orders (id, clinic_id, patient_id, doctor_id, appointment_id, test_panel, priority, status, ordered_at, completed_at) VALUES
('bb000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006',
 'f1000000-0000-0000-0000-000000000007',
 'ECG', 'urgent', 'completed',
 '2026-06-17 10:00:00+05', '2026-06-17 10:30:00+05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (id, lab_order_id, test_name, value, unit, reference_range, status) VALUES
('bc000000-0000-0000-0000-000000000015', 'bb000000-0000-0000-0000-000000000004',
 'ECG Interpretation', 'Sinus rhythm, rate 76 bpm, left ventricular hypertrophy pattern', NULL, 'Normal sinus rhythm', 'abnormal')
ON CONFLICT (id) DO NOTHING;

-- Aisha — Lab Order 5: CBC + Blood Group
INSERT INTO lab_orders (id, clinic_id, patient_id, doctor_id, appointment_id, test_panel, priority, status, ordered_at, completed_at) VALUES
('bb000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000004',
 'CBC + Blood Group', 'routine', 'completed',
 '2026-06-05 11:30:00+05', '2026-06-06 10:00:00+05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (id, lab_order_id, test_name, value, unit, reference_range, status) VALUES
('bc000000-0000-0000-0000-000000000016', 'bb000000-0000-0000-0000-000000000005',
 'Hemoglobin', '9.8', 'g/dL', '12.0 - 15.5 (female)', 'abnormal'),
('bc000000-0000-0000-0000-000000000017', 'bb000000-0000-0000-0000-000000000005',
 'Platelet Count', '180000', '/uL', '150000 - 400000', 'normal'),
('bc000000-0000-0000-0000-000000000018', 'bb000000-0000-0000-0000-000000000005',
 'Blood Group', 'B+', NULL, NULL, 'normal')
ON CONFLICT (id) DO NOTHING;

-- Aisha — Lab Order 6: OGTT
INSERT INTO lab_orders (id, clinic_id, patient_id, doctor_id, appointment_id, test_panel, priority, status, ordered_at, completed_at) VALUES
('bb000000-0000-0000-0000-000000000006',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000005',
 'OGTT (Oral Glucose Tolerance Test)', 'routine', 'completed',
 '2026-07-03 12:00:00+05', '2026-07-04 15:00:00+05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (id, lab_order_id, test_name, value, unit, reference_range, status) VALUES
('bc000000-0000-0000-0000-000000000019', 'bb000000-0000-0000-0000-000000000006',
 'OGTT (2-hour)', '145', 'mg/dL', '< 140', 'abnormal')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. Health FAQs (40)
-- ============================================================

-- --- General Health (10) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'How often should I get a general health checkup?',
 'Adults should have a general health checkup at least once a year. If you have chronic conditions like diabetes or hypertension, more frequent visits (every 3-6 months) are recommended. Regular checkups help detect problems early when they are easier to treat.',
 'Pakistan Medical Association Guidelines'),
('cc000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'What vaccinations do adults need?',
 'Adults should stay up to date with flu shots (annually), hepatitis B (if not previously vaccinated), and tetanus boosters (every 10 years). Adults over 50 should also consider pneumococcal vaccination. Consult your doctor for a personalized vaccination schedule.',
 'WHO Immunization Guidelines'),
('cc000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'How much water should I drink daily?',
 'The general recommendation is 8-10 glasses (about 2-2.5 liters) of water daily. In hot weather common in Lahore, you may need more. If you have kidney stones or urinary infections, increase intake to 3 liters. Adjust based on activity level and health conditions.',
 'National Institute of Health Pakistan'),
('cc000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'What should I do if I have a fever?',
 'For mild fever (below 101F/38.3C), rest, drink plenty of fluids, and take Paracetamol as directed. If fever exceeds 103F, lasts more than 3 days, or is accompanied by severe headache, rash, or difficulty breathing, visit the clinic immediately. Do not self-medicate with antibiotics.',
 'WHO Fever Management Guidelines'),
('cc000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'How can I boost my immune system?',
 'A balanced diet rich in fruits, vegetables, and whole grains is the foundation. Regular exercise (30 minutes daily), adequate sleep (7-8 hours), and stress management all support immunity. Vitamin D supplementation may help, especially if you have limited sun exposure.',
 'Harvard Medical School Health Publications'),
('cc000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'When should I go to the emergency room vs. visiting the clinic?',
 'Go to the ER for chest pain, difficulty breathing, severe bleeding, loss of consciousness, signs of stroke (facial drooping, arm weakness, speech difficulty), or high fever in infants. For non-urgent issues like mild pain, cough, or skin problems, book a clinic appointment.',
 'Emergency Medicine Association Pakistan'),
('cc000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'What are the warning signs of dehydration?',
 'Warning signs include dark yellow urine, dry mouth, dizziness, headache, and fatigue. Severe dehydration may cause rapid heartbeat, confusion, and fainting. Children and elderly are more vulnerable. Drink ORS solution or water with a pinch of salt and sugar for mild cases.',
 'WHO Oral Rehydration Therapy Guidelines'),
('cc000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'How can I prevent seasonal flu in Lahore?',
 'Get an annual flu vaccination before winter season. Wash hands frequently with soap. Avoid crowded places during flu outbreaks. Maintain good ventilation at home. Eat foods rich in Vitamin C (oranges, guavas, amla). If you develop flu symptoms, wear a mask and rest at home.',
 'Pakistan CDC Flu Prevention Guidelines'),
('cc000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'Is it safe to take painkillers regularly?',
 'Regular use of painkillers (NSAIDs like Ibuprofen or Diclofenac) can cause stomach ulcers, kidney damage, and cardiovascular problems. Paracetamol is safer for occasional use but can harm the liver in high doses. Always use the lowest effective dose for the shortest time and consult your doctor if you need pain relief for more than a week.',
 'British National Formulary'),
('cc000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
 'General Health', 'What lifestyle changes can help with weight management?',
 'Focus on portion control rather than crash diets. Eat more vegetables, whole grains, and lean proteins. Walk at least 30-45 minutes daily — morning walks in parks are ideal. Reduce sugar-sweetened drinks and fried foods. Aim for gradual weight loss of 0.5-1 kg per week.',
 'Diabetes Prevention Program Guidelines')
ON CONFLICT (id) DO NOTHING;

-- --- Diabetes Management (8) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'What is a normal blood sugar level?',
 'Fasting blood sugar should be 70-100 mg/dL. After meals (2 hours), it should be below 140 mg/dL. HbA1c below 5.7% is normal, 5.7-6.4% is pre-diabetic, and 6.5% or above indicates diabetes. Regular monitoring helps track your control.',
 'American Diabetes Association Standards'),
('cc000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'What foods should diabetic patients avoid?',
 'Avoid white rice in large portions, sugary drinks (cola, packaged juices), sweets and mithai, white bread, and fried foods. Limit mangoes, bananas, and grapes as they spike blood sugar. Choose brown rice, whole wheat roti, and daal with vegetables instead.',
 'Pakistan Endocrine Society Guidelines'),
('cc000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'How often should I check my blood sugar?',
 'If on insulin, check 2-4 times daily (before meals and at bedtime). If on oral medication with good control, 2-3 times per week is usually sufficient. Always check when feeling unwell, dizzy, or excessively thirsty. Keep a log to share with your doctor.',
 'International Diabetes Federation'),
('cc000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'What are the signs of low blood sugar (hypoglycemia)?',
 'Symptoms include shakiness, sweating, rapid heartbeat, hunger, dizziness, confusion, and irritability. If you experience these, immediately eat or drink something sugary (glucose tablets, juice, candy). If symptoms persist or the person becomes unconscious, call emergency services.',
 'American Diabetes Association Emergency Guide'),
('cc000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'Can diabetes be reversed?',
 'Type 2 diabetes can sometimes be put into remission through significant lifestyle changes — weight loss, regular exercise, and dietary modifications. However, it requires sustained effort and medical supervision. Type 1 diabetes cannot be reversed. Never stop medications without consulting your doctor.',
 'The Lancet Diabetes & Endocrinology'),
('cc000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'Why is foot care important for diabetic patients?',
 'Diabetes can damage nerves and blood vessels in your feet, making you less likely to notice injuries. Small cuts can become serious infections. Check your feet daily for cuts, blisters, or swelling. Wear comfortable shoes, never walk barefoot, and keep toenails trimmed. See a doctor immediately for any foot wound that does not heal.',
 'Pakistan Diabetes Association'),
('cc000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'What is HbA1c and why is it important?',
 'HbA1c (glycated hemoglobin) measures your average blood sugar over the past 2-3 months. It gives a better picture of overall control than daily glucose readings. Target HbA1c for most diabetics is below 7%. Values above 8% indicate poor control and increased risk of complications.',
 'WHO Diabetes Diagnostic Criteria'),
('cc000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001',
 'Diabetes Management', 'How does Metformin work?',
 'Metformin reduces the amount of glucose your liver produces and improves your body''s sensitivity to insulin. It is usually the first medication prescribed for Type 2 diabetes. Common side effects include nausea and diarrhea, which usually improve after a few weeks. Take it with food to minimize stomach upset.',
 'British National Formulary — Metformin')
ON CONFLICT (id) DO NOTHING;

-- --- Heart Health (6) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001',
 'Heart Health', 'What are the warning signs of a heart attack?',
 'Chest pain or pressure (may feel like squeezing), pain radiating to left arm, jaw, or back, shortness of breath, cold sweats, nausea, and lightheadedness. Women may have atypical symptoms like fatigue and upper back pain. If suspected, call 1122 immediately and chew an Aspirin.',
 'American Heart Association'),
('cc000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001',
 'Heart Health', 'What is a healthy blood pressure reading?',
 'Normal blood pressure is below 120/80 mmHg. Elevated is 120-129/<80. Stage 1 hypertension is 130-139/80-89. Stage 2 is 140+/90+. If your reading is consistently above 130/80, you should be evaluated for treatment. High blood pressure often has no symptoms, so regular monitoring is essential.',
 'Pakistan Hypertension League'),
('cc000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001',
 'Heart Health', 'How can I lower my cholesterol naturally?',
 'Eat more soluble fiber (oats, daal, fruits). Use olive oil instead of ghee for cooking. Eat fatty fish (salmon, sardines) twice weekly. Exercise 30-45 minutes daily. Reduce red meat and full-fat dairy. Lose excess weight. If lifestyle changes are insufficient, medication (statins) may be needed.',
 'European Society of Cardiology'),
('cc000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001',
 'Heart Health', 'What is the difference between LDL and HDL cholesterol?',
 'LDL (bad cholesterol) deposits fat in your arteries, increasing heart disease risk. Target: below 100 mg/dL. HDL (good cholesterol) removes fat from arteries and is protective. Target: above 40 mg/dL for men, above 50 for women. A high LDL-to-HDL ratio significantly increases cardiovascular risk.',
 'National Heart, Lung, and Blood Institute'),
('cc000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001',
 'Heart Health', 'Is chest pain always related to the heart?',
 'No, chest pain can also be caused by acid reflux (GERD), muscle strain, anxiety, lung problems, or costochondritis. However, any new or severe chest pain should be evaluated urgently. Heart-related chest pain typically worsens with exertion and improves with rest. When in doubt, seek medical attention immediately.',
 'Mayo Clinic'),
('cc000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000001',
 'Heart Health', 'How does stress affect heart health?',
 'Chronic stress raises blood pressure, increases inflammation, and may lead to unhealthy habits (overeating, smoking, inactivity). It triggers cortisol release which can damage blood vessels over time. Practice stress management through regular exercise, deep breathing, prayer/meditation, and adequate sleep.',
 'American Psychological Association')
ON CONFLICT (id) DO NOTHING;

-- --- Pregnancy Care (6) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000001',
 'Pregnancy Care', 'What supplements should I take during pregnancy?',
 'Folic acid (5mg daily) is essential from conception through the first trimester to prevent neural tube defects. Iron supplements prevent anemia — common in Pakistani women. Calcium (1000mg daily) supports fetal bone development. Your doctor may also recommend Vitamin D. Always take supplements as prescribed.',
 'WHO Antenatal Care Guidelines'),
('cc000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000001',
 'Pregnancy Care', 'When should I be concerned during pregnancy?',
 'Seek immediate medical care for: vaginal bleeding, severe abdominal pain, sudden swelling of face or hands, severe headache with vision changes, reduced fetal movement (after 28 weeks), fluid leaking from vagina, or fever above 100.4F. Do not wait for a scheduled appointment for these symptoms.',
 'Royal College of Obstetricians and Gynaecologists'),
('cc000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000001',
 'Pregnancy Care', 'What foods should I avoid during pregnancy?',
 'Avoid raw or undercooked meat and eggs, unpasteurized dairy, raw fish (sushi), excessive caffeine (limit to 1 cup chai/day), and soft cheeses. In Pakistan, also be cautious with street food due to hygiene concerns. Wash all fruits and vegetables thoroughly. Avoid herbal remedies without doctor approval.',
 'NHS Pregnancy Diet Guidelines'),
('cc000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000001',
 'Pregnancy Care', 'How often should I have prenatal checkups?',
 'Generally: monthly until 28 weeks, every 2 weeks from 28-36 weeks, then weekly until delivery. High-risk pregnancies (diabetes, hypertension, multiple pregnancy) may need more frequent visits. Never skip scheduled ultrasounds or blood tests.',
 'WHO Recommendations on Antenatal Care'),
('cc000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000001',
 'Pregnancy Care', 'Is exercise safe during pregnancy?',
 'Moderate exercise is safe and beneficial for most pregnant women. Walking, swimming, and prenatal yoga are excellent choices. Aim for 30 minutes most days. Avoid contact sports, heavy lifting, and exercises lying flat on your back after the first trimester. Stop exercising and consult your doctor if you experience bleeding, dizziness, or contractions.',
 'American College of Obstetricians and Gynecologists'),
('cc000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000001',
 'Pregnancy Care', 'What is gestational diabetes and how is it managed?',
 'Gestational diabetes develops during pregnancy when the body cannot produce enough insulin. It is detected through the OGTT (oral glucose tolerance test) around 24-28 weeks. Management includes dietary changes (smaller, frequent meals, limiting sweets), regular blood sugar monitoring, and sometimes insulin. It usually resolves after delivery but increases future Type 2 diabetes risk.',
 'International Diabetes Federation — GDM Guidelines')
ON CONFLICT (id) DO NOTHING;

-- --- Pediatrics (4) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000001',
 'Pediatrics', 'What is the vaccination schedule for children in Pakistan?',
 'Pakistan''s EPI schedule includes BCG at birth, OPV and Pentavalent at 6/10/14 weeks, Measles at 9 and 15 months, and Pneumococcal vaccine at 6/10/14 weeks. Additional recommended vaccines include Hepatitis A, Varicella, and Typhoid. Keep your child''s vaccination card updated and bring it to every visit.',
 'Pakistan Expanded Programme on Immunization'),
('cc000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000001',
 'Pediatrics', 'How do I know if my child has asthma?',
 'Signs include recurrent wheezing, persistent cough (especially at night or early morning), shortness of breath during activity, and chest tightness. Triggers may include dust, smoke, cold air, or exercise. If your child has frequent coughing episodes or breathing difficulty, see a pediatrician for evaluation and a possible trial of asthma medication.',
 'Global Initiative for Asthma (GINA)'),
('cc000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000001',
 'Pediatrics', 'When should I take my child to the doctor for a fever?',
 'For infants under 3 months, any fever (100.4F/38C or above) needs immediate medical attention. For older children, see a doctor if fever exceeds 104F, lasts more than 3 days, or is accompanied by severe headache, stiff neck, rash, persistent vomiting, or difficulty breathing. Give Paracetamol (weight-appropriate dose) and keep the child hydrated.',
 'American Academy of Pediatrics'),
('cc000000-0000-0000-0000-000000000034', 'a0000000-0000-0000-0000-000000000001',
 'Pediatrics', 'How can I manage my child''s asthma at home?',
 'Keep rescue inhaler (Salbutamol) accessible at all times. Use a spacer device for better medication delivery. Remove dust triggers — use allergen-proof bedding, keep stuffed toys minimal, and avoid smoking indoors. Have a written asthma action plan from your doctor. Know when to use the reliever vs controller medication.',
 'Asthma and Allergy Foundation')
ON CONFLICT (id) DO NOTHING;

-- --- Skin Care (3) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000035', 'a0000000-0000-0000-0000-000000000001',
 'Skin Care', 'How should I manage eczema flare-ups?',
 'Moisturize frequently (at least 3 times daily) with a thick, fragrance-free moisturizer. Avoid hot water — use lukewarm for bathing. Wear soft cotton clothing. Apply prescribed steroid cream to inflamed areas only, not healthy skin. Identify and avoid triggers such as harsh detergents, dust, and certain fabrics.',
 'British Association of Dermatologists'),
('cc000000-0000-0000-0000-000000000036', 'a0000000-0000-0000-0000-000000000001',
 'Skin Care', 'What causes seasonal skin allergies?',
 'Common triggers in Pakistan include pollen (spring/autumn), dust mites, mold, and air pollution. Symptoms include itchy skin, hives, redness, and eczema flare-ups. Antihistamines like Cetirizine help control symptoms. Keep windows closed during high pollen days, shower after being outdoors, and use air purifiers if possible.',
 'Pakistan Dermatological Society'),
('cc000000-0000-0000-0000-000000000037', 'a0000000-0000-0000-0000-000000000001',
 'Skin Care', 'Is it safe to use steroid creams long-term?',
 'Long-term use of strong topical steroids can thin the skin, cause stretch marks, and worsen infections. Use the mildest effective strength for the shortest time. Apply a thin layer only to affected areas. Never use on the face or groin without doctor guidance. Always taper off rather than stopping suddenly.',
 'DermNet NZ — Topical Steroids')
ON CONFLICT (id) DO NOTHING;

-- --- Mental Health (3) ---
INSERT INTO health_faqs (id, clinic_id, category, question, answer, source) VALUES
('cc000000-0000-0000-0000-000000000038', 'a0000000-0000-0000-0000-000000000001',
 'Mental Health', 'How do I know if I am experiencing anxiety or just normal stress?',
 'Normal stress is temporary and related to a specific situation. Anxiety becomes a concern when worry is persistent, excessive, and interferes with daily activities. Physical symptoms like racing heart, difficulty sleeping, muscle tension, and irritability lasting more than 2 weeks warrant professional evaluation. Seeking help is a sign of strength, not weakness.',
 'WHO Mental Health Guidelines'),
('cc000000-0000-0000-0000-000000000039', 'a0000000-0000-0000-0000-000000000001',
 'Mental Health', 'What are natural ways to manage stress and anxiety?',
 'Regular physical exercise (30 min daily) is one of the most effective natural anxiety reducers. Deep breathing exercises and mindfulness meditation help calm the nervous system. Maintain a regular sleep schedule. Limit caffeine and screen time before bed. Social support from family and friends is crucial. If symptoms persist, consult a healthcare professional.',
 'American Psychological Association'),
('cc000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000001',
 'Mental Health', 'When should I seek professional help for mental health?',
 'Seek help if you experience persistent sadness lasting more than 2 weeks, loss of interest in activities you used to enjoy, significant changes in sleep or appetite, difficulty concentrating, feelings of worthlessness, or thoughts of self-harm. In Pakistan, you can speak with your primary care doctor who can refer you to a psychiatrist or psychologist.',
 'Pakistan Psychiatric Society')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. Notifications (16)
-- ============================================================

-- --- 10 Appointment Reminders (24h) ---
INSERT INTO notifications (id, clinic_id, patient_id, type, channel, subject, body, status, scheduled_for, sent_at) VALUES
('dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Ahmed Khan tomorrow at 09:00 AM on June 2, 2026.',
 'sent', '2026-06-01 09:00:00+05', '2026-06-01 09:00:00+05'),
('dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Ahmed Khan tomorrow at 10:00 AM on June 23, 2026.',
 'sent', '2026-06-22 10:00:00+05', '2026-06-22 10:00:00+05'),
('dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Ahmed Khan tomorrow at 11:00 AM on June 5, 2026.',
 'sent', '2026-06-04 11:00:00+05', '2026-06-04 11:00:00+05'),
('dd000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Fatima Naz tomorrow at 10:30 AM on June 4, 2026.',
 'sent', '2026-06-03 10:30:00+05', '2026-06-03 10:30:00+05'),
('dd000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000004', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: Zainab has an appointment with Dr. Ayesha Malik tomorrow at 09:00 AM on June 9, 2026.',
 'sent', '2026-06-08 09:00:00+05', '2026-06-08 09:00:00+05'),
('dd000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Hassan Ali tomorrow at 02:30 PM on June 11, 2026.',
 'sent', '2026-06-10 14:30:00+05', '2026-06-10 14:30:00+05'),
('dd000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000006', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Ahmed Khan tomorrow at 02:00 PM on June 12, 2026.',
 'sent', '2026-06-11 14:00:00+05', '2026-06-11 14:00:00+05'),
('dd000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000007', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Omar Rashid tomorrow at 09:20 AM on June 10, 2026.',
 'sent', '2026-06-09 09:20:00+05', '2026-06-09 09:20:00+05'),
('dd000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000008', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Hassan Ali tomorrow at 04:00 PM on June 16, 2026.',
 'sent', '2026-06-15 16:00:00+05', '2026-06-15 16:00:00+05'),
('dd000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'appointment_reminder_24h', 'sms',
 'Appointment Reminder', 'Reminder: You have an appointment with Dr. Sana Iqbal tomorrow at 09:45 AM on June 17, 2026.',
 'sent', '2026-06-16 09:45:00+05', '2026-06-16 09:45:00+05')
ON CONFLICT (id) DO NOTHING;

-- --- 3 Lab Results Ready ---
INSERT INTO notifications (id, clinic_id, patient_id, type, channel, subject, body, status, scheduled_for, sent_at) VALUES
('dd000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'lab_results_ready', 'sms',
 'Lab Results Ready', 'Your lab results for CBC + HbA1c + Metabolic Panel are ready. View them in your patient portal or discuss with your doctor at your next appointment.',
 'sent', '2026-06-03 14:00:00+05', '2026-06-03 14:05:00+05'),
('dd000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002', 'lab_results_ready', 'sms',
 'Lab Results Ready', 'Your lab results for CBC + Blood Group are ready. View them in your patient portal or discuss with your doctor at your next appointment.',
 'sent', '2026-06-06 10:00:00+05', '2026-06-06 10:05:00+05'),
('dd000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'lab_results_ready', 'sms',
 'Lab Results Ready', 'Your lab results for Lipid Panel are ready. View them in your patient portal or discuss with your doctor at your next appointment.',
 'sent', '2026-07-15 11:00:00+05', '2026-07-15 11:05:00+05')
ON CONFLICT (id) DO NOTHING;

-- --- 2 Follow-up Reminders ---
INSERT INTO notifications (id, clinic_id, patient_id, type, channel, subject, body, status, scheduled_for, sent_at) VALUES
('dd000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001', 'follow_up_reminder', 'email',
 'Follow-up Reminder', 'Dr. Ahmed Khan recommended a follow-up visit. It has been 3 weeks since your last appointment. Please book your next visit at City Health Clinic.',
 'sent', '2026-06-23 09:00:00+05', '2026-06-23 09:00:00+05'),
('dd000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000004', 'follow_up_reminder', 'sms',
 'Follow-up Reminder', 'Dr. Ayesha Malik recommended a follow-up for Zainab. It has been 1 week since the asthma visit. Please book the next appointment.',
 'sent', '2026-06-16 09:00:00+05', '2026-06-16 09:00:00+05')
ON CONFLICT (id) DO NOTHING;

-- --- 1 Critical Lab Alert (Tariq's LDL) ---
INSERT INTO notifications (id, clinic_id, patient_id, type, channel, subject, body, status, scheduled_for, sent_at) VALUES
('dd000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003', 'critical_lab_alert', 'in_app',
 'CRITICAL: Abnormal Lab Result', 'URGENT: Critical lab values detected for patient Tariq Mehmood (CH-0003). LDL Cholesterol: 180 mg/dL (critical — target <100). Total Cholesterol: 260 mg/dL (critical — target <200). Immediate review by Dr. Fatima Naz required.',
 'sent', '2026-07-10 09:00:00+05', '2026-07-10 09:01:00+05')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. Audit Logs (10)
-- ============================================================
INSERT INTO audit_logs (id, clinic_id, user_type, user_id, action, resource, resource_id, details, ip_address, created_at) VALUES
('ee000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'patient', 'c0000000-0000-0000-0000-000000000001',
 'appointment_booked', 'appointments', 'f1000000-0000-0000-0000-000000000001',
 '{"doctor": "Dr. Ahmed Khan", "date": "2026-06-02", "time": "09:00", "reason": "Diabetes follow-up"}'::jsonb,
 '192.168.1.100', '2026-06-01 10:15:00+05'),

('ee000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'patient', 'c0000000-0000-0000-0000-000000000003',
 'appointment_booked', 'appointments', 'f1000000-0000-0000-0000-000000000006',
 '{"doctor": "Dr. Fatima Naz", "date": "2026-06-04", "time": "10:30", "reason": "Cardiac risk assessment"}'::jsonb,
 '192.168.1.105', '2026-06-03 08:30:00+05'),

('ee000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'staff', 'e0000000-0000-0000-0000-000000000003',
 'lab_results_entered', 'lab_orders', 'bb000000-0000-0000-0000-000000000001',
 '{"test_panel": "CBC + HbA1c + Metabolic Panel", "patient": "Hamza Tariq", "results_count": 6}'::jsonb,
 '192.168.1.50', '2026-06-03 14:00:00+05'),

('ee000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'patient', 'c0000000-0000-0000-0000-000000000001',
 'lab_results_viewed', 'lab_orders', 'bb000000-0000-0000-0000-000000000001',
 '{"test_panel": "CBC + HbA1c + Metabolic Panel", "viewed_at": "2026-06-04T10:30:00+05:00"}'::jsonb,
 '192.168.1.100', '2026-06-04 10:30:00+05'),

('ee000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'patient', 'c0000000-0000-0000-0000-000000000001',
 'chat_session_started', 'chat_sessions', NULL,
 '{"message": "What are my current medications?"}'::jsonb,
 '192.168.1.100', '2026-07-20 14:00:00+05'),

('ee000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'staff', 'e0000000-0000-0000-0000-000000000001',
 'patient_registered', 'patients', 'c0000000-0000-0000-0000-000000000008',
 '{"patient_number": "CH-0008", "name": "Usman Ahmed"}'::jsonb,
 '192.168.1.50', '2026-06-15 09:00:00+05'),

('ee000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'doctor', 'b0000000-0000-0000-0000-000000000002',
 'prescription_created', 'prescriptions', 'aa000000-0000-0000-0000-000000000003',
 '{"patient": "Tariq Mehmood", "medications": ["Atorvastatin 20mg", "Aspirin 75mg", "Amlodipine 5mg"]}'::jsonb,
 '192.168.1.60', '2026-06-04 11:30:00+05'),

('ee000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
 'staff', 'e0000000-0000-0000-0000-000000000003',
 'lab_results_entered', 'lab_orders', 'bb000000-0000-0000-0000-000000000003',
 '{"test_panel": "Lipid Panel", "patient": "Tariq Mehmood", "critical_values": ["Total Cholesterol: 260", "LDL: 180"]}'::jsonb,
 '192.168.1.50', '2026-07-10 09:00:00+05'),

('ee000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
 'patient', 'c0000000-0000-0000-0000-000000000006',
 'appointment_cancelled', 'appointments', 'f1000000-0000-0000-0000-000000000026',
 '{"doctor": "Dr. Ahmed Khan", "date": "2026-06-19", "reason": "Travel plans"}'::jsonb,
 '192.168.1.110', '2026-06-17 16:00:00+05'),

('ee000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
 'system', NULL,
 'critical_lab_alert_sent', 'notifications', 'dd000000-0000-0000-0000-000000000016',
 '{"patient": "Tariq Mehmood", "test": "LDL Cholesterol", "value": "180 mg/dL", "status": "critical"}'::jsonb,
 NULL, '2026-07-10 09:01:00+05')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. Chat Sessions (2) with Messages
-- ============================================================

-- Chat Session 1: Hamza asks about medications
INSERT INTO chat_sessions (id, clinic_id, patient_id, started_at, ended_at, message_count, tools_used, escalated) VALUES
('ff000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001',
 '2026-07-20 14:00:00+05', '2026-07-20 14:08:00+05',
 4, ARRAY['get_my_medications','search_health_faq'], false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, session_id, role, content, tool_name, tool_input, tool_result, created_at) VALUES
('ff100000-0000-0000-0000-000000000001', 'ff000000-0000-0000-0000-000000000001',
 'user', 'What medications am I currently taking?', NULL, NULL, NULL,
 '2026-07-20 14:00:00+05'),
('ff100000-0000-0000-0000-000000000002', 'ff000000-0000-0000-0000-000000000001',
 'assistant', 'You are currently taking the following medications:\n\n1. **Metformin 500mg** — Twice daily (BD), take with meals\n2. **Lisinopril 10mg** — Once daily (OD), take in the morning\n\nMetformin is for managing your Type 2 Diabetes, and Lisinopril helps control your blood pressure.\n\nPlease consult your healthcare provider for personalized medical advice.',
 'get_my_medications', NULL, NULL, '2026-07-20 14:00:30+05'),
('ff100000-0000-0000-0000-000000000003', 'ff000000-0000-0000-0000-000000000001',
 'user', 'Can I take Metformin with food or on an empty stomach?', NULL, NULL, NULL,
 '2026-07-20 14:03:00+05'),
('ff100000-0000-0000-0000-000000000004', 'ff000000-0000-0000-0000-000000000001',
 'assistant', 'Great question! Metformin should be taken **with food** (during or right after meals). This helps reduce common side effects like nausea, stomach upset, and diarrhea. Taking it on an empty stomach can increase GI discomfort.\n\nYour prescription notes recommend taking it with your morning and evening meals.\n\nThis is general information only. Please consult your healthcare provider for personalized medical advice.',
 'search_health_faq', NULL, NULL, '2026-07-20 14:03:25+05')
ON CONFLICT (id) DO NOTHING;

-- Chat Session 2: Hamza asks about lab results
INSERT INTO chat_sessions (id, clinic_id, patient_id, started_at, ended_at, message_count, tools_used, escalated) VALUES
('ff000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001',
 '2026-07-21 10:00:00+05', '2026-07-21 10:12:00+05',
 4, ARRAY['get_my_lab_results','explain_lab_results','search_health_faq'], false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, session_id, role, content, tool_name, tool_input, tool_result, created_at) VALUES
('ff100000-0000-0000-0000-000000000005', 'ff000000-0000-0000-0000-000000000002',
 'user', 'Can you show me my latest lab results?', NULL, NULL, NULL,
 '2026-07-21 10:00:00+05'),
('ff100000-0000-0000-0000-000000000006', 'ff000000-0000-0000-0000-000000000002',
 'assistant', 'Here are your latest lab results from your **Lipid Panel** (July 15, 2026):\n\n| Test | Value | Reference | Status |\n|------|-------|-----------|--------|\n| Total Cholesterol | 220 mg/dL | < 200 | Abnormal |\n| LDL Cholesterol | 140 mg/dL | < 100 | Abnormal |\n| HDL Cholesterol | 45 mg/dL | > 40 | Normal |\n| Triglycerides | 180 mg/dL | < 150 | Abnormal |\n\nYour LDL and total cholesterol are elevated. I recommend discussing these results with Dr. Ahmed Khan at your next appointment.\n\nThis is general information only. Please consult your healthcare provider for personalized medical advice.',
 'get_my_lab_results', NULL, NULL, '2026-07-21 10:00:45+05'),
('ff100000-0000-0000-0000-000000000007', 'ff000000-0000-0000-0000-000000000002',
 'user', 'What does high LDL cholesterol mean for me as a diabetic?', NULL, NULL, NULL,
 '2026-07-21 10:05:00+05'),
('ff100000-0000-0000-0000-000000000008', 'ff000000-0000-0000-0000-000000000002',
 'assistant', 'High LDL cholesterol is a concern for everyone, but it carries **additional risk** for diabetic patients. People with diabetes are already at higher cardiovascular risk, and elevated LDL further increases the chance of heart disease and stroke.\n\nKey points:\n- LDL deposits cholesterol in artery walls, narrowing them over time\n- Diabetes accelerates this process through inflammation and oxidative stress\n- The recommended LDL target for diabetics is often **below 70 mg/dL** (stricter than general population)\n\nYour doctor may discuss lifestyle changes (diet, exercise) or cholesterol-lowering medication at your next visit. You already have an appointment scheduled.\n\nThis is general information only. Please consult your healthcare provider for personalized medical advice.',
 'explain_lab_results', NULL, NULL, '2026-07-21 10:05:40+05')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Done! Seed data loaded for City Health Clinic, Lahore.
-- ============================================================
