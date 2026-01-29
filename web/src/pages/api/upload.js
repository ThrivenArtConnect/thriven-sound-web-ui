import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createUpload } from '@/lib/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Use temp directory for uploads (works in containers)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.tmpdir(), 'thriven-uploads');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const uploadId = uuidv4();
    const uploadPath = path.join(UPLOAD_DIR, uploadId, 'stems_raw');
    await fs.mkdir(uploadPath, { recursive: true });

    const form = formidable({
      uploadDir: uploadPath,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB per file
      maxFiles: 100,
      filename: (name, ext, part) => {
        // Preserve original filename
        return part.originalFilename || `${name}${ext}`;
      },
    });

    const [fields, files] = await form.parse(req);

    // Get uploaded files
    const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
    
    let totalSize = 0;
    const fileList = [];

    for (const file of uploadedFiles) {
      if (file) {
        totalSize += file.size;
        fileList.push({
          name: file.originalFilename,
          size: file.size,
          path: file.filepath,
        });
      }
    }

    // Get folder name from form data
    const folderName = Array.isArray(fields.folderName) ? fields.folderName[0] : fields.folderName || 'Uploaded Pack';

    // Save to database (MongoDB)
    await createUpload({
      id: uploadId,
      folder_path: path.join(UPLOAD_DIR, uploadId),
      folder_name: folderName,
      file_count: fileList.length,
      total_size_bytes: totalSize,
      status: 'uploaded',
    });

    return res.status(200).json({
      success: true,
      uploadId,
      folderName,
      fileCount: fileList.length,
      totalSize,
      files: fileList.map(f => ({ name: f.name, size: f.size })),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
