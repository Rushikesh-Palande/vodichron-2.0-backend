/**
 * Generate Weekly Timesheet Template Service
 * ===========================================
 * Generates a personalized Excel template for weekly timesheet submission
 * Pre-fills Sr. No and TASK ID columns based on employee's current task count
 */

import ExcelJS from 'exceljs';
import path from 'path';
import { logger, PerformanceTimer } from '../../../../utils/logger';
import { getEmployeeTaskCount } from '../../stores/get-employee-task-count.store';
import { formatTaskNumber } from '../../helpers/generate-task-id';

/**
 * Template Configuration
 * ----------------------
 * Defines which columns to pre-fill and how many rows to generate
 */
const TEMPLATE_CONFIG = {
  // Path to the base template file
  templatePath: path.join(process.cwd(), 'public', 'templates', 'weekly-timesheet-template.xlsx'),
  
  // Column letters in Excel (A, B, C, etc.)
  columns: {
    srNo: 'A',      // Sr. No column
    date: 'B',      // Date column (NEW) - template has Date in column B
    taskId: 'C',    // TASK ID column - template has Task_ID in column C
  },
  
  // Starting row for data (usually row 2 if row 1 has headers)
  dataStartRow: 2,
  
  // Number of pre-filled rows to generate (per day in weekly mode)
  numberOfRows: 3,
};

/**
 * Generate Personalized Weekly Timesheet Template
 * ------------------------------------------------
 * Creates an Excel file with pre-filled Sr. No and TASK ID columns
 * based on the employee's current task count
 * 
 * @param employeeId - UUID of the employee
 * @returns Buffer containing the personalized Excel file
 * 
 * @example
 * // Employee has completed 30 tasks
 * const buffer = await generateWeeklyTimesheetTemplate('employee-uuid');
 * // Excel will have:
 * // Row 2: Sr. No = 1, TASK ID = TASK031
 * // Row 3: Sr. No = 2, TASK ID = TASK032
 * // ... and so on
 */
export async function generateWeeklyTimesheetTemplate(
  employeeId: string,
  mode: 'daily' | 'weekly' = 'daily',
  selectedDate?: Date
): Promise<Buffer> {
  const timer = new PerformanceTimer('generateWeeklyTimesheetTemplate');
  
  try {
    logger.info('📄 Generating personalized weekly timesheet template', {
      employeeId,
      operation: 'generateWeeklyTimesheetTemplate'
    });

    // ==========================================================================
    // STEP 1: Get Employee's Current Task Count
    // ==========================================================================
    logger.debug('🔢 Fetching employee task count', { employeeId });
    
    const currentTaskCount = await getEmployeeTaskCount(employeeId);
    const nextTaskNumber = currentTaskCount + 1;
    
    logger.info('✅ Employee task count retrieved', {
      employeeId,
      currentTaskCount,
      nextTaskNumber,
      firstTaskId: `TASK${String(nextTaskNumber).padStart(3, '0')}`,
      message: 'This employee has ' + currentTaskCount + ' existing tasks, next task will be ' + nextTaskNumber
    });

    // ==========================================================================
    // STEP 2: Load Base Template File
    // ==========================================================================
    logger.debug('📂 Loading base template file', {
      templatePath: TEMPLATE_CONFIG.templatePath
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_CONFIG.templatePath);
    
    // Assume first worksheet
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) {
      throw new Error('Template file has no worksheets');
    }

    logger.debug('✅ Base template loaded', {
      worksheetName: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount
    });

    // ==========================================================================
    // STEP 3: Clear existing data and Pre-fill Sr. No, TASK ID, and Date Columns
    // ==========================================================================
    logger.debug('🧹 Clearing existing data from base template');
    
    // First, clear any existing data in Sr. No, Task ID, and Date columns (rows 2-100)
    for (let row = TEMPLATE_CONFIG.dataStartRow; row <= 100; row++) {
      const srNoCell = worksheet.getCell(`${TEMPLATE_CONFIG.columns.srNo}${row}`);
      const taskIdCell = worksheet.getCell(`${TEMPLATE_CONFIG.columns.taskId}${row}`);
      const dateCell = worksheet.getCell(`${TEMPLATE_CONFIG.columns.date}${row}`);
      srNoCell.value = null;
      taskIdCell.value = null;
      dateCell.value = null;
    }
    
    // ==========================================================================
    // STEP 4: Determine dates based on mode
    // ==========================================================================
    const dates: Date[] = [];
    const baseDate = selectedDate || new Date();
    
    if (mode === 'daily') {
      // Daily mode: only today's date
      dates.push(baseDate);
    } else {
      // Weekly mode: all 7 days (Monday to Sunday)
      const day = baseDate.getDay();
      const monday = new Date(baseDate);
      monday.setDate(baseDate.getDate() - day + (day === 0 ? -6 : 1));
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
      }
    }
    
    logger.debug('✏️ Pre-filling Sr. No, TASK ID, and Date columns', {
      mode,
      startRow: TEMPLATE_CONFIG.dataStartRow,
      numberOfRows: TEMPLATE_CONFIG.numberOfRows,
      startingTaskNumber: nextTaskNumber,
      daysCount: dates.length
    });

    let currentRow = TEMPLATE_CONFIG.dataStartRow;
    let taskNumber = nextTaskNumber;
    let srNo = 1;
    
    // For each date, generate rows
    for (const date of dates) {
      for (let i = 0; i < TEMPLATE_CONFIG.numberOfRows; i++) {
        const taskId = formatTaskNumber(taskNumber);
        
        // Format date as DD-MM-YYYY to match excel-parser.ts formatDateToIndian format
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}-${month}-${year}`;

        // Set Sr. No (Column A)
        const srNoCell = worksheet.getCell(`${TEMPLATE_CONFIG.columns.srNo}${currentRow}`);
        srNoCell.value = srNo;

        // Set Date (Column B)
        const dateCell = worksheet.getCell(`${TEMPLATE_CONFIG.columns.date}${currentRow}`);
        dateCell.value = dateStr;
        
        // Set TASK ID (Column C)
        const taskIdCell = worksheet.getCell(`${TEMPLATE_CONFIG.columns.taskId}${currentRow}`);
        taskIdCell.value = taskId;

        currentRow++;
        taskNumber++;
        srNo++;
      }
    }

    logger.info('✅ Columns pre-filled successfully', {
      rowsGenerated: TEMPLATE_CONFIG.numberOfRows,
      firstTaskId: formatTaskNumber(nextTaskNumber),
      lastTaskId: formatTaskNumber(nextTaskNumber + TEMPLATE_CONFIG.numberOfRows - 1)
    });

    // ==========================================================================
    // STEP 4: Generate Excel Buffer
    // ==========================================================================
    logger.debug('💾 Generating Excel buffer');
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    const duration = timer.end();
    
    logger.info('✅ Weekly timesheet template generated successfully', {
      employeeId,
      bufferSize: `${(Buffer.byteLength(buffer) / 1024).toFixed(2)} KB`,
      duration: `${duration}ms`
    });

    return Buffer.from(buffer);

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to generate weekly timesheet template', {
      employeeId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    throw new Error(`Failed to generate template: ${error.message}`);
  }
}

/**
 * Get Template Info
 * -----------------
 * Returns information about the template without generating it
 * Useful for preview or validation
 * 
 * @param employeeId - UUID of the employee
 * @returns Template info including next task IDs
 */
export async function getTemplateInfo(employeeId: string): Promise<{
  currentTaskCount: number;
  nextTaskNumber: number;
  firstTaskId: string;
  lastTaskId: string;
  numberOfRows: number;
}> {
  try {
    const currentTaskCount = await getEmployeeTaskCount(employeeId);
    const nextTaskNumber = currentTaskCount + 1;
    const firstTaskId = formatTaskNumber(nextTaskNumber);
    const lastTaskId = formatTaskNumber(nextTaskNumber + TEMPLATE_CONFIG.numberOfRows - 1);

    return {
      currentTaskCount,
      nextTaskNumber,
      firstTaskId,
      lastTaskId,
      numberOfRows: TEMPLATE_CONFIG.numberOfRows
    };
  } catch (error: any) {
    logger.error('❌ Failed to get template info', {
      employeeId,
      error: error.message
    });
    
    throw new Error(`Failed to get template info: ${error.message}`);
  }
}