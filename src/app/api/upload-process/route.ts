import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { parseDocument } from '../../../lib/parserService';
import { extractJdDetails } from '../../../lib/aiService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('[Serverless API] Received request to process JDs and Excel template...');
    
    // Parse multipart form data
    const formData = await req.formData();
    const jdsFiles = formData.getAll('jds') as File[];
    const templateFile = formData.get('template') as File;

    if (!jdsFiles || jdsFiles.length === 0) {
      return NextResponse.json({ detail: 'Missing Job Description files (.jds)' }, { status: 400 });
    }
    if (!templateFile) {
      return NextResponse.json({ detail: 'Missing Excel template file' }, { status: 400 });
    }

    console.log(`[Serverless API] Processing ${jdsFiles.length} JD files and Excel: ${templateFile.name}`);

    // Load Excel template workbook
    const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer as any);

    // Identify target worksheet
    let targetSheetName = 'BR _Raw Data';
    let sheet = workbook.getWorksheet(targetSheetName);

    if (!sheet) {
      const candidates = ['Global TMH Demand an_21Oct_1715', 'BR _Raw Data', 'BR_Raw Data'];
      for (const name of candidates) {
        sheet = workbook.getWorksheet(name);
        if (sheet) {
          targetSheetName = name;
          break;
        }
      }
    }

    if (!sheet) {
      sheet = workbook.worksheets[0];
      targetSheetName = sheet.name;
    }

    console.log(`[Serverless API] Target worksheet selected: "${targetSheetName}"`);

    // Scan backwards to find the last row containing actual data
    let lastDataRow = 1;
    for (let r = sheet.rowCount; r >= 1; r--) {
      const row = sheet.getRow(r);
      let hasData = false;
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
          hasData = true;
        }
      });
      if (hasData) {
        lastDataRow = r;
        break;
      }
    }

    console.log(`[Serverless API] Last non-empty row index detected: ${lastDataRow}`);

    // Read column headers (Row 1)
    const headers: string[] = [];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
    });

    // Process each JD file sequentially
    for (const jdFile of jdsFiles) {
      const filename = jdFile.name;
      console.log(`[Serverless API] Processing JD file: ${filename}`);

      // Read file buffer
      const jdBuffer = Buffer.from(await jdFile.arrayBuffer());

      // Parse document text (supports DOCX and PDF)
      const rawText = await parseDocument(filename, jdBuffer);
      if (!rawText.trim()) {
        console.warn(`[Serverless API] Skipping empty JD file: ${filename}`);
        continue;
      }

      // Extract details (Structured OpenAI prompt with dynamic regex fallback)
      const jdDetails = await extractJdDetails(rawText);

      // Determine template cell and new row indices
      const templateRowIndex = lastDataRow >= 2 ? lastDataRow : 2;
      const templateRow = sheet.getRow(templateRowIndex);
      const newRowIndex = lastDataRow + 1;
      const newRow = sheet.getRow(newRowIndex);

      console.log(`[Serverless API] Appending row at index ${newRowIndex}. Base template index: ${templateRowIndex}`);

      // Calculate sequential requirement ID auto-increment
      let newAutoReqId = '';
      try {
        const idIndex = headers.indexOf('Auto req ID');
        if (idIndex !== -1) {
          const lastIdVal = templateRow.getCell(idIndex).value;
          if (lastIdVal && typeof lastIdVal === 'string' && lastIdVal.endsWith('BR')) {
            const numPart = parseInt(lastIdVal.replace('BR', ''), 10);
            if (!isNaN(numPart)) {
              newAutoReqId = `${numPart + 1}BR`;
            }
          }
        }
      } catch (err: any) {
        console.warn('[Serverless API] Auto Req ID increment failed, falling back to random ID:', err.message);
      }

      if (!newAutoReqId) {
        newAutoReqId = `${Math.floor(40000 + Math.random() * 9999)}BR`;
      }

      // Conjoin skills list
      const allSkills = [
        ...(jdDetails.skills || []),
        ...(jdDetails.monitoring_tools || []),
        ...(jdDetails.cloud_platforms || [])
      ];
      const uniqueSkills = [...new Set(allSkills)].join(', ');

      const currentDateString = new Date().toISOString().split('T')[0];

      // Map values to columns
      const fieldMapping: { [key: string]: any } = {
        'Auto req ID': newAutoReqId,
        'Current Req Status': 'Open',
        'Grade': jdDetails.support_level === 'L3' ? 'E4' : 'E3',
        'Designation': jdDetails.job_title,
        'Recruiter': '',
        'Department Type': 'Technical',
        'BU': 'ITS - TMH - Delivery',
        'Client Interview?': 'Yes',
        'Mandatory Skills': uniqueSkills,
        'Entity': 'OFFSHORE',
        'Client Name': 'IRON MOUNTAIN',
        'Billing Type': 'Billable',
        'Project': 'IM DXP-IDP 2025',
        'Requester ID': '1026374',
        'TAG Manager': 'Antony, Nithin (1027544)',
        'RM Name': 'Hippargi, Anil (1017237)',
        'Job description': rawText.substring(0, 5000),
        'Joining Location': 'Bangalore - Global Axis',
        'Backfill for Employee Name': '',
        'Date Approved': currentDateString,
        'No. of Positions': 1,
        'Positions Remaining': 1,
        'Sourcing Type': 'External - India',
        'Requirement Type': 'New',
        'ST (Bill Rate) Enter only numeric value and 0 for Non-Billable': 5.5
      };

      // Set cell values and copy cell-level styles from template row
      for (let c = 1; c < headers.length; c++) {
        const headerName = headers[c];
        if (!headerName) continue;

        const newCell = newRow.getCell(c);
        const templateCell = templateRow.getCell(c);

        if (headerName in fieldMapping) {
          newCell.value = fieldMapping[headerName];
        } else {
          newCell.value = '';
        }

        // Deep-copy template cell formatting to new row
        if (templateCell) {
          newCell.font = templateCell.font ? JSON.parse(JSON.stringify(templateCell.font)) : undefined;
          newCell.fill = templateCell.fill ? JSON.parse(JSON.stringify(templateCell.fill)) : undefined;
          newCell.border = templateCell.border ? JSON.parse(JSON.stringify(templateCell.border)) : undefined;
          newCell.alignment = templateCell.alignment ? JSON.parse(JSON.stringify(templateCell.alignment)) : undefined;
          newCell.numFmt = templateCell.numFmt;
        }
      }

      newRow.commit();
      
      // Update lastDataRow index so next JD appends sequentially
      lastDataRow = newRowIndex;
    }

    // Write final output workbook to buffer
    const finalBuffer = await workbook.xlsx.writeBuffer();
    console.log('[Serverless API] Generated workbook buffer successfully!');

    // Stream updated spreadsheet back to browser
    return new Response(finalBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="updated_${templateFile.name}"`,
      },
    });

  } catch (err: any) {
    console.error('[Serverless API] Error processing uploads:', err.message);
    return NextResponse.json({ detail: `Spreadsheet processing error: ${err.message}` }, { status: 500 });
  }
}
