import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { stemmap, applyStemmap, prepBR864 } from '@/lib/cli';
import { getUpload, updateUploadStatus, saveStemmap, getStemmap } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get stemmap for upload
    const { uploadId } = req.query;
    
    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    const upload = await getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Try to read stemmap.yaml from disk
    const stemmapPath = path.join(upload.folder_path, 'stemmap.yaml');
    try {
      const yaml = await fs.readFile(stemmapPath, 'utf-8');
      return res.status(200).json({ success: true, yaml });
    } catch {
      return res.status(404).json({ error: 'Stemmap not found. Generate one first.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, action, stemmapData, padToLongest } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    const upload = await getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const packDir = upload.folder_path;

    if (action === 'generate') {
      // Generate stemmap.yaml template
      const title = req.body.title || 'PACK';
      const bpmMin = req.body.bpmMin || 90;
      const bpmMax = req.body.bpmMax || 190;

      await stemmap(packDir, {
        title,
        bpmMin,
        bpmMax,
        verbose: true,
      });

      // Read the generated stemmap
      const stemmapPath = path.join(packDir, 'stemmap.yaml');
      const yaml = await fs.readFile(stemmapPath, 'utf-8');

      // Save to database
      await saveStemmap({
        id: uuidv4(),
        upload_id: uploadId,
        stemmap_yaml: yaml,
        pack_title: title,
        bpm: null,
        key_signature: null,
      });

      return res.status(200).json({
        success: true,
        action: 'generate',
        yaml,
      });
    }

    if (action === 'save') {
      // Save updated stemmap.yaml
      if (!stemmapData) {
        return res.status(400).json({ error: 'stemmapData is required' });
      }

      const stemmapPath = path.join(packDir, 'stemmap.yaml');
      await fs.writeFile(stemmapPath, stemmapData, 'utf-8');

      // Update database
      await saveStemmap({
        id: uuidv4(),
        upload_id: uploadId,
        stemmap_yaml: stemmapData,
        pack_title: req.body.packTitle || 'PACK',
        bpm: req.body.bpm || null,
        key_signature: req.body.key || null,
      });

      return res.status(200).json({
        success: true,
        action: 'save',
      });
    }

    if (action === 'apply') {
      // Apply stemmap to create stems_8/
      await updateUploadStatus(uploadId, 'applying-stemmap');

      await applyStemmap(packDir, {
        verbose: true,
      });

      await updateUploadStatus(uploadId, 'stemmap-applied');

      return res.status(200).json({
        success: true,
        action: 'apply',
        outputDir: 'stems_8',
      });
    }

    if (action === 'prep-br864') {
      // Prepare for BR-864
      await updateUploadStatus(uploadId, 'preparing-br864');

      await prepBR864(packDir, {
        padToLongest: padToLongest === true,
        verbose: true,
      });

      // Read manifest if exists
      const manifestPath = path.join(packDir, 'br864_ready', 'manifest.md');
      let manifest = '';
      try {
        manifest = await fs.readFile(manifestPath, 'utf-8');
      } catch {}

      await updateUploadStatus(uploadId, 'br864-ready');

      return res.status(200).json({
        success: true,
        action: 'prep-br864',
        outputDir: 'br864_ready',
        manifest,
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Stemmap error:', error);
    return res.status(500).json({ error: error.message });
  }
}
