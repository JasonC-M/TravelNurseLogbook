-- Test Contracts for Travel Nurse Logbook
-- Diverse healthcare facilities across CONUS, Alaska, Hawaii, and US Territories
-- 20 contracts spanning multiple years with realistic 13-week assignments

-- Note: Replace {USER_ID} with actual user ID when inserting
-- Contracts are ordered chronologically from most recent (current) to oldest

INSERT INTO contracts (
    user_id, 
    hospital_name, 
    address, 
    latitude, 
    longitude, 
    start_date, 
    end_date, 
    created_at, 
    updated_at
) VALUES

-- Contract 1: CURRENT CONTRACT (ends in future)
('{USER_ID}', 'Seattle Children''s Hospital', '4800 Sand Point Way NE, Seattle, WA 98105', 47.66284925157117, -122.28207402883619, '2025-07-01', '2025-09-30', NOW(), NOW()),

-- Contract 2: Recent past
('{USER_ID}', 'Kuakini Medical Center', '347 N Kuakini St, Honolulu, HI 96817', 21.3099, -157.8581, '2025-03-18', '2025-06-17', NOW(), NOW()),

-- Contract 3: 
('{USER_ID}', 'Providence Alaska Medical Center', '3200 Providence Dr, Anchorage, AK 99508', 61.1928, -149.8683, '2024-12-02', '2025-03-04', NOW(), NOW()),

-- Contract 4:
('{USER_ID}', 'Guam Regional Medical City', '133 Route 3, Dededo, Guam 96929', 13.5139, 144.8430, '2024-08-19', '2024-11-18', NOW(), NOW()),

-- Contract 5:
('{USER_ID}', 'Samuel Simmonds Memorial Hospital', '7000 Uula St, Utqiagvik, AK 99723', 71.2906, -156.7886, '2024-05-06', '2024-08-05', NOW(), NOW()),

-- Contract 6:
('{USER_ID}', 'Mayo Clinic Hospital', '5777 E Mayo Blvd, Phoenix, AZ 85054', 33.6159, -111.9626, '2024-01-22', '2024-04-22', NOW(), NOW()),

-- Contract 7:
('{USER_ID}', 'Lyndon B. Johnson Tropical Medical Center', 'Pago Pago, AS 96799', -14.2781, -170.7025, '2023-10-09', '2024-01-08', NOW(), NOW()),

-- Contract 8:
('{USER_ID}', 'Queen''s Medical Center', '1301 Punchbowl St, Honolulu, HI 96813', 21.3099, -157.8581, '2023-06-26', '2023-09-25', NOW(), NOW()),

-- Contract 9:
('{USER_ID}', 'Central Peninsula Hospital', '250 Hospital Pl, Soldotna, AK 99669', 60.4878, -151.0581, '2023-03-13', '2023-06-12', NOW(), NOW()),

-- Contract 10:
('{USER_ID}', 'Roy J. Carver Pavilion', '200 Hawkins Dr, Iowa City, IA 52242', 41.6581, -91.5569, '2022-11-28', '2023-02-27', NOW(), NOW()),

-- Contract 11:
('{USER_ID}', 'Schneider Regional Medical Center', '9048 Sugar Estate, St Thomas, VI 00802', 18.3358, -64.8963, '2022-08-15', '2022-11-14', NOW(), NOW()),

-- Contract 12:
('{USER_ID}', 'Bartlett Regional Hospital', '3260 Hospital Dr, Juneau, AK 99801', 58.2539, -134.3708, '2022-05-02', '2022-08-01', NOW(), NOW()),

-- Contract 13:
('{USER_ID}', 'Tampa General Hospital', '1 Tampa General Cir, Tampa, FL 33606', 27.9447, -82.4633, '2022-01-17', '2022-04-18', NOW(), NOW()),

-- Contract 14:
('{USER_ID}', 'Banner University Medical Center', '1625 N Campbell Ave, Tucson, AZ 85719', 32.2431, -110.9531, '2021-10-04', '2022-01-03', NOW(), NOW()),

-- Contract 15:
('{USER_ID}', 'Fairbanks Memorial Hospital', '1650 Cowles St, Fairbanks, AK 99701', 64.8378, -147.7164, '2021-06-21', '2021-09-20', NOW(), NOW()),

-- Contract 16:
('{USER_ID}', 'Johns Hopkins Hospital', '1800 Orleans St, Baltimore, MD 21287', 39.2970, -76.5936, '2021-03-08', '2021-06-07', NOW(), NOW()),

-- Contract 17:
('{USER_ID}', 'Commonwealth Health Center', 'Navy Hill Rd, Saipan, MP 96950', 15.1979, 145.7579, '2020-11-23', '2021-02-22', NOW(), NOW()),

-- Contract 18:
('{USER_ID}', 'Mount Sinai Hospital', '1468 Madison Ave, New York, NY 10029', 40.7831, -73.9712, '2020-08-10', '2020-11-09', NOW(), NOW()),

-- Contract 19:
('{USER_ID}', 'Mat-Su Regional Medical Center', '2500 S Woodworth Loop, Palmer, AK 99645', 61.5844, -149.1156, '2020-04-27', '2020-07-27', NOW(), NOW()),

-- Contract 20: OLDEST CONTRACT
('{USER_ID}', 'Massachusetts General Hospital', '55 Fruit St, Boston, MA 02114', 42.3631, -71.0686, '2020-01-13', '2020-04-13', NOW(), NOW());