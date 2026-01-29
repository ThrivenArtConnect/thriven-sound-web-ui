import path from 'path';
import fs from 'fs';
import { getUpload } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, filename } = req.query;

    if (!uploadId || !filename) {
      return res.status(400).json({ error: 'uploadId and filename are required' });
    }

    const upload = getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Search for file in stems_raw folder
    const safeName = path.basename(filename);
    const filePath = path.join(upload.folder_path, 'stems_raw', safeName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(safeName).toLowerCase();

    // Determine content type
    const contentTypes = {
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Audio stream error:', error);
    return res.status(500).json({ error: error.message });
  }
}
