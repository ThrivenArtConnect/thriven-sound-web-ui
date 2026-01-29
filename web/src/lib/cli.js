import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI path relative to the web directory
const CLI_PATH = path.join(__dirname, '..', '..', '..', 'bin', 'thriven');

/**
 * Execute a CLI command and return the result
 */
export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const nodeArgs = [CLI_PATH, command, ...args];
    const proc = spawn('node', nodeArgs, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';
    let progress = 0;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // Parse progress from output if available
      const progressMatch = text.match(/(\d+)%/);
      if (progressMatch) {
        progress = parseInt(progressMatch[1], 10);
        if (options.onProgress) {
          options.onProgress(progress);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to start command: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

/**
 * Scan a folder for audio files
 */
export async function scan(folder, options = {}) {
  const args = [folder];
  if (options.output) args.push('-o', options.output);
  if (options.formats) args.push('--formats', options.formats);
  if (options.recursive !== false) args.push('-r');
  if (options.verbose) args.push('-v');
  
  return runCommand('scan', args, options);
}

/**
 * Analyze audio files from raw_index.json
 */
export async function analyze(indexPath, options = {}) {
  const args = [indexPath];
  if (options.output) args.push('-o', options.output);
  if (options.parallel) args.push('-p', String(options.parallel));
  if (options.noLoudness) args.push('--no-loudness');
  if (options.noSilence) args.push('--no-silence');
  if (options.verbose) args.push('-v');
  
  return runCommand('analyze', args, options);
}

/**
 * Export top N ranked files
 */
export async function exportFiles(analysisPath, options = {}) {
  const args = [analysisPath];
  if (options.top) args.push('-t', String(options.top));
  if (options.output) args.push('-o', options.output);
  if (options.saveRanked) args.push('--save-ranked', options.saveRanked);
  if (options.verbose) args.push('-v');
  
  return runCommand('export', args, options);
}

/**
 * Generate stemmap.yaml template
 */
export async function stemmap(packDir, options = {}) {
  const args = [packDir];
  if (options.inDir) args.push('--in', options.inDir);
  if (options.outPath) args.push('--out', options.outPath);
  if (options.bpmMin) args.push('--bpm-min', String(options.bpmMin));
  if (options.bpmMax) args.push('--bpm-max', String(options.bpmMax));
  if (options.title) args.push('--title', options.title);
  if (options.verbose) args.push('-v');
  
  return runCommand('stemmap', args, options);
}

/**
 * Apply stemmap.yaml to create stems_8/
 */
export async function applyStemmap(packDir, options = {}) {
  const args = [packDir];
  if (options.map) args.push('--map', options.map);
  if (options.inDir) args.push('--in', options.inDir);
  if (options.outDir) args.push('--out', options.outDir);
  if (options.verbose) args.push('-v');
  
  return runCommand('apply-stemmap', args, options);
}

/**
 * Prepare stems for BR-864
 */
export async function prepBR864(packDir, options = {}) {
  const args = [packDir];
  if (options.inDir) args.push('--in', options.inDir);
  if (options.outDir) args.push('--out', options.outDir);
  if (options.padToLongest) args.push('--pad-to-longest');
  if (options.trimToShortest) args.push('--trim-to-shortest');
  if (options.verbose) args.push('-v');
  
  return runCommand('prep-br864', args, options);
}

/**
 * Run the full process pipeline
 */
export async function process(folder, options = {}) {
  const args = [folder];
  if (options.top) args.push('-t', String(options.top));
  if (options.output) args.push('-o', options.output);
  if (options.verbose) args.push('-v');
  
  return runCommand('process', args, options);
}
