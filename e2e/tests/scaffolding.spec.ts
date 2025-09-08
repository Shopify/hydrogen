import {describe, it, expect} from 'vitest';
import {execSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('E2E Command Scaffolding', () => {
  it('should run npm run e2e:smoke successfully', () => {
    const result = execSync('npm run e2e:smoke', {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(result).toContain('Playwright HTML report');

    const htmlReportPath = path.join(
      process.cwd(),
      'playwright-report',
      'index.html',
    );
    expect(fs.existsSync(htmlReportPath)).toBe(true);
  });
});
