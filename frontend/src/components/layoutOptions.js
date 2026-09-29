const MAX_DIM = 50;

export function computeLayoutOptions(N, opts = {}) {
  const { hideSingleRowColOver = 20, maxDim = MAX_DIM } = opts;
  if (N <= 0) return [];

  const options = [];
  const seen = new Set();

  const pushOpt = (rows, cols, pad = 0, base = N) => {
    if (rows > maxDim || cols > maxDim) return;
    if (N > hideSingleRowColOver && (rows === 1 || cols === 1)) return;

    const key = `${rows}x${cols}@${base}`;
    if (seen.has(key)) return;
    seen.add(key);

    options.push({
      key,
      rows,
      cols,
      pad,
      base,
      label: pad > 0 ? `${rows} × ${cols} (pad ${pad})` : `${rows} × ${cols}`,
    });
  };

  for (let r = 1; r * r <= N; r++) {
    if (N % r === 0) {
      const c = N / r;
      pushOpt(r, c, 0, N);
      if (r !== c) pushOpt(c, r, 0, N);
    }
  }

  const r0 = Math.floor(Math.sqrt(N));
  for (let r = Math.max(1, r0 - 8); r <= r0 + 8; r++) {
    const c = Math.ceil(N / r);
    const pad = r * c - N;
    if (r * c >= N) {
      pushOpt(r, c, pad, r * c);
      if (r !== c) pushOpt(c, r, pad, r * c);
    }
  }

  pushOpt(1, N, 0, N);
  if (N !== 1) pushOpt(N, 1, 0, N);

  options.sort((a, b) => {
    if (a.pad !== b.pad) return a.pad - b.pad;
    const aspectA = Math.abs(a.rows / a.cols - 1);
    const aspectB = Math.abs(b.rows / b.cols - 1);
    if (aspectA !== aspectB) return aspectA - aspectB;
    return a.base - b.base;
  });

  return options;
}

export function buildMask(N, base) {
  return Array.from({ length: base }, (_, i) => i < N);
}
