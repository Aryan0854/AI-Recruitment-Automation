import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseDocument } from '@/lib/parserService';

export const dynamic = 'force-dynamic';

// POST /api/match-resume - Match uploaded candidate resume against target Job Description
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File;
    const jobId = formData.get('jobId') as string;

    if (!resumeFile) {
      return NextResponse.json({ error: 'Please upload a candidate Resume (.pdf/.docx).' }, { status: 400 });
    }

    if (!jobId) {
      return NextResponse.json({ error: 'A target Job ID is required to run resume matching.' }, { status: 400 });
    }

    // 1. Fetch JD info
    const job = await db.getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job description not found.' }, { status: 404 });
    }

    // 2. Parse resume text
    const filename = resumeFile.name;
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resumeText = await parseDocument(filename, buffer);
    const lowercaseResume = resumeText.toLowerCase();

    // 3. Perform Overlap Match
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    
    job.skills.forEach((skill: string) => {
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      if (regex.test(lowercaseResume)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    // 4. Calculate ATS compatibility percentage score
    const totalRequired = job.skills.length;
    const matchCount = matchedSkills.length;
    const compatibilityScore = totalRequired > 0 
      ? Math.round((matchCount / totalRequired) * 100)
      : 80;

    const rating = compatibilityScore >= 80 ? 'Highly Compatible' : compatibilityScore >= 50 ? 'Medium Compatibility' : 'Low Compatibility';

    console.log(`[API Match Resume] Completed match for job: "${job.title}". Score: ${compatibilityScore}%`);

    return NextResponse.json({
      job_title: job.title,
      candidate_name: filename.split('.')[0].replace(/_|-/g, ' '),
      score: compatibilityScore,
      rating,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      summary: `Resume parsed successfully. Match scanner aligned overlaps for candidate qualifications.`,
      recommendation: rating === 'Highly Compatible' 
        ? 'Schedule direct interview. Highly aligned skill alignment.'
        : rating === 'Medium Compatibility'
        ? 'Conduct initial HR phone screening. Missing some specific platforms or tools.'
        : 'Reject candidate or pool for other positions.'
    });
  } catch (err: any) {
    console.error('[API Match Resume] Resume matching failed:', err.message);
    return NextResponse.json({ error: 'ATS resume matching engine failed.', details: err.message }, { status: 500 });
  }
}
