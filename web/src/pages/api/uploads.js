import { getAllUploads, getUpload, getAnalysisResult } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId } = req.query;

    if (uploadId) {
      // Get specific upload with details
      const upload = getUpload(uploadId);
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // Try to read analysis results from disk
      let rawIndex = null;
      let analysisIndex = null;
      let duplicates = [];

      try {
        const rawPath = path.join(upload.folder_path, 'analysis', 'raw_index.json');
        rawIndex = JSON.parse(await fs.readFile(rawPath, 'utf-8'));
        duplicates = rawIndex.duplicates || [];
      } catch {}

      try {
        const analysisPath = path.join(upload.folder_path, 'analysis', 'analysis_index.json');
        analysisIndex = JSON.parse(await fs.readFile(analysisPath, 'utf-8'));
      } catch {}

      // Check what directories exist
      const dirs = {
        stems_raw: false,
        stems_8: false,
        br864_ready: false,
        exports: false,
      };

      for (const dir of Object.keys(dirs)) {
        try {
          await fs.access(path.join(upload.folder_path, dir));
          dirs[dir] = true;
        } catch {}
      }

      return res.status(200).json({
        success: true,
        upload,
        rawIndex,
        analysisIndex,
        duplicates,
        availableDirs: dirs,
      });
    }

    // Get all uploads
    const uploads = getAllUploads();
    return res.status(200).json({
      success: true,
      uploads,
    });
  } catch (error) {
    console.error('Uploads error:', error);
    return res.status(500).json({ error: error.message });
  }
}
