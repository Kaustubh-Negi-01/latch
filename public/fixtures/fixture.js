
    (() => {
      const params = new URLSearchParams(location.search);
      const scenario = document.body.dataset.scenario || params.get('scenario') || (location.pathname.endsWith('checkout.html') ? 'checkout' : 'workspace');
      const fixed = document.body.dataset.fixed === '1' || params.get('fixed') === '1';
      const app = document.getElementById('app');
      window.__latchEvents = [];
      window.__latchStarted = performance.now();
      document.getElementById('build-label').textContent = fixed ? 'Corrected implementation' : 'Known buggy implementation';
      document.getElementById('variant-badge').textContent = fixed ? 'Corrected fixture' : 'Seeded defect';
      function emit(id, kind, label, detail) {
        const event = { id, kind, label, detail, atMs: Math.round(performance.now() - window.__latchStarted) };
        window.__latchEvents.push(event);
      }
      function money(value) { return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2 }); }
      const heading = (title, subtitle) => '<div class="topline"><div><div class="eyebrow">Your workspace</div><h1>' + title + '</h1><p class="sub">' + subtitle + '</p></div><div class="avatar">SK</div></div>';
      const invoiceRows = (rows, deletable) => rows.map(row => '<tr data-testid="row-' + row.id + '"><td class="id">' + row.id + '</td><td class="clientcol">' + row.client + '</td><td><span class="status ' + row.status.toLowerCase() + '">' + row.status + '</span></td><td class="amount">' + money(row.amount) + '</td>' + (deletable ? '<td><button class="delete" data-testid="' + (row.id === 'INV-1042' ? 'old-action' : row.id === 'INV-1043' ? 'new-action' : 'delete-' + row.id) + '" data-delete="' + row.id + '" aria-label="Delete ' + row.id + '">Delete</button></td>' : '') + '</tr>').join('');
      const table = (rows, deletable) => '<table><thead><tr><th>Invoice</th><th class="clientcol">Customer</th><th>Status</th><th class="amount">Amount</th>' + (deletable ? '<th></th>' : '') + '</tr></thead><tbody>' + invoiceRows(rows, deletable) + '</tbody></table>';

      document.documentElement.dataset.fixture = scenario;
      if (scenario === 'checkout') {
        let generation = 0;
        app.innerHTML = heading('Review your order', 'A carefully made workspace, ready for delivery.') + '<div class="checkout-layout"><div class="panel"><div class="panelhead"><strong>Your bag</strong><span class="count">2 items</span></div><div class="product"><div class="product-art" aria-hidden="true"><span></span></div><div><strong>Everyday desk light</strong><p>Graphite · warm LED</p><span>$99.00</span></div><span class="qty">× 1</span></div><div class="product"><div class="product-art notebook" aria-hidden="true"><span></span></div><div><strong>Field notebook set</strong><p>Olive · pack of three</p><span>$50.00</span></div><span class="qty">× 1</span></div></div><div class="panel summary"><div class="panelhead"><strong>Order summary</strong><span class="count">USD</span></div><div class="summarybody"><label for="promo-code">Promo code</label><div class="promo"><input id="promo-code" data-testid="promo-code" value="SHIP20" aria-label="Promo code" /><button data-testid="apply-promo">Apply Promo</button></div><p id="hint" class="hint">Apply your code to refresh the quote.</p><div class="price-line"><span>Subtotal</span><span>$149.00</span></div><div class="price-line"><span>Delivery</span><span>Included</span></div><div class="price-line discount"><span>Promotion</span><span id="discount">—</span></div><div class="price-line total" data-testid="result" data-proof="149.00"><span>Total</span><strong id="total">$149.00</strong></div><div class="quote-meta" id="quote-meta">Initial quote · awaiting promotion</div></div></div></div><div class="sample-note">Synthetic order amounts and versioned quotes. The repeated request reproduces a rapid double-click.</div>';
        document.querySelector('[data-testid="apply-promo"]').addEventListener('click', async () => {
          const current = ++generation;
          const id = current === 1 ? 'old' : 'new';
          document.getElementById('hint').textContent = 'Applying promotion · request ' + current + '…';
          emit(id, 'request', 'Apply Promo request ' + current, 'Both requests apply SHIP20; the newest response should own the total.');
          try {
            const response = await fetch('/fixtures/api/quote', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({promo:document.getElementById('promo-code').value, requestOrdinal:current}) });
            if (!response.ok) throw new Error('Quote request failed');
            const data = await response.json();
            if (fixed && current !== generation) {
              document.getElementById('hint').textContent = 'Older quote ignored. Latest total preserved.';
              emit(id, 'ignored', 'Ignored stale quote ' + data.requestId, 'Request ' + current + ' no longer owns the checkout total.');
            } else {
              document.getElementById('total').textContent = money(data.total);
              document.getElementById('discount').textContent = data.total < 149 ? '−' + money(149 - data.total) : '—';
              document.querySelector('[data-testid="result"]').setAttribute('data-proof', Number(data.total).toFixed(2));
              document.getElementById('quote-meta').textContent = data.requestId + ' · revision ' + data.revision;
              document.getElementById('hint').textContent = 'Quote updated from request ' + current + '.';
              emit(id, 'applied', 'Applied ' + data.requestId + ': ' + money(data.total), 'Quote revision ' + data.revision + ' now determines the visible total.');
            }
          } catch (error) { document.getElementById('hint').textContent = 'Could not refresh the quote.'; emit(id, 'error', 'Request failed', String(error)); }
          finally { emit(id, 'settled', 'Promo request ' + current + ' handled'); }
        });
      } else if (scenario === 'workspace') {
        let selected = 'acme';
        let generation = 0;
        const initialInvoices = [{ id: 'INV-1042', client: 'Acme Studio', amount: 8400, status: 'Due' }, { id: 'INV-1043', client: 'Acme Studio', amount: 2650, status: 'Paid' }];
        app.innerHTML = heading('Invoices', 'Manage billing across your client workspaces.') + '<div class="tabs"><button data-testid="old-action" aria-pressed="true"><span class="tabdot"></span>Acme Studio</button><button data-testid="new-action" aria-pressed="false"><span class="tabdot"></span>Nimbus Labs</button></div><div class="panel" data-testid="result" data-proof="acme"><div class="panelhead"><strong id="workspace-title">Acme Studio</strong><span class="count" id="row-count">2 invoices</span></div><div id="rows">' + table(initialInvoices, false) + '</div></div><div class="hint" id="hint">Select a workspace to refresh its invoices.</div>';
        async function selectWorkspace(workspace, id) {
          selected = workspace;
          const current = ++generation;
          document.querySelector('[data-testid="old-action"]').setAttribute('aria-pressed', String(workspace === 'acme'));
          document.querySelector('[data-testid="new-action"]').setAttribute('aria-pressed', String(workspace === 'nimbus'));
          document.getElementById('workspace-title').textContent = workspace === 'acme' ? 'Acme Studio' : 'Nimbus Labs';
          document.getElementById('hint').textContent = 'Loading ' + (workspace === 'acme' ? 'Acme Studio' : 'Nimbus Labs') + ' invoices…';
          emit(id, 'request', 'Requested ' + workspace + ' invoices');
          try {
            const response = await fetch('/fixtures/api/workspace/' + workspace);
            const data = await response.json();
            if (fixed && current !== generation) {
              emit(id, 'ignored', 'Discarded stale ' + workspace + ' response', 'A newer workspace selection owns the view.');
            } else {
              const rows = document.getElementById('rows'); rows.className = ''; rows.innerHTML = table(data.invoices, false);
              document.querySelector('[data-testid="result"]').setAttribute('data-proof', data.workspace);
              document.getElementById('row-count').textContent = data.invoices.length + ' invoices';
              document.getElementById('hint').textContent = 'Loaded ' + data.name + ' · selected workspace is ' + selected + '.';
              emit(id, 'applied', 'Rendered ' + workspace + ' invoices', 'Visible data belongs to ' + data.workspace + '; selected workspace is ' + selected + '.');
            }
          } catch (error) { document.getElementById('hint').textContent = 'Could not load invoices.'; emit(id, 'error', 'Request failed', String(error)); }
          finally { emit(id, 'settled', workspace + ' response handled'); }
        }
        document.querySelector('[data-testid="old-action"]').addEventListener('click', () => selectWorkspace('acme', 'old'));
        document.querySelector('[data-testid="new-action"]').addEventListener('click', () => selectWorkspace('nimbus', 'new'));
      } else if (scenario === 'search') {
        let generation = 0;
        app.innerHTML = heading('Find a document', 'Search invoices, inventory reports, and project records.') + '<label class="eyebrow" for="query">Search your workspace</label><input id="query" data-testid="query" class="search" placeholder="Try inv, then invoice" autocomplete="off" /><div class="panel" data-testid="result" data-proof="none"><div class="panelhead"><strong id="search-title">All documents</strong><span class="count" id="row-count">3 documents</span></div><div id="rows"><div class="resultrow"><div class="filemark">DOC</div><div><strong>Invoice INV-1042 — Acme Studio</strong><small>Invoice · Updated today</small></div></div><div class="resultrow"><div class="filemark">DOC</div><div><strong>Inventory — warehouse devices</strong><small>Inventory · 17 items</small></div></div><div class="resultrow"><div class="filemark">DOC</div><div><strong>Invoice INV-2018 — Nimbus Labs</strong><small>Invoice · Due in 7 days</small></div></div></div></div><div class="hint" id="hint">Results should always match the latest search.</div>';
        document.getElementById('query').addEventListener('input', async event => {
          const query = event.target.value;
          if (!query) return;
          const id = query === 'inv' ? 'old' : 'new';
          const current = ++generation;
          document.getElementById('search-title').textContent = 'Results for “' + query + '”';
          document.getElementById('hint').textContent = 'Searching your documents…';
          emit(id, 'request', 'Requested results for “' + query + '”');
          try {
            const response = await fetch('/fixtures/api/search?q=' + encodeURIComponent(query));
            const data = await response.json();
            if (fixed && current !== generation) { emit(id, 'ignored', 'Discarded stale search results', 'The search field contains a newer query.'); }
            else {
              const rows = document.getElementById('rows'); rows.className = '';
              rows.innerHTML = data.results.map(row => '<div class="resultrow"><div class="filemark">DOC</div><div><strong>' + row.title + '</strong><small>' + row.kind + ' · ' + row.id + '</small></div></div>').join('');
              document.querySelector('[data-testid="result"]').setAttribute('data-proof', data.query);
              document.getElementById('row-count').textContent = data.results.length + ' results';
              document.getElementById('hint').textContent = 'Showing matches for “' + data.query + '”.';
              emit(id, 'applied', 'Rendered “' + data.query + '” results', 'The input currently reads “' + document.getElementById('query').value + '”.');
            }
          } catch (error) { document.getElementById('hint').textContent = 'Search could not finish.'; emit(id, 'error', 'Request failed', String(error)); }
          finally { emit(id, 'settled', 'Search response handled'); }
        });
      } else if (scenario === 'optimistic') {
        let records = [
          {id:'INV-1042',client:'Acme Studio',amount:8400,status:'Due'},
          {id:'INV-1043',client:'Acme Studio',amount:2650,status:'Paid'},
          {id:'INV-1044',client:'Fern & Co.',amount:1800,status:'Draft'},
          {id:'INV-1045',client:'Monument',amount:5200,status:'Due'}
        ];
        app.innerHTML = heading('Invoice archive', 'Remove drafts and keep your billing records tidy.') + '<div id="notice" aria-live="polite"></div><div class="panel" data-testid="result"><div class="panelhead"><strong>Recent invoices</strong><span class="count" id="row-count"></span></div><div id="rows"></div></div><div class="hint" id="hint">Changes appear immediately while the server confirms.</div>';
        function render() {
          document.getElementById('rows').innerHTML = table(records, true);
          document.getElementById('row-count').textContent = records.length + ' invoices';
          document.querySelector('[data-testid="result"]').setAttribute('data-proof', records.map(row => row.id).sort().join(','));
          document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => removeInvoice(button.dataset.delete)));
        }
        async function removeInvoice(invoiceId) {
          const id = invoiceId === 'INV-1042' ? 'old' : 'new';
          const before = records.map(row => ({...row}));
          const deleted = records.find(row => row.id === invoiceId);
          records = records.filter(row => row.id !== invoiceId); render();
          document.getElementById('hint').textContent = 'Saving changes…';
          emit(id, 'request', 'Delete requested for ' + invoiceId, 'Row removed optimistically.');
          try {
            const response = await fetch('/fixtures/api/delete/' + invoiceId, {method:'DELETE'});
            const data = await response.json();
            if (!response.ok) {
              if (fixed) { if (!records.some(row => row.id === invoiceId)) records = [...records, deleted].sort((a,b) => a.id.localeCompare(b.id)); }
              else records = before;
              document.getElementById('notice').className = 'notice'; document.getElementById('notice').textContent = invoiceId + ': ' + data.error;
              render();
              emit(id, 'applied', fixed ? 'Restored only the rejected deletion' : 'Restored an outdated list snapshot', fixed ? 'Other successful deletions remain intact.' : 'The snapshot can resurrect a separately deleted invoice.');
            } else {
              records = records.filter(row => row.id !== invoiceId); render();
              emit(id, 'applied', 'Confirmed deletion of ' + invoiceId);
            }
            document.getElementById('hint').textContent = 'Server response handled. Review the remaining invoice IDs.';
          } catch (error) { emit(id, 'error', 'Request failed', String(error)); }
          finally { emit(id, 'settled', invoiceId + ' response handled'); }
        }
        render();
      } else { app.textContent = 'Unknown fixture scenario.'; }
    })();
  
