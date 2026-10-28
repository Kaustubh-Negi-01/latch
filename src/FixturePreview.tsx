import { useEffect, useMemo, useRef, useState } from 'react';
import checkout from '../public/fixtures/checkout.html?raw';
import workspace from '../public/fixtures/workspace.html?raw';
import search from '../public/fixtures/search.html?raw';
import fixtureCode from '../public/fixtures/fixture.js?raw';
import fixtureStyles from '../public/fixtures/fixture.css?raw';
import type { Variant } from './types';

const templates: Record<string,string> = { checkout, workspace, search };

export default function FixturePreview({ fixture, variant, title }: { fixture:string; variant:Variant; title:string }) {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / 960, entry.contentRect.height / 720));
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const source=useMemo(() => {
    const template=templates[fixture];
    if(!template) return '<p>Choose a supported fixture.</p>';
    // Trusted fixture assets are bundled together. Preview navigation cannot
    // partially load or fall through a host's SPA routing fallback.
    return template
      .replace('<head>',()=>`<head><base href="${window.location.origin}/">`)
      .replace('<link rel="stylesheet" href="/fixtures/fixture.css" />',()=>`<style>${fixtureStyles}</style>`)
      .replace('<body ',()=>`<body data-fixed="${variant==='fixed'?'1':'0'}" `)
      .replace('<script src="/fixtures/fixture.js"></script>',()=>`<script>${fixtureCode.replaceAll('</script','<\\/script')}</script>`);
  },[fixture,variant]);
  return <div className="fixture-stage" ref={stage}><iframe key={`${fixture}-${variant}`} title={title} srcDoc={source} style={{ width: 960, height: 720, transform: `translate(-50%, -50%) scale(${scale})`, opacity: scale ? 1 : 0 }} /></div>;
}
