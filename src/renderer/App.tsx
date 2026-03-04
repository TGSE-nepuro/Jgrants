import { FormEvent, useEffect, useMemo, useState } from "react";
import { FavoriteGrant, GrantDetail, GrantSummary } from "../shared/types";
import { isRegionOption, REGION_OPTIONS, suggestRegions } from "../shared/regions";
import { buildRegionQueries, mergeGrantResults } from "../shared/grant-search-utils";

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ui-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function App() {
  const [token, setToken] = useState("");
  const [keyword, setKeyword] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [includeNationwide, setIncludeNationwide] = useState(true);
  const [regionOptions, setRegionOptions] = useState<string[]>([...REGION_OPTIONS]);
  const [items, setItems] = useState<GrantSummary[]>([]);
  const [detail, setDetail] = useState<GrantDetail | null>(null);
  const [favorites, setFavorites] = useState<FavoriteGrant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [savedFavorites, savedToken] = await Promise.all([
        window.jgrantsApi.listFavorites(),
        window.jgrantsApi.getToken()
      ]);
      setFavorites(savedFavorites);
      setToken(savedToken);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const loaded = await window.jgrantsApi.listRegions(token, { requestId: createRequestId() });
        if (loaded.length === 0) return;
        const merged = [...new Set([...loaded, ...REGION_OPTIONS])].sort((a, b) => a.localeCompare(b, "ja"));
        setRegionOptions(merged);
      } catch {
        // keep fallback region options when API region loading fails
      }
    })();
  }, [token]);

  const selectedGrants = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );
  const regionCandidates = useMemo(
    () => suggestRegions(regionInput, regionOptions).filter((candidate) => !selectedRegions.includes(candidate)),
    [regionInput, selectedRegions, regionOptions]
  );

  function addRegion(valueRaw: string) {
    const value = valueRaw.trim();
    if (!value) return;
    if (!isRegionOption(value, regionOptions)) {
      setError("地域は候補から選択してください");
      return;
    }
    if (selectedRegions.includes(value)) {
      setRegionInput("");
      return;
    }
    setSelectedRegions((current) => [...current, value]);
    setRegionInput("");
  }

  function removeRegion(value: string) {
    setSelectedRegions((current) => current.filter((region) => region !== value));
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const pendingRegion = regionInput.trim();
      let effectiveRegions = selectedRegions;
      if (pendingRegion) {
        if (!isRegionOption(pendingRegion, regionOptions)) {
          setError("地域は候補から選択してください");
          return;
        }
        if (!effectiveRegions.includes(pendingRegion)) {
          effectiveRegions = [...effectiveRegions, pendingRegion];
          setSelectedRegions(effectiveRegions);
        }
        setRegionInput("");
      }

      const regionQueries = buildRegionQueries(effectiveRegions, includeNationwide);
      const results = await Promise.all(
        (regionQueries.length > 0
          ? regionQueries.map((region) =>
              window.jgrantsApi.search(token, { keyword, region }, { requestId: createRequestId() })
            )
          : [window.jgrantsApi.search(token, { keyword }, { requestId: createRequestId() })])
      );
      setItems(mergeGrantResults(results));
      setSelectedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "検索失敗");
    }
  }

  async function openDetail(item: GrantSummary) {
    setError(null);
    setMessage(null);
    try {
      setDetail(await window.jgrantsApi.detail(token, item.id, { requestId: createRequestId() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "詳細取得失敗");
    }
  }

  async function addFavorite(item: GrantSummary) {
    setError(null);
    setMessage(null);
    try {
      await window.jgrantsApi.saveFavorite({
        id: item.id,
        title: item.title,
        organization: item.organization,
        savedAt: new Date().toISOString()
      });
      setFavorites(await window.jgrantsApi.listFavorites());
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失敗");
    }
  }

  async function removeFavorite(id: string) {
    setError(null);
    setMessage(null);
    try {
      await window.jgrantsApi.removeFavorite(id);
      setFavorites(await window.jgrantsApi.listFavorites());
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除失敗");
    }
  }

  async function saveToken() {
    setError(null);
    setMessage(null);
    try {
      await window.jgrantsApi.setToken(token);
      setMessage("トークンを保存しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "トークン保存失敗");
    }
  }

  async function clearToken() {
    setError(null);
    setMessage(null);
    try {
      await window.jgrantsApi.clearToken();
      setToken("");
      setMessage("トークンを削除しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "トークン削除失敗");
    }
  }

  async function exportCsv() {
    setError(null);
    setMessage(null);
    try {
      if (selectedGrants.length === 0) {
        setError("CSV出力対象を1件以上選択してください");
        return;
      }
      const result = await window.jgrantsApi.exportCsv(selectedGrants);
      if (result.path) {
        setMessage(`CSVを保存しました: ${result.path}`);
      } else {
        setMessage("CSV保存をキャンセルしました");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV出力失敗");
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id]
    );
  }

  return (
    <div className="app">
      <header>
        <h1>JGrants Desktop</h1>
        <input type="password" value={token} placeholder="API Token" onChange={(e) => setToken(e.target.value)} />
        <button onClick={() => void saveToken()}>トークン保存</button>
        <button onClick={() => void clearToken()}>トークン削除</button>
      </header>
      <main>
        <section>
          <h2>検索</h2>
          <form onSubmit={onSearch}>
            <input value={keyword} placeholder="キーワード" onChange={(e) => setKeyword(e.target.value)} />
            <input
              value={regionInput}
              placeholder="地域を追加"
              onChange={(e) => setRegionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRegion(regionInput);
                }
              }}
            />
            <button type="button" onClick={() => addRegion(regionInput)}>地域追加</button>
            <label>
              <input
                type="checkbox"
                checked={includeNationwide}
                onChange={(e) => setIncludeNationwide(e.target.checked)}
              />
              全国案件を含める
            </label>
            <button type="submit">検索</button>
            <button type="button" onClick={() => void exportCsv()}>比較CSV出力</button>
          </form>
          <div className="region-suggestions">
            {regionCandidates.slice(0, 15).map((candidate) => (
              <button key={candidate} type="button" onClick={() => addRegion(candidate)}>
                {candidate}
              </button>
            ))}
          </div>
          <div>
            {selectedRegions.map((region) => (
              <button key={region} type="button" onClick={() => removeRegion(region)}>
                {region} ×
              </button>
            ))}
          </div>
          {message && <p>{message}</p>}
          {error && <p className="error">{error}</p>}
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelection(item.id)}
                />
                <button onClick={() => void openDetail(item)}>{item.title}</button>
                {item.region && <span>{item.region}</span>}
                <button onClick={() => void addFavorite(item)}>保存</button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>詳細</h2>
          {detail ? (
            <article>
              <h3>{detail.title}</h3>
              <p>{detail.organization}</p>
              <p>{detail.description}</p>
            </article>
          ) : (
            <p>未選択</p>
          )}
        </section>
        <section>
          <h2>お気に入り</h2>
          <ul>
            {favorites.map((f) => (
              <li key={f.id}>
                <span>{f.title}</span>
                <button onClick={() => void removeFavorite(f.id)}>削除</button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
