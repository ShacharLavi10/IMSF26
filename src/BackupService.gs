/**
 * BackupService.gs
 * Handles automated daily backups of the Production spreadsheets:
 * 1. Master Sheet (אורחים)
 * 2. Anat Flights Sheet (טיסות ענת)
 * 3. Artists Sheet (אומנים 26)
 *
 * Folder structure:
 * Parent Folder: 1Rk6Ahmjxch_zOMvif_Ey9V7UvadYrWZz
 *   └── Daily Folder (e.g. 2026-11-09)
 *         ├── BACKUP_MASTER_2026-11-09_03-00
 *         ├── BACKUP_FLIGHTS_2026-11-09_03-00
 *         └── BACKUP_ARTISTS_2026-11-09_03-00
 *
 * Retention policy:
 * Keeps the 7 most recent daily folders. Older daily folders are automatically moved to trash.
 */

function createDailyBackup(forceRun = false) {
  // Guard: Run only in Production environment (unless explicitly forced for testing)
  if (typeof IS_PROD !== 'undefined' && !IS_PROD && !forceRun) {
    Logger.log('Daily backup skipped: Sandbox environment. Automated backups run exclusively on Production.');
    return { success: false, reason: 'Sandbox environment - backup skipped' };
  }

  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const dayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const timestampStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd_HH-mm');

  // Explicit Production Sheet IDs
  const PROD_SHEETS = {
    MASTER: (typeof ENVIRONMENTS !== 'undefined' && ENVIRONMENTS.PRODUCTION && ENVIRONMENTS.PRODUCTION.MASTER_SPREADSHEET_ID)
      ? ENVIRONMENTS.PRODUCTION.MASTER_SPREADSHEET_ID
      : "17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos",
    FLIGHTS: (typeof ENVIRONMENTS !== 'undefined' && ENVIRONMENTS.PRODUCTION && ENVIRONMENTS.PRODUCTION.ANAT_SPREADSHEET_ID)
      ? ENVIRONMENTS.PRODUCTION.ANAT_SPREADSHEET_ID
      : "1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M",
    ARTISTS: (typeof ENVIRONMENTS !== 'undefined' && ENVIRONMENTS.PRODUCTION && ENVIRONMENTS.PRODUCTION.ARTISTS_SPREADSHEET_ID)
      ? ENVIRONMENTS.PRODUCTION.ARTISTS_SPREADSHEET_ID
      : "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ"
  };

  const parentFolderId = (typeof ENVIRONMENTS !== 'undefined' && ENVIRONMENTS.PRODUCTION && ENVIRONMENTS.PRODUCTION.BACKUP_FOLDER_ID)
    ? ENVIRONMENTS.PRODUCTION.BACKUP_FOLDER_ID
    : "1Rk6Ahmjxch_zOMvif_Ey9V7UvadYrWZz";

  try {
    const parentFolder = DriveApp.getFolderById(parentFolderId);

    // 1. Get or create today's subfolder (named yyyy-MM-dd)
    let todayFolder = null;
    const existingFolders = parentFolder.getFoldersByName(dayStr);
    if (existingFolders.hasNext()) {
      todayFolder = existingFolders.next();
      // If folder already exists today, remove earlier files to avoid duplicates
      const filesInToday = todayFolder.getFiles();
      while (filesInToday.hasNext()) {
        filesInToday.next().setTrashed(true);
      }
    } else {
      todayFolder = parentFolder.createFolder(dayStr);
    }

    // 2. Backup Master Sheet (אורחים)
    try {
      const masterFile = DriveApp.getFileById(PROD_SHEETS.MASTER);
      masterFile.makeCopy(`BACKUP_MASTER_${timestampStr}`, todayFolder);
      Logger.log(`Master sheet backed up into folder ${dayStr}`);
    } catch (e) {
      Logger.log('Failed to backup Master sheet: ' + e.toString());
    }

    // 3. Backup Anat Flights Sheet (טיסות ענת)
    try {
      const anatFile = DriveApp.getFileById(PROD_SHEETS.FLIGHTS);
      anatFile.makeCopy(`BACKUP_FLIGHTS_${timestampStr}`, todayFolder);
      Logger.log(`Anat flights sheet backed up into folder ${dayStr}`);
    } catch (e) {
      Logger.log('Failed to backup Anat sheet: ' + e.toString());
    }

    // 4. Backup Artists 26 Sheet (אומנים 26)
    try {
      const artistsFile = DriveApp.getFileById(PROD_SHEETS.ARTISTS);
      artistsFile.makeCopy(`BACKUP_ARTISTS_${timestampStr}`, todayFolder);
      Logger.log(`Artists sheet (אומנים 26) backed up into folder ${dayStr}`);
    } catch (e) {
      Logger.log('Failed to backup Artists sheet: ' + e.toString());
    }

    // 5. Retention: Keep only the 7 most recent daily folders (trash older ones)
    pruneOldDailyBackupFolders(parentFolder, 7);

    Logger.log('Daily backup completed successfully for ' + dayStr);
    return { success: true, date: dayStr, folderId: todayFolder.getId() };

  } catch (err) {
    Logger.log('Error in daily backup: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Prunes backup folders older than maxFoldersToKeep (keeps the 7 most recent).
 * Only targets subfolders matching date format yyyy-MM-dd.
 */
function pruneOldDailyBackupFolders(parentFolder, maxFoldersToKeep) {
  try {
    const dailyFolders = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const foldersIter = parentFolder.getFolders();

    while (foldersIter.hasNext()) {
      const folder = foldersIter.next();
      const name = folder.getName();
      if (dateRegex.test(name)) {
        dailyFolders.push({
          folder: folder,
          name: name
        });
      }
    }

    // Sort descending (newest date first)
    dailyFolders.sort((a, b) => b.name.localeCompare(a.name));

    // Trash any folder beyond the newest maxFoldersToKeep
    if (dailyFolders.length > maxFoldersToKeep) {
      for (let i = maxFoldersToKeep; i < dailyFolders.length; i++) {
        Logger.log(`Pruning old backup folder: ${dailyFolders[i].name}`);
        dailyFolders[i].folder.setTrashed(true);
      }
    }
  } catch (e) {
    Logger.log('Error pruning old daily backup folders: ' + e.toString());
  }
}

