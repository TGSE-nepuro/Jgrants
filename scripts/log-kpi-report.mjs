import fs from 'node:fs';
import process from 'node:process';

function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.min(Math.max(rank, 0), sortedValues.length - 1);
  return sortedValues[index];
}

function parseLogLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // node --test output may prefix logs with "# "
  const jsonText = trimmed.startsWith('# ') ? trimmed.slice(2) : trimmed;
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.message !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function detectOperation(message) {
  if (message.includes('search')) return 'search';
  if (message.includes('detail')) return 'detail';
  return null;
}

export function computeKpiFromLogs(inputText) {
  const requests = new Map();

  const lines = inputText.split(/\r?\n/);
  for (const line of lines) {
    const entry = parseLogLine(line);
    if (!entry) continue;

    const message = entry.message;
    const meta = entry.meta && typeof entry.meta === 'object' ? entry.meta : {};
    const requestId = typeof meta.requestId === 'string' ? meta.requestId : null;
    const operation = detectOperation(message) || (typeof meta.operation === 'string' ? meta.operation : null);

    if (!requestId || !operation) continue;

    const current = requests.get(requestId) || {
      requestId,
      operation,
      fallback: false,
      completed: false,
      failed: false,
      durationMs: null
    };

    if (message.startsWith('Fallback to v1')) {
      current.fallback = true;
    }

    if (message === 'jgrants search completed' || message === 'jgrants detail completed') {
      current.completed = true;
      current.durationMs = toNumber(meta.durationMs);
    }

    if (
      message === 'jgrants request failed' ||
      message === 'jgrants search failed without fallback' ||
      message === 'jgrants detail failed without fallback' ||
      message === 'jgrants search failed after fallback' ||
      message === 'jgrants detail failed after fallback'
    ) {
      current.failed = true;
    }

    requests.set(requestId, current);
  }

  const all = [...requests.values()];
  const totalRequests = all.length;
  const failedRequests = all.filter((r) => r.failed && !r.completed).length;
  const fallbackRequests = all.filter((r) => r.fallback).length;

  const completedSearch = all
    .filter((r) => r.completed && r.operation === 'search' && typeof r.durationMs === 'number')
    .map((r) => r.durationMs)
    .sort((a, b) => a - b);
  const completedDetail = all
    .filter((r) => r.completed && r.operation === 'detail' && typeof r.durationMs === 'number')
    .map((r) => r.durationMs)
    .sort((a, b) => a - b);

  const failureRate = totalRequests === 0 ? 0 : failedRequests / totalRequests;
  const fallbackRate = totalRequests === 0 ? 0 : fallbackRequests / totalRequests;

  return {
    totals: {
      requests: totalRequests,
      failedRequests,
      fallbackRequests
    },
    rates: {
      failureRate,
      fallbackRate
    },
    p95: {
      searchMs: percentile(completedSearch, 95),
      detailMs: percentile(completedDetail, 95)
    }
  };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function readInput(args) {
  if (args.length > 0) {
    return args.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
  }

  const stdin = fs.readFileSync(0, 'utf8');
  return stdin;
}

function main() {
  const input = readInput(process.argv.slice(2));
  const report = computeKpiFromLogs(input);

  console.log(JSON.stringify(report, null, 2));
  console.log('');
  console.log(`failureRate: ${formatPercent(report.rates.failureRate)}`);
  console.log(`fallbackRate: ${formatPercent(report.rates.fallbackRate)}`);
  console.log(`p95.searchMs: ${report.p95.searchMs ?? 'N/A'}`);
  console.log(`p95.detailMs: ${report.p95.detailMs ?? 'N/A'}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
