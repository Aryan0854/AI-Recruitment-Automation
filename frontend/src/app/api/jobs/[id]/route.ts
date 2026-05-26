import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/jobs/[id] - Get details of a single job
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const job = await db.getJobById(id);
    if (!job) {
      return NextResponse.json({ error: 'Job description not found.' }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (err: any) {
    console.error(`[API GET Job Detail] Error for id ${id}:`, err.message);
    return NextResponse.json({ error: 'Failed to retrieve job details.' }, { status: 500 });
  }
}

// PUT /api/jobs/[id] - Edit and correct extracted details manually
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title, department, experience, support_level, employment_type, shift_timing, skills } = body;

    if (!title) {
      return NextResponse.json({ error: 'Job title is required.' }, { status: 400 });
    }

    const existingJob = await db.getJobById(id);
    if (!existingJob) {
      return NextResponse.json({ error: 'Job Description not found.' }, { status: 404 });
    }

    const updatedData = {
      title,
      department: department || '',
      experience: experience || '',
      support_level: support_level || '',
      employment_type: employment_type || 'Full Time',
      shift_timing: shift_timing || ''
    };

    const uniqueSkills = Array.isArray(skills) ? [...new Set(skills)] : [];
    
    await db.updateJob(id, updatedData, uniqueSkills);
    console.log(`[API PUT Job] Manually updated JD ID ${id}: ${title}`);
    
    return NextResponse.json({
      message: 'Job details updated successfully!',
      job: { id, ...updatedData, skills: uniqueSkills }
    });
  } catch (err: any) {
    console.error(`[API PUT Job] Error updating id ${id}:`, err.message);
    return NextResponse.json({ error: 'Failed to save job updates.' }, { status: 500 });
  }
}

// DELETE /api/jobs/[id] - Delete a job description
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const existingJob = await db.getJobById(id);
    if (!existingJob) {
      return NextResponse.json({ error: 'Job Description not found.' }, { status: 404 });
    }
    
    await db.deleteJob(id);
    console.log(`[API DELETE Job] Deleted JD ID ${id}: ${existingJob.title}`);
    
    return NextResponse.json({ message: 'Job description deleted successfully.' });
  } catch (err: any) {
    console.error(`[API DELETE Job] Error deleting id ${id}:`, err.message);
    return NextResponse.json({ error: 'Failed to delete job description.' }, { status: 500 });
  }
}
