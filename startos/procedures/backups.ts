import { setupBackups } from '@start9labs/start-sdk/lib/backup/setupBackups'
import { Manifest } from '../manifest'
/**
 * Here we define what volumes from the Manifest to include in backups
 */
export const { createBackup, restoreBackup } = setupBackups<Manifest>('main')
