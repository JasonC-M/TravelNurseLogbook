# My Tasks - Supabase Configuration & Setup

## 🎯 **YOUR ACTION ITEMS**

Complete these tasks in the **Supabase Dashboard** before/during the backend development process.

---

## 📋 **PHASE 1: Initial Supabase Setup**

### **1.1 Get Service Role Key**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Settings** → **API**
3. Find the **Service Role Key** (NOT the anon key)
4. **Copy this key** - you'll need it for the backend `.env` file

### **1.2 Configure Authentication Settings**
1. Go to **Authentication** → **Settings**
2. Under **Site URL**, set: `https://localhost`
3. Under **Redirect URLs**, add:
   - `https://localhost`
   - `http://localhost`
   - `https://localhost:443`
4. Set **JWT expiry** to: `3600` (1 hour)
5. **Save changes**

---

## 🗄️ **PHASE 2: Database Schema Verification**

### **2.1 Check Existing Tables**
1. Go to **Database** → **Tables**
2. Verify these tables exist (create if missing):

#### **Contracts Table**
If the `contracts` table doesn't exist, create it:
```sql
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Profiles Table (if needed)**
```sql
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    specialization TEXT,
    license_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔒 **PHASE 3: Row Level Security (RLS) Setup**

### **3.1 Enable RLS on Tables**
Go to **Database** → **Tables** → Select each table → **Enable RLS**

Or run these SQL commands in the SQL Editor:

```sql
-- Enable RLS on contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles (if exists)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### **3.2 Create Security Policies**
Run these in **SQL Editor**:

```sql
-- Contracts: Users can only access their own contracts
CREATE POLICY "Users can view own contracts" ON contracts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts" ON contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts" ON contracts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts" ON contracts
    FOR DELETE USING (auth.uid() = user_id);

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

---

## 📁 **PHASE 4: Storage Setup (Optional)**

### **4.1 Create Storage Buckets**
If you plan to store files (documents, images):

1. Go to **Storage** → **Buckets**
2. Create a new bucket:
   - **Name**: `documents`
   - **Public**: `false` (private)
3. Click **Create bucket**

### **4.2 Storage Security Policies**
Run in **SQL Editor**:
```sql
-- Users can only access their own files
CREATE POLICY "Users can manage own files" ON storage.objects
    FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🔑 **PHASE 5: Environment Variables Setup**

### **5.1 Create Backend Environment File**
When I create the backend structure, you'll need to create:

**File**: `backend/.env` (do NOT commit this file)
```bash
NODE_ENV=development
SUPABASE_URL=https://kcyrtbkecctthqkqrhkc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_step_1.1
JWT_SECRET=create_a_random_secure_string_here
PORT=3000
```

**⚠️ SECURITY NOTE**: Never commit the `.env` file to git!

---

## 🧪 **PHASE 6: Testing Checklist**

### **6.1 Test User Registration**
1. Try registering a new user through the frontend
2. Check if user appears in **Authentication** → **Users**
3. Verify user can login/logout

### **6.2 Test Data Access**
1. Create a test contract through the frontend
2. Verify it appears in **Database** → **Tables** → `contracts`
3. Ensure RLS is working (user only sees their own data)

---

## 📞 **WHEN TO CONTACT ME**

### **✅ Contact me immediately if:**
- Any SQL commands fail or give errors
- Tables don't exist and you can't create them
- RLS policies fail to create
- Authentication settings don't save
- You can't find the Service Role Key

### **🔄 I'll notify you when I need:**
- The Service Role Key for backend configuration
- Testing of specific endpoints
- Verification that authentication is working
- Database connection testing

---

## 🚨 **IMPORTANT REMINDERS**

1. **Service Role Key** ≠ **Anon Key** 
   - Use Service Role Key for backend (full database access)
   - Keep Anon Key for frontend (limited access)

2. **Never commit secrets** to git:
   - Add `backend/.env` to `.gitignore`
   - Use `backend/.env.example` for templates

3. **Test incrementally**:
   - Test each phase before moving to the next
   - Verify RLS is working properly

4. **Backup first**:
   - If you have existing data, consider backing it up
   - RLS changes can affect data access

---

## 📋 **Quick Status Checklist**

- [ ] Service Role Key obtained
- [ ] Authentication URLs configured  
- [ ] Database tables verified/created
- [ ] RLS enabled on all tables
- [ ] Security policies created
- [ ] Storage buckets created (if needed)
- [ ] Backend .env file ready
- [ ] Ready for backend development

---

**Once you complete these tasks, I'm ready to begin the backend development!** 🚀

Let me know if you run into any issues or need clarification on any step.