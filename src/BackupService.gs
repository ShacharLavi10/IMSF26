/**
 * BackupService.gs
 * Handles automated daily backups of the main and flight sheets.
 */

function createDailyBackup() {
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const fileId = ss.getId();
    const file = DriveApp.getFileById(fileId);
    
    const parentFolderId = "1Rk6Ahmjxch_zOMvif_Ey9V7UvadYrWZz";
    const parentFolder = DriveApp.getFolderById(parentFolderId);
    
    let backupFolder = null;
    const folders = parentFolder.getFoldersByName('IMSF 2026 Backups');
    if (folders.hasNext()) {
      backupFolder = folders.next();
    } else {
      backupFolder = parentFolder.createFolder('IMSF 2026 Backups');
    }
    
    // Trash old backups in this folder to prevent endless accumulation
    const oldFiles = backupFolder.getFiles();
    while (oldFiles.hasNext()) {
      oldFiles.next().setTrashed(true);
    }
    
    file.makeCopy(`BACKUP_MASTER_${dateStr}`, backupFolder);
    
    if (CONFIG.ANAT_SPREADSHEET_ID && CONFIG.ANAT_SPREADSHEET_ID !== 'YOUR_ANAT_SPREADSHEET_ID_HERE') {
      try {
        const anatFile = DriveApp.getFileById(CONFIG.ANAT_SPREADSHEET_ID);
        anatFile.makeCopy(`BACKUP_FLIGHTS_${dateStr}`, backupFolder);
      } catch (e) {
        Logger.log('Failed to backup Anat sheet: ' + e.toString());
      }
    }
    
    Logger.log('Backup completed successfully.');
    
  } catch (err) {
    Logger.log('Error in daily backup: ' + err.toString());
  }
}

