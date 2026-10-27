import { getScenario, getScenarioProgram, type RunRequest } from '../domain/index';
import type { SimulatedFrame } from '../domain/simulation';

const escape = (value: unknown) => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]!));
const text = (x: number, y: number, value: unknown, size = 18, color = '#334155', weight = 400) => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;
const panel = (x: number, y: number, width: number, height: number) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="white" stroke="#dbe3e0"/>`;

export const renderSimulationSnapshot = (request: RunRequest, frame: SimulatedFrame) => {
  const program = getScenarioProgram(request.scenarioId);
  const label = getScenario(request.scenarioId).shortLabel;
  let content = '';
  if (request.scenarioId === 'checkout') {
    content = text(48,172,'Review your order',30,'#18372c',700) + panel(48,210,440,290) + panel(510,210,402,290)
      + text(70,250,'Your bag',19,'#243f35',700) + text(70,300,'Everyday desk light') + text(405,300,'$99.00')
      + text(70,355,'Field notebook set') + text(405,355,'$50.00') + text(535,250,'Order summary',19,'#243f35',700)
      + text(535,300,'Promo code: SHIP20',16) + text(535,350,'Two Apply Promo requests',16)
      + text(535,420,'Total',22,'#243f35',700) + text(720,427,`$${frame.actual}`,38,'#243f35',700)
      + text(535,468,request.variant === 'fixed' ? 'Latest-request guard enabled' : 'Seeded stale-response defect',14);
  } else if (request.scenarioId === 'workspace') {
    const response = frame.actual === 'nimbus' ? program.requests.second.body : program.requests.first.body;
    const rows = response.invoices as {id:string;client:string;amount:number;status:string}[];
    content = text(48,172,'Invoices',30,'#18372c',700) + text(48,209,'Selected workspace: Nimbus Labs',18)
      + panel(48,240,864,270) + text(70,280,'Invoice',16,'#64736b',700) + text(270,280,'Customer',16,'#64736b',700)
      + text(635,280,'Status',16,'#64736b',700) + text(780,280,'Amount',16,'#64736b',700)
      + rows.map((row,index) => text(70,345+index*65,row.id) + text(270,345+index*65,row.client) + text(635,345+index*65,row.status) + text(780,345+index*65,`$${row.amount.toLocaleString('en-US')}`)).join('');
  } else if (request.scenarioId === 'search') {
    const response = frame.actual === 'inv' ? program.requests.first.body : program.requests.second.body;
    const rows = response.results as {title:string;kind:string}[];
    content = text(48,172,'Find a document',30,'#18372c',700) + panel(48,205,864,65) + text(70,246,'Search: invoice',20)
      + panel(48,300,864,220) + text(70,340,`Results for ${frame.actual === 'none' ? 'all documents' : frame.actual}`,18,'#64736b',700)
      + rows.map((row,index)=> text(70,393+index*65,row.title,19) + text(70,417+index*65,row.kind,14,'#596b61')).join('');
  } else content = text(48,172,'Invoice archive',30,'#18372c',700) + text(48,235,'Remaining invoice IDs:',20) + frame.actual.split(',').map((id,index)=>text(60,290+index*45,id,20)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="660" viewBox="0 0 960 660" role="img" aria-label="Deterministic simulation snapshot: ${escape(label)}"><rect width="960" height="660" fill="#f8faf8"/><rect width="960" height="82" fill="#eef2f7"/>${text(40,38,'LATCH · DETERMINISTIC SIMULATION',19,'#445673',700)}${text(40,64,'Modeled fixture state — not a browser capture',15,'#52647b')}${content}<rect x="0" y="558" width="960" height="102" fill="#eef2f7"/>${text(40,593,frame.label,18,'#34465f',700)}${text(40,622,frame.outcome,15,'#4d607a')}</svg>`;
};
