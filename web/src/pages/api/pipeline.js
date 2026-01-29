import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { scan, analyze } from '@/lib/cli';
import { getUpload, updateUploadStatus, saveAnalysisResult } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, step } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    const upload = getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const packDir = upload.folder_path;
    const analysisDir = path.join(packDir, 'analysis');
    await fs.mkdir(analysisDir, { recursive: true });

    const rawIndexPath = path.join(analysisDir, 'raw_index.json');
    const analysisIndexPath = path.join(analysisDir, 'analysis_index.json');

    if (step === 'scan' || !step) {
      // Step 1: Scan
      updateUploadStatus(uploadId, 'scanning');
      
      const stemsRawDir = path.join(packDir, 'stems_raw');
      await scan(stemsRawDir, {
        output: rawIndexPath,
        verbose: true,
      });

      // Read raw index
      const rawIndex = JSON.parse(await fs.readFile(rawIndexPath, 'utf-8'));

      updateUploadStatus(uploadId, 'scanned');

      return res.status(200).json({
        success: true,
        step: 'scan',
        uploadId,
        rawIndex,
        duplicates: rawIndex.duplicates || [],
        nextStep: 'analyze',
      });
    }

    if (step === 'analyze') {
      // Step 2: Analyze
      updateUploadStatus(uploadId, 'analyzing');

      await analyze(rawIndexPath, {
        output: analysisIndexPath,
        parallel: 4,
        verbose: true,
      });

      // Read both indexes
      const rawIndex = JSON.parse(await fs.readFile(rawIndexPath, 'utf-8'));
      const analysisIndex = JSON.parse(await fs.readFile(analysisIndexPath, 'utf-8'));

      // Save to database
      saveAnalysisResult({
        id: uuidv4(),
        upload_id: uploadId,
        raw_index_json: JSON.stringify(rawIndex),
        analysis_index_json: JSON.stringify(analysisIndex),
        duplicates_json: JSON.stringify(rawIndex.duplicates || []),
      });

      updateUploadStatus(uploadId, 'analyzed');

      return res.status(200).json({
        success: true,
        step: 'analyze',
        uploadId,
        analysisIndex,
        fileCount: analysisIndex.files?.length || 0,
        nextStep: 'export',
      });
    }

    return res.status(400).json({ error: 'Invalid step' });
  } catch (error) {
    console.error('Pipeline error:', error);
    return res.status(500).json({ error: error.message });
  }
}
