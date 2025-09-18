import type { FileInfo } from 'jscodeshift';

export interface TransformError {
  file: string;
  error: Error;
  phase: 'parse' | 'transform' | 'generate';
  recoverable: boolean;
}

export class TransformationError extends Error {
  constructor(
    message: string,
    public file: string,
    public phase: 'parse' | 'transform' | 'generate',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public file: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function safeTransform<T>(
  fn: () => T,
  fileInfo: FileInfo,
  phase: 'parse' | 'transform' | 'generate'
): T | null {
  try {
    return fn();
  } catch (error) {
    handleTransformError(error, fileInfo, phase);
    return null;
  }
}

export function handleTransformError(
  error: unknown,
  fileInfo: FileInfo,
  phase: 'parse' | 'transform' | 'generate'
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  
  // Log error details for debugging
  console.error(`Error during ${phase} phase in ${fileInfo.path}:`);
  console.error(err.message);
  
  if (process.env.DEBUG === 'true') {
    console.error(err.stack);
  }
  
  // Determine if error is recoverable
  const recoverable = isRecoverableError(err, phase);
  
  if (!recoverable) {
    throw new TransformationError(
      `Failed to ${phase} file: ${err.message}`,
      fileInfo.path,
      phase,
      err
    );
  }
  
  // For recoverable errors, log warning and continue
  console.warn(`Warning: Skipping transformation for ${fileInfo.path} due to ${phase} error`);
}

function isRecoverableError(error: Error, phase: string): boolean {
  // Parse errors are generally not recoverable
  if (phase === 'parse') {
    return false;
  }
  
  // Some transform errors can be recovered from
  if (phase === 'transform') {
    // Check for specific recoverable patterns
    const recoverablePatterns = [
      /Cannot read prop.* of undefined/,
      /Cannot find module/,
      /Unexpected token/,
    ];
    
    return recoverablePatterns.some(pattern => 
      pattern.test(error.message)
    );
  }
  
  // Generate phase errors are usually not recoverable
  return false;
}

export function validateTransformResult(
  original: string,
  transformed: string | undefined,
  filePath: string
): void {
  // If no transformation occurred, that's valid
  if (transformed === undefined) {
    return;
  }
  
  // Check for empty results
  if (transformed.trim() === '') {
    throw new ValidationError(
      'Transformation resulted in empty file',
      filePath,
      { originalLength: original.length }
    );
  }
  
  // Check for significant size reduction (potential data loss)
  const sizeDiff = original.length - transformed.length;
  const sizeReductionPercent = (sizeDiff / original.length) * 100;
  
  if (sizeReductionPercent > 50) {
    console.warn(
      `Warning: File ${filePath} reduced by ${sizeReductionPercent.toFixed(1)}% ` +
      `(${original.length} → ${transformed.length} chars)`
    );
  }
  
  // Validate syntax markers weren't lost
  validateSyntaxIntegrity(original, transformed, filePath);
}

function validateSyntaxIntegrity(
  original: string,
  transformed: string,
  filePath: string
): void {
  // Check that we haven't lost important syntax elements
  const criticalPatterns = [
    { pattern: /export\s+default/g, name: 'default exports' },
    { pattern: /export\s+\{/g, name: 'named exports' },
    { pattern: /import\s+/g, name: 'imports' },
  ];
  
  for (const { pattern, name } of criticalPatterns) {
    const originalCount = (original.match(pattern) || []).length;
    const transformedCount = (transformed.match(pattern) || []).length;
    
    // Allow for some changes (imports might be consolidated)
    // but warn on significant differences
    if (originalCount > 0 && transformedCount === 0) {
      console.warn(
        `Warning: All ${name} removed from ${filePath} ` +
        `(${originalCount} → ${transformedCount})`
      );
    }
  }
}

export function createErrorReport(errors: TransformError[]): string {
  if (errors.length === 0) {
    return 'No errors encountered during transformation.';
  }
  
  const report = ['Transformation Errors:', ''];
  
  const errorsByPhase = errors.reduce((acc, err) => {
    if (!acc[err.phase]) {
      acc[err.phase] = [];
    }
    acc[err.phase].push(err);
    return acc;
  }, {} as Record<string, TransformError[]>);
  
  for (const [phase, phaseErrors] of Object.entries(errorsByPhase)) {
    report.push(`${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase Errors:`);
    
    for (const error of phaseErrors) {
      report.push(`  - ${error.file}: ${error.error.message}`);
      if (!error.recoverable) {
        report.push('    (FATAL - transformation aborted)');
      }
    }
    
    report.push('');
  }
  
  const fatalCount = errors.filter(e => !e.recoverable).length;
  const recoverableCount = errors.filter(e => e.recoverable).length;
  
  report.push('Summary:');
  report.push(`  Total errors: ${errors.length}`);
  report.push(`  Fatal errors: ${fatalCount}`);
  report.push(`  Recoverable errors: ${recoverableCount}`);
  
  return report.join('\n');
}