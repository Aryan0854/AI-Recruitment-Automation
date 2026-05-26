import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseDocument } from '@/lib/parserService';
import { extractJdDetails } from '@/lib/aiService';

// Force dynamic execution since database files or postgres connections are dynamic
export const dynamic = 'force-dynamic';

// GET /api/jobs - List all processed Job Descriptions
export async function GET(request: NextRequest) {
  try {
    const jobs = await db.getAllJobs();
    
    // Read optional search params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const support_level = searchParams.get('support_level');
    const skill = searchParams.get('skill');

    let filtered = [...jobs];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(q) ||
        (j.department && j.department.toLowerCase().includes(q)) ||
        (j.raw_text && j.raw_text.toLowerCase().includes(q))
      );
    }

    if (department) {
      filtered = filtered.filter(j => j.department && j.department.toLowerCase() === department.toLowerCase());
    }

    if (support_level) {
      filtered = filtered.filter(j => j.support_level && j.support_level.toLowerCase() === support_level.toLowerCase());
    }

    if (skill) {
      filtered = filtered.filter(j => j.skills && j.skills.some((s: string) => s.toLowerCase() === skill.toLowerCase()));
    }

    return NextResponse.json(filtered);
  } catch (err: any) {
    console.error('[API GET Jobs] Error:', err.message);
    return NextResponse.json({ error: 'Failed to retrieve jobs catalog.' }, { status: 500 });
  }
}

// POST /api/jobs - Upload and instantly process JD document
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let uploadRecord: any = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No Job Description file uploaded.' }, { status: 400 });
    }

    const filename = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Create upload status log
    uploadRecord = await db.createUpload(filename);
    console.log(`[API Post Jobs] Started processing file: ${filename} (ID: ${uploadRecord.id})`);

    // 2. Extract text from Word/PDF
    const rawText = await parseDocument(filename, buffer);
    if (!rawText.trim()) {
      throw new Error('The uploaded document appears to be empty.');
    }

    // 3. AI NLP Information Extraction
    const extractedData = await extractJdDetails(rawText);
    extractedData.raw_text = rawText;

    // 4. Combine skills
    const skillsList = [
      ...(extractedData.skills || []),
      ...(extractedData.monitoring_tools || []),
      ...(extractedData.cloud_platforms || [])
    ];
    const uniqueSkills = [...new Set(skillsList)];

    // 5. Save Job Description to Database
    const savedJob = await db.createJob(extractedData, uniqueSkills);

    // 6. Complete upload log
    const processingTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    await db.updateUpload(uploadRecord.id, {
      status: 'Completed',
      processing_time: processingTime
    });

    console.log(`[API Post Jobs] Completed processing JD: ${filename} in ${processingTime}s`);
    return NextResponse.json({
      message: 'Job Description parsed and saved successfully!',
      job: savedJob,
      upload: { ...uploadRecord, status: 'Completed', processing_time: processingTime }
    }, { status: 201 });
  } catch (err: any) {
    const errorMsg = err.message || 'Processing failed.';
    console.error(`[API Post Jobs] Error processing file:`, errorMsg);
    
    if (uploadRecord) {
      await db.updateUpload(uploadRecord.id, {
        status: 'Failed',
        error_message: errorMsg
      });
    }

    return NextResponse.json({
      error: 'Parsing engine failure.',
      details: errorMsg
    }, { status: 500 });
  }
}
