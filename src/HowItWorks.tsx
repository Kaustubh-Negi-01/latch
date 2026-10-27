import { ArrowRight, FileCode2, Mic2, Network, ShieldCheck } from 'lucide-react';

export default function HowItWorks() {
  return <section className="explain-page">
    <h1>From an observation<br />to a regression.</h1>
    <p className="lead">Keep the hard-won context from debugging. Turn it into a test you can run again.</p>
    <div className="explain-steps">
      <article><Mic2 /><h2>Describe the order</h2><p>Dictate into the scenario field with Wispr Flow. Name the actions, which response should arrive first, and what must stay true.</p></article>
      <ArrowRight aria-hidden="true" />
      <article><Network /><h2>Control the responses</h2><p>Latch holds named HTTP requests in a real Chromium browser, then releases them in the selected order. No timing guesses.</p></article>
      <ArrowRight aria-hidden="true" />
      <article><FileCode2 /><h2>Keep the evidence</h2><p>Inspect the assertion and browser screenshots. Download the Playwright test, fixtures and trace, then run the regression yourself.</p></article>
    </div>
    <div className="honesty-note"><ShieldCheck /><div><h2>A focused test, with clear boundaries.</h2><p>The public runner executes the included synthetic fixture applications. It controls the chosen HTTP response order. It does not prove that an application is free of all timing bugs.</p></div></div>
    <div className="build-note"><h2>Built from a real debugging problem</h2><p>A rapid double-click on Apply Promo sent concurrent requests. The earlier, slower response returned last and corrupted the checkout total. That personal incident is the starting point for Latch; the products, quote amounts, companies and example responses are synthetic.</p><p>Wispr Flow supplies dictation through its desktop app. Latch does not record audio or claim a direct Wispr SDK connection. Sample narration works without installing Wispr.</p></div>
  </section>;
}
