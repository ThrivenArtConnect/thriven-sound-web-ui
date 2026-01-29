import path from 'path';
import fs from 'fs';
import { getUpload } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, file } = req.query;

    if (!uploadId || !file) {
      return res.status(400).json({ error: 'uploadId and file are required' });
    }

    const upload = await getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Validate file name to prevent path traversal
    const safeName = path.basename(file);
    if (!safeName.endsWith('.zip')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(upload.folder_path, safeName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: error.message });
  }
}
