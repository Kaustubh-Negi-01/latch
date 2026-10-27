import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock3, Code2, Download, ExternalLink, FileCode2, FlaskConical, History, LoaderCircle, Menu, Mic2, Moon, Play, RotateCcw, ShieldCheck, Sun, X, XCircle } from 'lucide-react';
import Logo from './Logo';
import Timeline from './Timeline';
import HowItWorks from './HowItWorks';
import FixturePreview from './FixturePreview';
import { examples } from './examples';
import { checkRunnerHealth, interpret, runScenario } from './api';
import type { Order, Run, ScenarioId, Variant } from './types';

const initialExample = examples[0];

export default function App() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('checkout');
  const [order, setOrder] = useState<Order>('stale-last');
  const [variant, setVariant] = useState<Variant>('buggy');
  const [text, setText] = useState(initialExample.narration);
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRun, setActiveRun] = useState<Run>();
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState<'workbench' | 'history' | 'about'>('workbench');
  const [menuOpen, setMenuOpen] = useState(false);
  const [frame, setFrame] = useState(-1);
  const [health, setHealth] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [code, setCode] = useState<string>();
  const [dark, setDark] = useState(false);
  const runningRef = useRef(false);
  const example = examples.find(e => e.id === scenarioId) || initialExample;
  const matchingRun = activeRun && activeRun.scenarioId === scenarioId && activeRun.order === order && activeRun.variant === variant ? activeRun : undefined;
  const previousBuggy = runs.find(r => r.scenarioId === scenarioId && r.order === order && r.variant === 'buggy');
  const previousFixed = runs.find(r => r.scenarioId === scenarioId && r.order === order && r.variant === 'fixed');

  useEffect(() => {
    const controller=new AbortController();
    void checkRunnerHealth(controller.signal).then(ready=>{if(!controller.signal.aborted) setHealth(current=>current==='ready'?'ready':ready?'ready':'offline');});
    return ()=>controller.abort();
  }, []);
  useEffect(() => {
    if (!code) return;
    const dialog = document.querySelector<HTMLDialogElement>('.code-dialog');
    if (dialog && !dialog.open) dialog.showModal();
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') setCode(undefined); };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [code]);

  const chooseScenario = (id: ScenarioId) => {
    if (busy || parsing) return;
    const next = examples.find(e => e.id === id)!;
    setScenarioId(id); setText(next.narration); setOrder('stale-last'); setVariant('buggy');
    setActiveRun(undefined); setFrame(-1); setMessage(''); setError(''); setPage('workbench'); setMenuOpen(false);
  };

  const execute = async (nextVariant = variant, demo = false) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true); setError(''); setMessage(''); setActiveRun(undefined); setFrame(-1); setPage('workbench');
    const targetId = demo ? 'checkout' : scenarioId;
    const targetOrder = demo ? 'stale-last' : order;
    if (demo) { setScenarioId('checkout'); setText(initialExample.narration); setOrder(targetOrder); }
    setVariant(nextVariant);
    try {
      const result = await runScenario(targetId, targetOrder, nextVariant);
      setActiveRun(result); setRuns(prior => [result, ...prior].slice(0, 30)); setHealth('ready');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The browser run could not finish. Try again.'); }
    finally { setBusy(false); runningRef.current = false; }
  };

  const applyNarration = async () => {
    setParsing(true); setError(''); setMessage('');
    try {
      const result = await interpret(text, scenarioId, order);
      if (result.needsClarification || result.ok === false) { setError(result.message || 'Describe which response finishes first and what must stay true.'); return; }
      const plan = result.plan || result.scenario || result;
      if (plan.scenarioId && examples.some(e => e.id === plan.scenarioId)) setScenarioId(plan.scenarioId);
      if (plan.order === 'stale-last' || plan.order === 'stale-first') setOrder(plan.order);
      setActiveRun(undefined); setFrame(-1);
      setMessage(`${result.summary || 'Scenario updated. Ready to run.'}${result.mode === 'local' ? ' Built-in interpreter.' : result.mode === 'model' ? ' AI interpretation.' : ''}${result.warning ? ` ${result.warning}` : ''}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not interpret the scenario. Try a sample.'); }
    finally { setParsing(false); }
  };

  const showSpec = async () => {
    if (!matchingRun) return;
    try { const response = await fetch(matchingRun.artifacts.spec); if (!response.ok) throw new Error('The test export is unavailable. Run the scenario again.'); setCode(await response.text()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load the test.'); }
  };

  const reset = () => { chooseScenario(scenarioId); setRuns([]); };
  const screenshot = matchingRun?.screenshots[frame < 0 ? matchingRun.screenshots.length - 1 : frame];

  return <div className="app-shell" data-theme={dark ? 'dark' : 'light'}>
    <a className="skip-link" href="#main-content">Skip to workbench</a>
    <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`} aria-label="Main navigation">
      <a className="brand-link" href="#" aria-label="Latch workbench" onClick={e => { e.preventDefault(); setPage('workbench'); }}><Logo /></a>
      <div className="sidebar-description">A little order.<br />A lot less guesswork.</div>
      <nav className="primary-nav">
        <button className={page === 'workbench' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('workbench'); setMenuOpen(false); }}><FlaskConical size={18} />Workbench</button>
        <button className={page === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('history'); setMenuOpen(false); }}><History size={18} />Run history<span className="nav-count">{runs.length}</span></button>
        <button className={page === 'about' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('about'); setMenuOpen(false); }}><BookOpen size={18} />How it works</button>
      </nav>
      <div className="sidebar-section-title">Try a timing bug</div>
      <nav className="scenario-nav" aria-label="Sample scenarios">{examples.map((item, index) => <button key={item.id} className={scenarioId === item.id && page === 'workbench' ? 'scenario-link selected' : 'scenario-link'} disabled={busy || parsing} onClick={() => chooseScenario(item.id)}><span className="scenario-index">0{index + 1}</span><span>{item.name}</span>{scenarioId === item.id && page === 'workbench' && <span className="selected-dot" />}</button>)}</nav>
      <div className="sidebar-foot"><div className="sample-tag"><FlaskConical size={15} />Synthetic sandbox</div><p>Browser runs + simulation.<br />No accounts required.</p><button className="text-button" onClick={() => { setPage('about'); setMenuOpen(false); }}>About this build <ArrowRight size={14} /></button></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{page === 'workbench' ? 'Reproduction lab' : page === 'history' ? 'Run history' : 'How it works'}</strong></div><div className="header-actions"><div className={`runner-health ${health}`}><span />{health === 'ready' ? 'Runner available' : health === 'checking' ? 'Checking runner' : 'Runner unavailable'}</div><button className="icon-button theme-button" aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="header-judge" disabled={busy || parsing} onClick={() => execute('buggy', true)}><span className="judge-beacon" />Judge Demo Mode<ArrowRight size={14} /></button></div></header>
      <main id="main-content">
        {page === 'about' ? <HowItWorks /> : page === 'history' ? <section className="history-page"><div className="page-heading"><div><h1>Evidence, kept together.</h1><p>Browser runs from this session. Select one to inspect it.</p></div><button className="secondary-button" onClick={() => setPage('workbench')}><ArrowLeft size={16} />Workbench</button></div>{runs.length ? <div className="history-table">{runs.map(run => <button key={run.id} className="history-row" onClick={() => { setScenarioId(run.scenarioId); setOrder(run.order); setVariant(run.variant); setActiveRun(run); setFrame(-1); setPage('workbench'); }}><span className={`result-status ${run.status}`}>{run.status === 'passed' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{run.status}</span><strong>{examples.find(e => e.id === run.scenarioId)?.name || run.scenarioId}</strong><span>{run.variant === 'fixed' ? 'Guarded' : 'Buggy'} · {run.order === 'stale-last' ? 'Older response last' : 'Older response first'}</span><span>{(run.durationMs / 1000).toFixed(1)}s</span><ArrowRight size={17} /></button>)}</div> : <div className="empty-history"><History size={32} /><h2>Your first run starts here.</h2><p>Run the judge demo to capture a real failure and its browser evidence.</p><button className="primary-button" onClick={() => execute('buggy', true)} disabled={busy}><Play size={16} />1-Click Judge Demo Mode</button></div>}</section> : <>
          <section className="intro"><div className="intro-copy"><h1>Make the timing<br /><span>repeatable.</span></h1><p>Describe the race. Control the responses.<br className="hero-break" /> Keep the regression.</p></div><div className="intro-action"><div className="intro-protocol"><span>Dictate</span><ArrowRight size={14} /><span>Control</span><ArrowRight size={14} /><span>Prove</span></div><button className="judge-button" disabled={busy || parsing} onClick={() => execute('buggy', true)}>{busy ? <LoaderCircle size={17} className="spin" /> : <Play size={17} fill="currentColor" />}1-Click Judge Demo Mode<ArrowRight size={16} /></button><span className="demo-detail">Seeded checkout race. No setup.</span></div></section>
          <div className="workbench-grid">
            <section className="experiment-panel" aria-labelledby="experiment-title">
              <div className="experiment-heading"><div><div className="small-label"><span className="coordinate-badge">[FIXTURE::SEEDED]</span><span>Synthetic data</span></div><h2 id="experiment-title">{example.title}</h2><p>{example.description}</p></div><button className="icon-button" title="Reset this session" aria-label="Reset this session" disabled={busy || parsing} onClick={reset}><RotateCcw size={17} /></button></div>
              <div className="schedule-toolbar"><span><span className="section-dot" />Response order</span><select aria-label="Response completion order" value={order} disabled={busy || parsing} onChange={e => { setOrder(e.target.value as Order); setError(''); setMessage(''); setFrame(-1); }}><option value="stale-last">Older response returns last</option><option value="stale-first">Older response returns first</option></select></div>
              <Timeline example={example} order={order} run={matchingRun} />
              {matchingRun?.engine === 'simulation' && <div className="simulation-notice" role="status"><FlaskConical size={18} /><div><strong>Deterministic simulation</strong><p>{matchingRun.simulationReason} These are modeled snapshots, not browser captures. The exported Playwright test is independently runnable.</p></div></div>}
              <div className="preview-heading"><div className="variant-tabs" aria-label="Implementation"><button aria-pressed={variant === 'buggy'} className={variant === 'buggy' ? 'selected' : ''} disabled={busy} onClick={() => { setVariant('buggy'); setActiveRun(previousBuggy); setFrame(-1); }}>Buggy app</button><button aria-pressed={variant === 'fixed'} className={variant === 'fixed' ? 'selected' : ''} disabled={busy} onClick={() => { setVariant('fixed'); setActiveRun(previousFixed); setFrame(-1); }}><ShieldCheck size={13} />Guarded app</button></div><span className="preview-caption">{busy ? 'Executing scenario' : screenshot ? matchingRun?.engine === 'simulation' ? 'Simulated fixture snapshot' : 'Captured in Chromium' : 'Interactive fixture preview'}</span></div>
              <div className={`fixture-window ${busy ? 'running' : ''}`}>
                <div className="fixture-browser-bar"><div className="window-dots"><i /><i /><i /></div><span><ShieldCheck size={11} />sandbox.latch / {example.fixture}</span><ExternalLink size={12} /></div>
                {screenshot ? <img className="browser-screenshot" src={screenshot.url} alt={`${screenshot.label}. ${matchingRun?.engine === 'simulation' ? 'Modeled fixture snapshot' : 'Actual browser capture'} for ${example.name}.`} /> : <FixturePreview fixture={example.fixture} variant={variant} title={`${example.name} interactive synthetic fixture`} />}
                {busy && <div className="running-overlay"><span className="running-icon"><LoaderCircle className="spin" size={25} /></span><strong>Running your scenario</strong><span>Executing the selected request order…</span></div>}
              </div>
              {matchingRun && matchingRun.screenshots.length > 1 && <div className="capture-review"><div className="capture-scrubber"><label htmlFor="capture-frame">Evidence scrubber</label><input id="capture-frame" type="range" min="0" max={matchingRun.screenshots.length - 1} step="1" value={frame < 0 ? matchingRun.screenshots.length - 1 : frame} aria-valuetext={screenshot?.label} onChange={e => setFrame(Number(e.target.value))} /><output htmlFor="capture-frame">{String((frame < 0 ? matchingRun.screenshots.length - 1 : frame) + 1).padStart(2, '0')} / {String(matchingRun.screenshots.length).padStart(2, '0')}</output></div><div className="filmstrip" aria-label="Browser screenshots">{matchingRun.screenshots.map((shot, index) => <button key={shot.id} aria-pressed={(frame < 0 ? index === matchingRun.screenshots.length - 1 : frame === index)} className={(frame < 0 ? index === matchingRun.screenshots.length - 1 : frame === index) ? 'selected' : ''} onClick={() => setFrame(index)}><span>{String(index + 1).padStart(2, '0')}</span>{shot.label}</button>)}</div></div>}
              <div className={`assertion ${matchingRun ? matchingRun.status : 'pending'}`} aria-live="polite"><span className="assertion-icon">{matchingRun ? matchingRun.status === 'passed' ? <CheckCircle2 size={20} /> : <XCircle size={20} /> : <ShieldCheck size={20} />}</span><div><strong>{matchingRun ? matchingRun.status === 'passed' ? 'Assertion passed' : 'Race reproduced' : 'What must stay true'}</strong><span>{matchingRun ? `Expected: ${matchingRun.assertion.expected} · Observed: ${matchingRun.assertion.actual}` : example.invariant}</span></div>{matchingRun && <span className="assertion-time">{(matchingRun.durationMs / 1000).toFixed(1)}s</span>}</div>
              <div className="run-toolbar"><div className="run-identifier">{busy ? <><Circle size={8} fill="currentColor" />[RUNNER::ACTIVE]</> : matchingRun ? <><Circle size={8} fill="currentColor" />Run {matchingRun.id.slice(0, 8)}</> : <><Clock3 size={14} />Ready when you are</>}</div><button className="primary-button run-button" disabled={busy || parsing} onClick={() => execute()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={15} fill="currentColor" />}{busy ? 'Running scenario…' : 'Run scenario'}</button></div>
            </section>

            <aside className="context-column" aria-label="Scenario narration and evidence">
              <section className="narration-panel"><div className="dictation-status"><span className="audio-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span className="dictation-ready">Ready for dictation</span><span className="dictation-active">Input active · dictate with Wispr</span></div><div className="panel-title"><span className="microphone-icon"><Mic2 size={18} /></span><h2>Start with what happened.</h2></div><p>Click below and dictate with Wispr.<br />Messy observations welcome.</p><label className="sr-only" htmlFor="narration">Scenario narration</label><textarea id="narration" value={text} onChange={e => setText(e.target.value)} disabled={busy || parsing} spellCheck="false" placeholder="Describe the actions, which response finishes first, and the expected state…" /><div className="narration-meta"><span><Mic2 size={12} />Wispr-compatible text field</span><span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span></div><button className="secondary-button interpret-button" disabled={busy || parsing || !text.trim()} onClick={applyNarration}>{parsing ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}{parsing ? 'Interpreting…' : 'Update scenario'}</button><div className="quick-correction"><span>Try a spoken correction</span><button disabled={busy || parsing} onClick={() => { setText('Keep this scenario, but let the first response finish before the second response.'); setMessage('Correction loaded. Choose Update scenario to apply it.'); }}>“Let the first response finish first.” <ArrowRight size={13} /></button></div></section>
              {(message || error) && <div className={`feedback ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>{error ? <XCircle size={17} /> : <CheckCircle2 size={17} />}<span>{error || message}</span></div>}
              <section className="evidence-panel"><div className="panel-title"><span className="evidence-icon"><FileCode2 size={18} /></span><h2>Leave with proof.</h2></div><p>A regression you can inspect, export,<br />and run in your own environment.</p><div className="evidence-items"><button disabled={!matchingRun || busy} onClick={showSpec}><Code2 size={17} /><span>Playwright test</span><span className="file-extension">.ts</span><ArrowRight size={14} /></button>{matchingRun ? <a href={matchingRun.artifacts.trace} download><History size={17} /><span>{matchingRun.engine === 'simulation' ? 'Simulation report' : 'Browser trace'}</span><span className="file-extension">.zip</span><ArrowDownToLine size={14} /></a> : <button disabled><History size={17} /><span>Browser trace</span><span className="file-extension">.zip</span><ArrowDownToLine size={14} /></button>}</div>{matchingRun ? <a className="download-bundle" href={matchingRun.artifacts.bundle || matchingRun.artifacts.spec} download><Download size={16} />Download regression bundle<ArrowRight size={14} /></a> : <div className="evidence-empty"><span />Run a scenario to generate evidence.</div>}</section>
              {matchingRun && <section className="compare-panel"><ShieldCheck size={20} /><div><strong>{variant === 'buggy' ? 'Same order. Guarded code.' : 'Check the original behavior.'}</strong><p>{variant === 'buggy' ? 'Rerun with a latest-request guard.' : 'Compare against the buggy fixture.'}</p><button disabled={busy} onClick={() => execute(variant === 'buggy' ? 'fixed' : 'buggy')}>{variant === 'buggy' ? 'Test the guarded app' : 'Test the buggy app'}<ArrowRight size={14} /></button></div></section>}
            </aside>
          </div>
          {(previousBuggy && previousFixed) && <section className="comparison-summary"><div><FlaskConical size={20} /><strong>The same scenario. Two implementations.</strong></div><span className={`comparison-outcome ${previousBuggy.status}`}>{previousBuggy.status === 'failed' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}Buggy app: {previousBuggy.status}</span><ArrowRight size={16} /><span className={`comparison-outcome ${previousFixed.status}`}>{previousFixed.status === 'passed' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}Guarded app: {previousFixed.status}</span></section>}
          <footer className="workspace-footer"><span><span className="footer-mark" />A spoken hypothesis. An executable artifact.</span><button onClick={() => setPage('about')}>Built with Wispr Flow dictation <ArrowRight size={13} /></button></footer>
        </>}
      </main>
    </div>
    {code && <dialog className="code-dialog" aria-labelledby="code-title" onCancel={() => setCode(undefined)}><div className="code-dialog-heading"><div><FileCode2 size={18} /><h2 id="code-title">The generated regression</h2></div><button className="icon-button" aria-label="Close test preview" autoFocus onClick={() => setCode(undefined)}><X size={20} /></button></div><p>{matchingRun?.engine === 'simulation' ? 'This Playwright test can independently verify the modeled scenario in a real browser.' : 'This test uses the same scenario and request gates as the browser run.'}</p><pre tabIndex={0}><code>{code}</code></pre><div className="code-dialog-footer"><a className="primary-button" href={matchingRun?.artifacts.spec} download><Download size={16} />Download test</a><button className="secondary-button" onClick={() => setCode(undefined)}>Close</button></div></dialog>}
  </div>;
}
