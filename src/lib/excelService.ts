import ExcelJS from 'exceljs';
import fs from 'fs';

/**
 * Automatically maps extracted JD details to column headers in Excel template,
 * copies style formatting from preceding row, and appends the new record.
 * 
 * @param templateInput - Excel workbook buffer or file path
 * @param jdDetails - Structured Job Description JSON from AI engine
 * @param options - Manual overrides like custom client name, target sheet, etc.
 * @returns Updated Excel workbook as a Buffer
 */
export const appendJdToExcel = async (
  templateInput: any, 
  jdDetails: any, 
  options: any = {}
): Promise<any> => {
  try {
    console.log('[Excel] Opening Excel template using exceljs...');
    const workbook = new ExcelJS.Workbook();

    if (Buffer.isBuffer(templateInput)) {
      await workbook.xlsx.load(templateInput as any);
    } else if (typeof templateInput === 'string' && fs.existsSync(templateInput)) {
      await workbook.xlsx.readFile(templateInput);
    } else {
      throw new Error('Invalid Excel template input. File not found or empty buffer.');
    }

    // Identify target sheet
    let targetSheetName = options.sheetName || 'BR _Raw Data';
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

    console.log(`[Excel] Target sheet: "${targetSheetName}" (total rows: ${sheet.actualRowCount})`);

    const totalRows = sheet.actualRowCount;
    const headerRow = sheet.getRow(1);
    
    // Read headers
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
    });

    const templateRowIndex = totalRows >= 2 ? totalRows : 2;
    const templateRow = sheet.getRow(templateRowIndex);

    // Generate Incremental Auto req ID
    let newAutoReqId = options.autoReqId;
    if (!newAutoReqId) {
      try {
        let idIndex = headers.indexOf('Auto req ID');
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
        console.warn('[Excel] Failed to parse last Auto req ID for incrementing:', err.message);
      }
      
      if (!newAutoReqId) {
        newAutoReqId = `${Math.floor(40000 + Math.random() * 9999)}BR`;
      }
    }

    const currentDateString = new Date().toISOString().split('T')[0];
    const clientName = options.clientName || jdDetails.client_name || 'IRON MOUNTAIN';
    const project = options.project || 'IM DXP-IDP 2025';
    
    const allSkills = [
      ...(jdDetails.skills || []),
      ...(jdDetails.monitoring_tools || []),
      ...(jdDetails.cloud_platforms || [])
    ];
    const uniqueSkills = [...new Set(allSkills)].join(', ');

    // Mapping fields
    const fieldMapping: { [key: string]: any } = {
      'Auto req ID': newAutoReqId,
      'Current Req Status': 'Open',
      'Grade': jdDetails.support_level === 'L3' ? 'E4' : 'E3',
      'Designation': jdDetails.job_title,
      'Recruiter': options.recruiter || '',
      'Department Type': 'Technical',
      'BU': 'ITS - TMH - Delivery',
      'Client Interview?': 'Yes',
      'Mandatory Skills': uniqueSkills,
      'Entity': 'OFFSHORE',
      'Client Name': clientName,
      'Billing Type': 'Billable',
      'Project': project,
      'Requester ID': options.requesterId || '1026374',
      'TAG Manager': options.tagManager || 'Antony, Nithin (1027544)',
      'RM Name': options.rmName || 'Hippargi, Anil (1017237)',
      'Job description': jdDetails.raw_text || '',
      'Joining Location': options.joiningLocation || 'Bangalore - Global Axis',
      'Backfill for Employee Name': '',
      'Date Approved': currentDateString,
      'No. of Positions': 1,
      'Positions Remaining': 1,
      'Sourcing Type': 'External - India',
      'Requirement Type': 'New',
      'ST (Bill Rate) Enter only numeric value and 0 for Non-Billable': 5.5
    };

    const newRowIndex = totalRows + 1;
    const newRow = sheet.getRow(newRowIndex);

    console.log(`[Excel] Appending new row at index ${newRowIndex}. Auto Req ID: ${newAutoReqId}`);

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

      if (templateCell) {
        newCell.font = templateCell.font ? JSON.parse(JSON.stringify(templateCell.font)) : undefined;
        newCell.fill = templateCell.fill ? JSON.parse(JSON.stringify(templateCell.fill)) : undefined;
        newCell.border = templateCell.border ? JSON.parse(JSON.stringify(templateCell.border)) : undefined;
        newCell.alignment = templateCell.alignment ? JSON.parse(JSON.stringify(templateCell.alignment)) : undefined;
        newCell.numFmt = templateCell.numFmt;
      }
    }

    newRow.commit();

    const buffer = await workbook.xlsx.writeBuffer() as any;
    console.log('[Excel] Generated workbook buffer successfully!');
    return buffer;
  } catch (err: any) {
    console.error('[Excel] Excel population failed:', err.message);
    throw new Error(`Excel population failed: ${err.message}`);
  }
};
