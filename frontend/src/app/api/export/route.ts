import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appendJdToExcel } from '@/lib/excelService';

export const dynamic = 'force-dynamic';

// POST /api/export - Append selected JDs to Excel template preserving formatting
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const templateFile = formData.get('template') as File;
    const jobIdsString = formData.get('jobIds') as string;
    const optionsString = formData.get('options') as string;

    if (!templateFile) {
      return NextResponse.json({ error: 'Please upload an Excel template (.xlsx) file.' }, { status: 400 });
    }

    const jobIds = jobIdsString ? JSON.parse(jobIdsString) : [];
    const options = optionsString ? JSON.parse(optionsString) : {};

    if (jobIds.length === 0) {
      return NextResponse.json({ error: 'No job descriptions selected for export.' }, { status: 400 });
    }

    console.log(`[API Export] Exporting ${jobIds.length} Job Descriptions to template Excel...`);
    
    // Retrieve jobs from DB
    const jobsToExport = [];
    for (const id of jobIds) {
      const job = await db.getJobById(id);
      if (job) jobsToExport.push(job);
    }

    if (jobsToExport.length === 0) {
      return NextResponse.json({ error: 'Selected jobs could not be found.' }, { status: 400 });
    }

    // Load template excel into buffer
    const arrayBuffer = await templateFile.arrayBuffer();
    let excelBuffer: any = Buffer.from(arrayBuffer);

    // Sequentially append each job description, passing the updated buffer forward
    for (const job of jobsToExport) {
      excelBuffer = await appendJdToExcel(excelBuffer, job, {
        clientName: options.clientName,
        project: options.project,
        sheetName: options.sheetName
      });
    }

    // Return the binary spreadsheet buffer
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=AI_Recruitment_Demand_${Date.now()}.xlsx`
      }
    });
  } catch (err: any) {
    console.error('[API Export] Excel export failed:', err.message);
    return NextResponse.json({ error: 'Excel generation engine failed.', details: err.message }, { status: 500 });
  }
}
