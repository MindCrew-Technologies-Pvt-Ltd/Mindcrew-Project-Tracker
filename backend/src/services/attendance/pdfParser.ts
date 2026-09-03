/**
 * PDF attendance report parser.
 * Port of the Python pdf_parser.py — uses pdfjs-dist to extract text with positions,
 * then applies the same word-grouping and coordinate-matching logic.
 */

interface TimeObj { hours: number; minutes: number }

interface AttInfo {
  pdf_status: string;
  in_time: TimeObj | null;
  out_time: TimeObj | null;
  total: string;
  final_status?: string;
}

export interface EmployeeAttendance {
  emp_id: string;
  emp_name: string;
  attendance: Record<number, AttInfo>;
}

interface Word {
  text: string;
  x0: number;
  top: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseTime(str: string): TimeObj | null {
  if (!str || str === '.' || str === '-' || str === '00:00') return null;
  const m = str.match(/(\d{2}):(\d{2})/);
  if (!m) return null;
  return { hours: parseInt(m[1], 10), minutes: parseInt(m[2], 10) };
}

function groupWordsByLine(words: Word[], tolerance = 5): Word[][] {
  const sorted = [...words].sort((a, b) => a.top - b.top || a.x0 - b.x0);
  const lines: Word[][] = [];
  let currentLine: Word[] = [];
  let currentTop: number | null = null;

  for (const w of sorted) {
    if (currentTop === null) {
      currentTop = w.top;
      currentLine.push(w);
    } else if (Math.abs(w.top - currentTop) <= tolerance) {
      currentLine.push(w);
    } else {
      currentLine.sort((a, b) => a.x0 - b.x0);
      lines.push(currentLine);
      currentTop = w.top;
      currentLine = [w];
    }
  }
  if (currentLine.length) {
    currentLine.sort((a, b) => a.x0 - b.x0);
    lines.push(currentLine);
  }
  return lines;
}

// ── Main parser ─────────────────────────────────────────────────────

export async function parsePdfReport(
  pdfBytes: Buffer | Uint8Array
): Promise<{ attendanceData: EmployeeAttendance[]; datesList: Date[] }> {
  // Dynamic import for pdfjs-dist (ESM-style in Node)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes, useSystemFonts: true });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  // Collect all words across all pages
  const allPagesWords: Word[][] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const words: Word[] = [];
    for (const item of textContent.items) {
      if (!('str' in item) || !(item as any).str) continue;
      const it = item as any;
      // pdfjs gives transform[4]=x, transform[5]=y (from bottom-left)
      // Convert y to top-down
      const x0 = it.transform[4];
      const yBottom = it.transform[5];
      const top = viewport.height - yBottom;
      // Split multi-word items
      const parts = (it.str as string).split(/\s+/).filter(Boolean);
      let offset = 0;
      for (const part of parts) {
        words.push({ text: part, x0: x0 + offset * 5, top });
        offset += part.length;
      }
    }
    allPagesWords.push(words);
  }

  // ── Step 1: Find day x-coordinates from first page with "Days 1 ..." ──
  const dayCoords: Record<number, number> = {};
  let monthDate: Date = new Date();

  for (let pi = 0; pi < allPagesWords.length; pi++) {
    const lines = groupWordsByLine(allPagesWords[pi]);

    // Extract month/year from first page
    if (pi === 0) {
      const fullText = allPagesWords[pi].map(w => w.text).join(' ');
      const mm = fullText.match(/([A-Za-z]+)\s+\d{2}\s+(\d{4})\s+To/);
      if (mm) {
        const monthNames: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const mIdx = monthNames[mm[1].substring(0, 3)];
        if (mIdx !== undefined) {
          monthDate = new Date(parseInt(mm[2], 10), mIdx, 1);
        }
      }
    }

    for (const line of lines) {
      const lineText = line.map(w => w.text).join(' ');
      if (lineText.startsWith('Days 1') || lineText.startsWith('Days  1')) {
        for (const w of line) {
          const n = parseInt(w.text, 10);
          if (!isNaN(n) && n >= 1 && n <= 31) {
            dayCoords[n] = w.x0;
          }
        }
        break;
      }
    }
    if (Object.keys(dayCoords).length > 0) break;
  }

  if (Object.keys(dayCoords).length === 0) {
    throw new Error(
      'Could not extract day columns from the PDF. Make sure it is a digital PDF (not a scanned image).'
    );
  }

  const numDays = Math.max(...Object.keys(dayCoords).map(Number));
  const datesList: Date[] = [];
  for (let i = 1; i <= numDays; i++) {
    datesList.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), i));
  }

  // ── Step 2: Extract employee attendance data ──
  const attendanceData: EmployeeAttendance[] = [];
  let currentEmp: EmployeeAttendance | null = null;

  function closestDay(x: number): number | null {
    let minDist = Infinity;
    let closest: number | null = null;
    for (const [dayStr, dx] of Object.entries(dayCoords)) {
      const dist = Math.abs(x - dx);
      if (dist < minDist) {
        minDist = dist;
        closest = parseInt(dayStr, 10);
      }
    }
    return closest !== null && minDist < 15 ? closest : null;
  }

  for (const pageWords of allPagesWords) {
    const lines = groupWordsByLine(pageWords);

    for (const line of lines) {
      const lineText = line.map(w => w.text).join(' ');

      // Detect employee header
      if (lineText.includes('Emp. Code') && lineText.includes('Emp. Name')) {
        if (currentEmp) attendanceData.push(currentEmp);

        const codeMatch = lineText.match(/Emp\.\s*Code\s*:\s*(\w+)/);
        const nameMatch = lineText.match(/Emp\.\s*Name\s*:\s*(.+)/);

        let empId = codeMatch ? codeMatch[1] : 'Unknown';
        if (!empId.toUpperCase().startsWith('MCT')) empId = `MCT- ${empId}`;
        const empName = nameMatch ? nameMatch[1].trim() : 'Unknown';

        const attendance: Record<number, AttInfo> = {};
        for (let i = 1; i <= numDays; i++) {
          attendance[i] = { pdf_status: 'A', in_time: null, out_time: null, total: '00:00' };
        }
        currentEmp = { emp_id: empId, emp_name: empName, attendance };
      }

      // Status row
      else if (lineText.startsWith('Status') && currentEmp) {
        for (const w of line.slice(1)) {
          const day = closestDay(w.x0);
          if (day) currentEmp.attendance[day].pdf_status = w.text;
        }
      }

      // InTime row
      else if (lineText.startsWith('InTime') && currentEmp) {
        for (const w of line.slice(1)) {
          const day = closestDay(w.x0);
          if (day) {
            const tm = parseTime(w.text);
            if (tm) currentEmp.attendance[day].in_time = tm;
          }
        }
      }

      // OutTime row
      else if (lineText.startsWith('OutTime') && currentEmp) {
        for (const w of line.slice(1)) {
          const day = closestDay(w.x0);
          if (day) {
            const tm = parseTime(w.text);
            if (tm) currentEmp.attendance[day].out_time = tm;
          }
        }
      }

      // Total row
      else if (lineText.startsWith('Total') && currentEmp) {
        for (const w of line.slice(1)) {
          const day = closestDay(w.x0);
          if (day) currentEmp.attendance[day].total = w.text;
        }
      }
    }
  }

  if (currentEmp) attendanceData.push(currentEmp);

  // ── Step 3: Apply business logic for final status ──
  const time10_45 = { hours: 10, minutes: 45 };

  for (const emp of attendanceData) {
    for (let dayIdx = 0; dayIdx < datesList.length; dayIdx++) {
      const dayNum = dayIdx + 1;
      const att = emp.attendance[dayNum];
      if (!att) continue;

      const currentDate = datesList[dayIdx];
      const dayOfWeek = currentDate.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let finalStatus = 'A';

      if (isWeekend) {
        finalStatus = 'Weekly Off';
      } else if (att.pdf_status === 'WO') {
        finalStatus = 'Weekly Off';
      } else if (!att.in_time && !att.out_time) {
        finalStatus = 'A';
      } else {
        let durationHours = 0;

        // Parse total time
        if (att.total !== '00:00' && att.total.includes(':')) {
          const parts = att.total.split(':');
          if (parts.length === 2) {
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (!isNaN(h) && !isNaN(m)) durationHours = h + m / 60;
          }
        }

        // Fallback: calculate from in/out times
        if (durationHours === 0 && att.in_time && att.out_time) {
          let inMinutes = att.in_time.hours * 60 + att.in_time.minutes;
          let outMinutes = att.out_time.hours * 60 + att.out_time.minutes;
          if (outMinutes < inMinutes) outMinutes += 24 * 60;
          durationHours = (outMinutes - inMinutes) / 60;
        }

        if (durationHours < 4.5) {
          finalStatus = 'A';
        } else if (durationHours < 6.5) {
          finalStatus = 'HD';
        } else if (
          att.in_time &&
          (att.in_time.hours > time10_45.hours ||
            (att.in_time.hours === time10_45.hours && att.in_time.minutes > time10_45.minutes))
        ) {
          finalStatus = 'SL';
        } else if (durationHours < 9.0) {
          const remainingMinutes = (9.0 - durationHours) * 60;
          finalStatus = remainingMinutes <= 20 ? 'P' : 'SL';
        } else {
          finalStatus = 'P';
        }
      }

      att.final_status = finalStatus;
    }
  }

  return { attendanceData, datesList };
}
