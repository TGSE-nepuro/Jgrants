import { FormEvent, useEffect, useMemo, useState } from "react";
import { FavoriteGrant, GrantDetail, GrantSummary } from "../shared/types";

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ui-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function App() {
  const [token, setToken] = useState("");
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("");
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

  const selectedGrants = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const result = await window.jgrantsApi.search(token, { keyword, region }, { requestId: createRequestId() });
      setItems(result);
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
            <input value={region} placeholder="地域" onChange={(e) => setRegion(e.target.value)} />
            <button type="submit">検索</button>
            <button type="button" onClick={() => void exportCsv()}>比較CSV出力</button>
          </form>
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
