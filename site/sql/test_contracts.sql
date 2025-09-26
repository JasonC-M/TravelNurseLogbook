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
('{USER_ID}', 'Seattle Children''s Hospital', '4800 Sand Point Way NE, Seattle, WA 98105', 47.6625, -122.2947, '2025-07-01', '2025-09-30', NOW(), NOW()),

-- Contract 2: Recent past
('{USER_ID}', 'Kuakini Medical Center', '347 N Kuakini St, Honolulu, HI 96817', 21.3099, -157.8581, '2025-03-18', '2025-06-17', NOW(), NOW()),

-- Contract 3: 
('{USER_ID}', 'Providence Alaska Medical Center', '3200 Providence Dr, Anchorage, AK 99508', 61.1928, -149.8683, '2024-12-02', '2025-03-04', NOW(), NOW()),

-- Contract 4:
('{USER_ID}', 'Guam Regional Medical City', '133 Route 3, Dededo, Guam 96929', 13.5139, 144.8430, '2024-08-19', '2024-11-18', NOW(), NOW()),

-- Contract 5:
('{USER_ID}', 'Cherokee Indian Hospital', '1 Hospital Rd, Cherokee, NC 28719', 35.4729, -83.3174, '2024-05-06', '2024-08-05', NOW(), NOW()),

-- Contract 6:
('{USER_ID}', 'Naval Hospital Pensacola', '6000 W Hwy 98, Pensacola, FL 32512', 30.3515, -87.3094, '2024-01-22', '2024-04-22', NOW(), NOW()),

-- Contract 7:
('{USER_ID}', 'Roy Helu Jr. Community Health Center', 'Road 110, St. Thomas, VI 00802', 18.3419, -64.9307, '2023-10-09', '2024-01-08', NOW(), NOW()),

-- Contract 8:
('{USER_ID}', 'Northern Navajo Medical Center', 'US-491, Shiprock, NM 87420', 36.7856, -108.6868, '2023-06-26', '2023-09-25', NOW(), NOW()),

-- Contract 9:
('{USER_ID}', 'Centro Médico de Puerto Rico', 'Ave Américo Miranda, San Juan, PR 00936', 18.4037, -66.0674, '2023-03-13', '2023-06-12', NOW(), NOW()),

-- Contract 10:
('{USER_ID}', 'Cheyenne River Health Center', '212 Sitting Bull St, Eagle Butte, SD 57625', 44.9758, -101.2321, '2022-11-28', '2023-02-27', NOW(), NOW()),

-- Contract 11:
('{USER_ID}', 'Alaska Native Medical Center', '4315 Diplomacy Dr, Anchorage, AK 99508', 61.1944, -149.8322, '2022-08-15', '2022-11-14', NOW(), NOW()),

-- Contract 12:
('{USER_ID}', 'Johns Hopkins Hospital', '1800 Orleans St, Baltimore, MD 21287', 39.2971, -76.5929, '2022-05-02', '2022-08-01', NOW(), NOW()),

-- Contract 13:
('{USER_ID}', 'Indian Health Service - Phoenix', '4212 N 16th St, Phoenix, AZ 85016', 33.4734, -112.0740, '2022-01-17', '2022-04-18', NOW(), NOW()),

-- Contract 14:
('{USER_ID}', 'Queen''s Medical Center', '1301 Punchbowl St, Honolulu, HI 96813', 21.3087, -157.8583, '2021-10-04', '2022-01-03', NOW(), NOW()),

-- Contract 15:
('{USER_ID}', 'Walter Reed Army Medical Center', '8901 Rockville Pike, Bethesda, MD 20889', 38.9987, -77.1262, '2021-06-21', '2021-09-20', NOW(), NOW()),

-- Contract 16:
('{USER_ID}', 'Mayo Clinic', '200 First St SW, Rochester, MN 55905', 44.0225, -92.4699, '2021-03-08', '2021-06-07', NOW(), NOW()),

-- Contract 17:
('{USER_ID}', 'Rosebud Hospital', '430 S Main St, Rosebud, SD 57570', 43.2342, -100.8518, '2020-11-23', '2021-02-22', NOW(), NOW()),

-- Contract 18:
('{USER_ID}', 'University of California, San Francisco Medical Center', '505 Parnassus Ave, San Francisco, CA 94143', 37.7628, -122.4581, '2020-08-10', '2020-11-09', NOW(), NOW()),

-- Contract 19:
('{USER_ID}', 'Fairbanks Memorial Hospital', '1650 Cowles St, Fairbanks, AK 99701', 64.8401, -147.8014, '2020-04-27', '2020-07-27', NOW(), NOW()),

-- Contract 20:
('{USER_ID}', 'Rural Health Clinic - Delta Junction', '1511 Richardson Hwy, Delta Junction, AK 99737', 64.0440, -145.7342, '2020-01-13', '2020-04-13', NOW(), NOW());

-- Instructions for use:
-- 1. Replace {USER_ID} with the actual user ID from your authentication system
-- 2. Execute this script in your database
-- 3. The contracts span from 2020 to present, with one current contract ending September 30, 2025
-- 4. All contracts are 13 weeks (91 days) with approximately 1 week gaps between assignments
-- 5. Geographic diversity includes:
--    - CONUS: Teaching hospitals, military facilities, rural clinics
--    - Alaska: Urban and rural healthcare facilities  
--    - Hawaii: Major medical centers
--    - Territories: Guam, Puerto Rico, US Virgin Islands
--    - Native American: Tribal health centers and IHS facilities