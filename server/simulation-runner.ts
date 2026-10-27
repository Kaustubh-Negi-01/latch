import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import type { RunRequest } from '../domain/index';
import { simulateRace } from '../domain/simulation';
import { ARTIFACT_ROOT, createBundle } from './artifacts';
import { renderSimulationSnapshot } from './simulation-view';
import type { RunEvent, RunResult } from './run-types';

export const executeSimulationRun = async (request: RunRequest, reason: string): Promise<RunResult> => {
  const started = Date.now();
  const id = randomUUID();
  const directory = path.join(ARTIFACT_ROOT, id);
  await mkdir(directory, { recursive: true });
  const simulation = simulateRace(request);
  const artifact = (file: string) => `/api/artifacts/${id}/${file}`;
  const files = ['before.svg', 'response-1.svg', 'response-2.svg'];
  await Promise.all(simulation.frames.map((frame,index) => writeFile(path.join(directory,files[index]),renderSimulationSnapshot(request,frame))));
  await writeFile(path.join(directory,'final.svg'),renderSimulationSnapshot(request,simulation.frames.at(-1)!));
  const events: RunEvent[] = [
    { id:'action-first', kind:'action', label:'First action started', atMs:0, actor:'first' },
    { id:'request-first', kind:'request', label:'Earlier request held in model', atMs:1, actor:'first' },
    { id:'action-second', kind:'action', label:'Second action started', atMs:2, actor:'second' },
    { id:'request-second', kind:'request', label:'Latest request held in model', atMs:3, actor:'second' },
  ];
  simulation.frames.slice(1).forEach((frame,index) => {
    events.push({ id:`release-${frame.actor}`, kind:'release', label:`${frame.actor} response released in model`, atMs:10+index*10, actor:frame.actor });
    events.push({ id:`render-${frame.actor}`, kind:'render', label:frame.label, atMs:11+index*10, actor:frame.actor, detail:frame.outcome });
  });
  events.push({ id:'assert', kind:'assert', label:simulation.passed ? 'Modeled invariant preserved' : 'Modeled invariant violated', atMs:30 });
  const report = { engine:'simulation', reason, request, assertion:{expected:simulation.expected,actual:simulation.actual,passed:simulation.passed}, events, timing:'Event times are logical simulation steps, not measured browser timings.', limitation:'This report models the shipped fixture. It is not a Playwright browser trace.' };
  await writeFile(path.join(directory,'simulation.json'),JSON.stringify(report,null,2));
  await new Promise<void>((resolve,reject) => {
    const stream=createWriteStream(path.join(directory,'simulation-report.zip'));
    const archive=archiver('zip',{zlib:{level:8}});
    stream.on('close',resolve); stream.on('error',reject); archive.on('error',reject); archive.pipe(stream);
    archive.append(JSON.stringify(report,null,2),{name:'simulation.json'});
    archive.append('Latch deterministic simulation report. SVG snapshots are modeled fixture states, not browser captures. This archive is not a Playwright trace. Run the exported Playwright regression in Chromium for browser verification.\n',{name:'README.txt'});
    for(const file of [...files,'final.svg']) archive.file(path.join(directory,file),{name:file});
    void archive.finalize().catch(reject);
  });
  await createBundle(directory,request,{engine:'simulation',reason});
  const result: RunResult = {
    id, status:simulation.passed?'passed':'failed', scenarioId:request.scenarioId, order:request.order, variant:request.variant,
    events, assertion:report.assertion,
    screenshots:[...simulation.frames.map((frame,index)=>({id:`modeled-${index}`,label:frame.label,url:artifact(files[index])})),{id:'final',label:'Final simulated state',url:artifact('final.svg')}],
    durationMs:Date.now()-started, artifacts:{spec:artifact('regression.spec.ts'),trace:artifact('simulation-report.zip'),bundle:artifact('regression-bundle.zip')}, engine:'simulation', simulationReason:reason, createdAt:new Date().toISOString(),
  };
  await writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2));
  return result;
};
