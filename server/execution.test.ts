import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { executeRun, ARTIFACT_ROOT } from './runner';

const request = {scenarioId:'checkout',order:'stale-last',variant:'buggy'} as const;

describe('cloud execution failover', () => {
  it('runs forced simulation without attempting to launch a browser', async () => {
    const browserRun=vi.fn();
    const result=await executeRun(request,'http://unused.invalid',{mode:'simulation',browserRun});
    expect(browserRun).not.toHaveBeenCalled();
    expect(result).toMatchObject({engine:'simulation',status:'failed',assertion:{actual:'149.00',expected:'129.00'}});
    const directory=path.join(ARTIFACT_ROOT,result.id);
    expect(await readFile(path.join(directory,'final.svg'),'utf8')).toContain('not a browser capture');
    expect((await readFile(path.join(directory,'simulation-report.zip'))).subarray(0,2).toString()).toBe('PK');
    expect(await readFile(path.join(directory,'bundle','EVIDENCE.md'),'utf8')).toContain('not a browser');
    expect(await readFile(path.join(directory,'regression.spec.ts'),'utf8')).toContain('runRaceProtocol');
  });

  it('falls back after a browser failure and avoids retrying it during cooldown', async () => {
    const browserRun=vi.fn().mockRejectedValue(new Error('Chromium executable is unavailable'));
    const first=await executeRun(request,'http://unused.invalid',{mode:'auto',browserRun});
    const second=await executeRun({...request,variant:'fixed'},'http://unused.invalid',{mode:'auto',browserRun});
    expect(browserRun).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({engine:'simulation',status:'failed'});
    expect(second).toMatchObject({engine:'simulation',status:'passed',assertion:{actual:'129.00'}});
  });

  it('keeps strict browser mode explicit instead of disguising its failure', async () => {
    await expect(executeRun(request,'http://unused.invalid',{mode:'playwright',browserRun:vi.fn().mockRejectedValue(new Error('Browser unavailable'))})).rejects.toThrow('Browser unavailable');
  });
});
