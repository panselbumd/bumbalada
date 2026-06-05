// Export utilities for SIPSELBUMD
export async function exportToExcel(data: unknown[], filename: string): Promise<void> {
  console.log('Export to Excel:', filename, data)
}

export async function exportRekapPDF(data: unknown): Promise<void> {
  console.log('Export PDF:', data)
}

export async function exportAuditLogCSV(data: unknown[]): Promise<void> {
  console.log('Export Audit CSV:', data)
}
