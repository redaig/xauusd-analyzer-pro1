const fs = require('fs');
const https = require('https');

const API_KEY = '9257f2ba3e95b7f249f0c11cce2bb109';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  const series = {
    FEDFUNDS: 'FEDFUNDS', CPIAUCSL: 'CPIAUCSL', CPILFESL: 'CPILFESL',
    UNRATE: 'UNRATE', PAYEMS: 'PAYEMS', DGS10: 'DGS10',
    DTWEXBGS: 'DTWEXBGS', PPIACO: 'PPIACO', UMCSENT: 'UMCSENT',
    RSAFS: 'RSAFS', INDPRO: 'INDPRO', HOUST: 'HOUST', M2SL: 'M2SL', VIXCLS: 'VIXCLS',
  };
  const results = {};
  for (const [name, id] of Object.entries(series)) {
    try {
      const limit = (name === 'CPIAUCSL' || name === 'CPILFESL' || name === 'PPIACO') ? 15 : 3;
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${API_KEY}&file_type=json&limit=${limit}&sort_order=desc`;
      const data = await fetch(url);
      results[name] = data;
    } catch (err) {
      console.error(`[FRED] Error ${name}:`, err.message);
      results[name] = null;
    }
  }

  const cpiObs = results.CPIAUCSL?.observations || [];
  const cpiYoY = cpiObs.length >= 13 ? (((parseFloat(cpiObs[0].value) - parseFloat(cpiObs[12].value)) / parseFloat(cpiObs[12].value)) * 100).toFixed(2) : '0';
  const cpiMoM = cpiObs.length >= 2 ? (((parseFloat(cpiObs[0].value) - parseFloat(cpiObs[1].value)) / parseFloat(cpiObs[1].value)) * 100).toFixed(2) : '0';
  const coreObs = results.CPILFESL?.observations || [];
  const coreCpiYoY = coreObs.length >= 13 ? (((parseFloat(coreObs[0].value) - parseFloat(coreObs[12].value)) / parseFloat(coreObs[12].value)) * 100).toFixed(2) : '0';
  const ppiObs = results.PPIACO?.observations || [];
  const ppiYoY = ppiObs.length >= 13 ? (((parseFloat(ppiObs[0].value) - parseFloat(ppiObs[12].value)) / parseFloat(ppiObs[12].value)) * 100).toFixed(2) : '0';
  const nfpObs = results.PAYEMS?.observations || [];
  const nfpChange = nfpObs.length >= 2 ? (parseFloat(nfpObs[0].value) - parseFloat(nfpObs[1].value)).toFixed(0) : '0';

  const output = {
    timestamp: new Date().toISOString(),
    fedRate: results.FEDFUNDS?.observations?.[0]?.value || '0',
    cpiIndex: results.CPIAUCSL?.observations?.[0]?.value || '0',
    cpiYoY, cpiMoM,
    coreCpiIndex: results.CPILFESL?.observations?.[0]?.value || '0',
    coreCpiYoY,
    unemployment: results.UNRATE?.observations?.[0]?.value || '0',
    nfpLevel: results.PAYEMS?.observations?.[0]?.value || '0',
    nfpChange,
    us10y: results.DGS10?.observations?.[0]?.value || '0',
    dxy: results.DTWEXBGS?.observations?.[0]?.value || '0',
    ppiIndex: results.PPIACO?.observations?.[0]?.value || '0',
    ppiYoY,
    consumerSentiment: results.UMCSENT?.observations?.[0]?.value || '0',
    retailSales: results.RSAFS?.observations?.[0]?.value || '0',
    industrialProduction: results.INDPRO?.observations?.[0]?.value || '0',
    housingStarts: results.HOUST?.observations?.[0]?.value || '0',
    m2Supply: results.M2SL?.observations?.[0]?.value || '0',
    vix: results.VIXCLS?.observations?.[0]?.value || '0',
  };

  fs.mkdirSync('./public', { recursive: true });
  fs.writeFileSync('./public/fred-data.json', JSON.stringify(output, null, 2));
  console.log('[FRED] OK:', output.cpiYoY + '% CPI |', output.fedRate + '% FED |', 'DXY', output.dxy);
}

main().catch(e => { console.error('[FRED] FAILED:', e.message); process.exit(0); });
