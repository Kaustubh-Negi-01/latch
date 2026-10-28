import { useEffect, useMemo, useRef, useState } from 'react';
import checkout from '../public/fixtures/checkout.html?raw';
import workspace from '../public/fixtures/workspace.html?raw';
import search from '../public/fixtures/search.html?raw';
import fixtureCode from '../public/fixtures/fixture.js?raw';
import fixtureStyles from '../public/fixtures/fixture.css?raw';
import type { Variant } from './types';

const templates: Record<string,string> = { checkout, workspace, search };

export default function FixturePreview({ fixture, variant, title }: { fixture:string; variant:Variant; title:string }) {
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(720);
  useEffect(() => () => observer.current?.disconnect(), []);
  const fitContent = (iframe: HTMLIFrameElement) => {
    observer.current?.disconnect();
    const body = iframe.contentDocument?.body;
    if (!body) return;
    const measure = () => setHeight(Math.max(450, Math.ceil(body.getBoundingClientRect().height)));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(body);
  };
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
  return <div className="fixture-stage"><iframe key={`${fixture}-${variant}`} title={title} srcDoc={source} onLoad={event => fitContent(event.currentTarget)} style={{ height }} /></div>;
}
