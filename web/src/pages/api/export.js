import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { exportFiles } from '@/lib/cli';
import { getUpload, updateUploadStatus, saveExport, getAnalysisResult } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, action, topN, exportType } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    const upload = getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const packDir = upload.folder_path;

    if (action === 'export-top') {
      // Export top N files
      const analysisIndexPath = path.join(packDir, 'analysis', 'analysis_index.json');
      const exportsDir = path.join(packDir, 'exports');

      await exportFiles(analysisIndexPath, {
        top: topN || 10,
        output: exportsDir,
        verbose: true,
      });

      // Read report
      let report = '';
      try {
        report = await fs.readFile(path.join(exportsDir, 'report.md'), 'utf-8');
      } catch {}

      // Save to database
      saveExport({
        id: uuidv4(),
        upload_id: uploadId,
        export_type: 'top-n',
        output_path: exportsDir,
        manifest_json: JSON.stringify({ topN, report }),
      });

      return res.status(200).json({
        success: true,
        action: 'export-top',
        outputDir: 'exports',
        report,
      });
    }

    if (action === 'download') {
      // Create ZIP archive
      let sourceDir;
      let zipName;

      switch (exportType) {
        case 'stems_8':
          sourceDir = path.join(packDir, 'stems_8');
          zipName = 'stems_8.zip';
          break;
        case 'br864_ready':
          sourceDir = path.join(packDir, 'br864_ready');
          zipName = 'br864_ready.zip';
          break;
        case 'exports':
          sourceDir = path.join(packDir, 'exports');
          zipName = 'exports.zip';
          break;
        default:
          return res.status(400).json({ error: 'Invalid exportType' });
      }

      // Check if directory exists
      try {
        await fs.access(sourceDir);
      } catch {
        return res.status(404).json({ error: `${exportType} directory not found. Run the appropriate pipeline step first.` });
      }

      // Create ZIP
      const zipPath = path.join(packDir, zipName);
      const output = (await import('fs')).createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(sourceDir, false);

      await archive.finalize();

      // Wait for output to close
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      // Return download URL
      return res.status(200).json({
        success: true,
        action: 'download',
        downloadPath: `/api/download?uploadId=${uploadId}&file=${zipName}`,
        size: archive.pointer(),
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: error.message });
  }
}
