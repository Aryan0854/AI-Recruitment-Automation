import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { Pool } = pg;

// Local JSON DB File Path (Fail-safe Fallback inside Next.js root)
const LOCAL_DB_PATH = path.resolve(process.cwd(), 'database.json');

// Initialize local DB structure if file doesn't exist
const initLocalDb = () => {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDb = {
      job_descriptions: [] as any[],
      skills: [
        { id: crypto.randomUUID(), name: 'SQL', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'PostgreSQL', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Oracle', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'MySQL', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Linux', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Windows', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Python', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Shell scripting', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'APIs', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Microservices', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Kafka', category: 'Technical' },
        { id: crypto.randomUUID(), name: 'Splunk', category: 'Monitoring' },
        { id: crypto.randomUUID(), name: 'Dynatrace', category: 'Monitoring' },
        { id: crypto.randomUUID(), name: 'AppDynamics', category: 'Monitoring' },
        { id: crypto.randomUUID(), name: 'AWS', category: 'Cloud' },
        { id: crypto.randomUUID(), name: 'Azure', category: 'Cloud' },
        { id: crypto.randomUUID(), name: 'GCP', category: 'Cloud' },
        { id: crypto.randomUUID(), name: 'Jira', category: 'Tools' },
        { id: crypto.randomUUID(), name: 'ServiceNow', category: 'Tools' },
        { id: crypto.randomUUID(), name: 'Remedy', category: 'Tools' },
        { id: crypto.randomUUID(), name: 'Control-M', category: 'Tools' },
        { id: crypto.randomUUID(), name: 'Autosys', category: 'Tools' }
      ] as any[],
      jd_skills: [] as any[],
      uploads: [] as any[]
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    console.log(`[DB] Initialized local JSON database at ${LOCAL_DB_PATH}`);
  }
};

let pool: any = null;
let isPostgres = false;

// Connect to the DB
export const connectDb = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[DB] No DATABASE_URL configured. Using local JSON database.');
    initLocalDb();
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase') || connectionString.includes('render') || connectionString.includes('railway')
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 5000
    });

    await pool.query('SELECT NOW()');
    isPostgres = true;
    console.log('[DB] Connected to PostgreSQL Database successfully!');
    
    await createSchemas();
    return true;
  } catch (err: any) {
    console.error('[DB] PostgreSQL connection failed:', err.message);
    console.log('[DB] Falling back to local JSON database mode.');
    pool = null;
    isPostgres = false;
    initLocalDb();
    return false;
  }
};

const createSchemas = async () => {
  if (!isPostgres) return;

  try {
    // Job Descriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        experience VARCHAR(50),
        support_level VARCHAR(50),
        employment_type VARCHAR(100),
        shift_timing VARCHAR(100),
        raw_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Skills
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50)
      );
    `);

    // JD Skills Join
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jd_skills (
        jd_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
        skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
        PRIMARY KEY (jd_id, skill_id)
      );
    `);

    // Uploads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id UUID PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        processing_time REAL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed basic skills
    const skillsList = [
      ['SQL', 'Technical'], ['PostgreSQL', 'Technical'], ['Oracle', 'Technical'],
      ['MySQL', 'Technical'], ['Linux', 'Technical'], ['Windows', 'Technical'],
      ['Python', 'Technical'], ['Shell scripting', 'Technical'], ['APIs', 'Technical'],
      ['Microservices', 'Technical'], ['Kafka', 'Technical'],
      ['Splunk', 'Monitoring'], ['Dynatrace', 'Monitoring'], ['AppDynamics', 'Monitoring'],
      ['AWS', 'Cloud'], ['Azure', 'Cloud'], ['GCP', 'Cloud'],
      ['Jira', 'Tools'], ['ServiceNow', 'Tools'], ['Remedy', 'Tools'],
      ['Control-M', 'Tools'], ['Autosys', 'Tools']
    ];

    for (const [name, cat] of skillsList) {
      await pool.query(
        'INSERT INTO skills (id, name, category) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [crypto.randomUUID(), name, cat]
      );
    }
  } catch (err: any) {
    console.error('[DB] Failed to create tables in PostgreSQL:', err.message);
  }
};

// Reading local DB helper
const readLocalDb = () => {
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    initLocalDb();
    return { job_descriptions: [], skills: [], jd_skills: [], uploads: [] };
  }
};

// Writing local DB helper
const writeLocalDb = (data: any) => {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

// UNIFIED DATABASE QUERY API
export const db = {
  isPostgres: () => isPostgres,

  // Upload Tracking Queries
  createUpload: async (filename: string) => {
    // Make sure DB check has run at least once
    if (!pool && !fs.existsSync(LOCAL_DB_PATH)) {
      await connectDb();
    }
    
    const id = crypto.randomUUID();
    const newUpload = { id, filename, status: 'Pending', processing_time: null, error_message: null, created_at: new Date().toISOString() };
    if (isPostgres) {
      await pool.query(
        'INSERT INTO uploads (id, filename, status) VALUES ($1, $2, $3)',
        [id, filename, 'Pending']
      );
      return newUpload;
    } else {
      const ldb = readLocalDb();
      ldb.uploads.push(newUpload);
      writeLocalDb(ldb);
      return newUpload;
    }
  },

  updateUpload: async (id: string, updates: any) => {
    if (isPostgres) {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setQuery = fields.map((f, idx) => `${f} = $${idx + 2}`).join(', ');
      await pool.query(
        `UPDATE uploads SET ${setQuery} WHERE id = $1`,
        [id, ...values]
      );
    } else {
      const ldb = readLocalDb();
      const idx = ldb.uploads.findIndex((u: any) => u.id === id);
      if (idx !== -1) {
        ldb.uploads[idx] = { ...ldb.uploads[idx], ...updates };
        writeLocalDb(ldb);
      }
    }
  },

  getUploads: async () => {
    if (!pool && !fs.existsSync(LOCAL_DB_PATH)) {
      await connectDb();
    }

    if (isPostgres) {
      const res = await pool.query('SELECT * FROM uploads ORDER BY created_at DESC LIMIT 15');
      return res.rows;
    } else {
      const ldb = readLocalDb();
      return [...ldb.uploads].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);
    }
  },

  // Job Description Queries
  createJob: async (jobData: any, skillsArray: string[]) => {
    if (!pool && !fs.existsSync(LOCAL_DB_PATH)) {
      await connectDb();
    }

    const id = crypto.randomUUID();
    const newJob = {
      id,
      title: jobData.title,
      department: jobData.department || '',
      experience: jobData.experience || '',
      support_level: jobData.support_level || '',
      employment_type: jobData.employment_type || 'Full Time',
      shift_timing: jobData.shift_timing || '',
      raw_text: jobData.raw_text || '',
      created_at: new Date().toISOString()
    };

    if (isPostgres) {
      await pool.query(
        `INSERT INTO job_descriptions 
         (id, title, department, experience, support_level, employment_type, shift_timing, raw_text) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, newJob.title, newJob.department, newJob.experience, newJob.support_level, newJob.employment_type, newJob.shift_timing, newJob.raw_text]
      );

      // Handle skills associations
      for (const skillName of skillsArray) {
        let skillRes = await pool.query('SELECT id FROM skills WHERE LOWER(name) = LOWER($1)', [skillName]);
        let skillId;
        if (skillRes.rows.length === 0) {
          skillId = crypto.randomUUID();
          await pool.query('INSERT INTO skills (id, name, category) VALUES ($1, $2, $3)', [skillId, skillName, 'Technical']);
        } else {
          skillId = skillRes.rows[0].id;
        }
        await pool.query('INSERT INTO jd_skills (jd_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, skillId]);
      }
      return { ...newJob, skills: skillsArray };
    } else {
      const ldb = readLocalDb();
      ldb.job_descriptions.push(newJob);

      // Link skills
      for (const skillName of skillsArray) {
        let skill = ldb.skills.find((s: any) => s.name.toLowerCase() === skillName.toLowerCase());
        if (!skill) {
          skill = { id: crypto.randomUUID(), name: skillName, category: 'Technical' };
          ldb.skills.push(skill);
        }
        ldb.jd_skills.push({ jd_id: id, skill_id: skill.id });
      }

      writeLocalDb(ldb);
      return { ...newJob, skills: skillsArray };
    }
  },

  updateJob: async (id: string, jobData: any, skillsArray: string[]) => {
    if (isPostgres) {
      await pool.query(
        `UPDATE job_descriptions SET 
          title = $2, department = $3, experience = $4, support_level = $5, 
          employment_type = $6, shift_timing = $7 WHERE id = $1`,
        [id, jobData.title, jobData.department, jobData.experience, jobData.support_level, jobData.employment_type, jobData.shift_timing]
      );

      await pool.query('DELETE FROM jd_skills WHERE jd_id = $1', [id]);

      for (const skillName of skillsArray) {
        let skillRes = await pool.query('SELECT id FROM skills WHERE LOWER(name) = LOWER($1)', [skillName]);
        let skillId;
        if (skillRes.rows.length === 0) {
          skillId = crypto.randomUUID();
          await pool.query('INSERT INTO skills (id, name, category) VALUES ($1, $2, $3)', [skillId, skillName, 'Technical']);
        } else {
          skillId = skillRes.rows[0].id;
        }
        await pool.query('INSERT INTO jd_skills (jd_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, skillId]);
      }
    } else {
      const ldb = readLocalDb();
      const idx = ldb.job_descriptions.findIndex((j: any) => j.id === id);
      if (idx !== -1) {
        ldb.job_descriptions[idx] = { ...ldb.job_descriptions[idx], ...jobData };
        ldb.jd_skills = ldb.jd_skills.filter((js: any) => js.jd_id !== id);

        for (const skillName of skillsArray) {
          let skill = ldb.skills.find((s: any) => s.name.toLowerCase() === skillName.toLowerCase());
          if (!skill) {
            skill = { id: crypto.randomUUID(), name: skillName, category: 'Technical' };
            ldb.skills.push(skill);
          }
          ldb.jd_skills.push({ jd_id: id, skill_id: skill.id });
        }
        writeLocalDb(ldb);
      }
    }
  },

  deleteJob: async (id: string) => {
    if (isPostgres) {
      await pool.query('DELETE FROM job_descriptions WHERE id = $1', [id]);
    } else {
      const ldb = readLocalDb();
      ldb.job_descriptions = ldb.job_descriptions.filter((j: any) => j.id !== id);
      ldb.jd_skills = ldb.jd_skills.filter((js: any) => js.jd_id !== id);
      writeLocalDb(ldb);
    }
  },

  getJobById: async (id: string) => {
    if (!pool && !fs.existsSync(LOCAL_DB_PATH)) {
      await connectDb();
    }

    if (isPostgres) {
      const jobRes = await pool.query('SELECT * FROM job_descriptions WHERE id = $1', [id]);
      if (jobRes.rows.length === 0) return null;
      
      const skillsRes = await pool.query(
        `SELECT s.name FROM skills s 
         JOIN jd_skills js ON js.skill_id = s.id 
         WHERE js.jd_id = $1`,
        [id]
      );
      return {
        ...jobRes.rows[0],
        skills: skillsRes.rows.map((r: any) => r.name)
      };
    } else {
      const ldb = readLocalDb();
      const job = ldb.job_descriptions.find((j: any) => j.id === id);
      if (!job) return null;

      const matchedJdSkills = ldb.jd_skills.filter((js: any) => js.jd_id === id);
      const matchedSkillIds = matchedJdSkills.map((js: any) => js.skill_id);
      const jobSkills = ldb.skills
        .filter((s: any) => matchedSkillIds.includes(s.id))
        .map((s: any) => s.name);

      return {
        ...job,
        skills: jobSkills
      };
    }
  },

  getAllJobs: async () => {
    if (!pool && !fs.existsSync(LOCAL_DB_PATH)) {
      await connectDb();
    }

    if (isPostgres) {
      const jobsRes = await pool.query('SELECT * FROM job_descriptions ORDER BY created_at DESC');
      const jobs = jobsRes.rows;

      const enrichedJobs = [];
      for (const job of jobs) {
        const skillsRes = await pool.query(
          `SELECT s.name FROM skills s 
           JOIN jd_skills js ON js.skill_id = s.id 
           WHERE js.jd_id = $1`,
          [job.id]
        );
        enrichedJobs.push({
          ...job,
          skills: skillsRes.rows.map((r: any) => r.name)
        });
      }
      return enrichedJobs;
    } else {
      const ldb = readLocalDb();
      return ldb.job_descriptions.map((job: any) => {
        const matchedJdSkills = ldb.jd_skills.filter((js: any) => js.jd_id === job.id);
        const matchedSkillIds = matchedJdSkills.map((js: any) => js.skill_id);
        const jobSkills = ldb.skills
          .filter((s: any) => matchedSkillIds.includes(s.id))
          .map((s: any) => s.name);
        return {
          ...job,
          skills: jobSkills
        };
      }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  getSkills: async () => {
    if (!pool && !fs.existsSync(LOCAL_DB_PATH)) {
      await connectDb();
    }

    if (isPostgres) {
      const res = await pool.query('SELECT * FROM skills');
      return res.rows;
    } else {
      const ldb = readLocalDb();
      return ldb.skills;
    }
  }
};
