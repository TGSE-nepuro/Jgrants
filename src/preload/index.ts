import { contextBridge, ipcRenderer } from "electron";
import { FavoriteGrant, GrantSearchQuery, GrantSummary } from "../shared/types";

contextBridge.exposeInMainWorld("jgrantsApi", {
  search: (token: string, query: GrantSearchQuery) => ipcRenderer.invoke("grants:search", token, query),
  detail: (token: string, grantId: string) => ipcRenderer.invoke("grants:detail", token, grantId),
  listFavorites: () => ipcRenderer.invoke("favorites:list"),
  saveFavorite: (favorite: FavoriteGrant) => ipcRenderer.invoke("favorites:save", favorite),
  removeFavorite: (grantId: string) => ipcRenderer.invoke("favorites:remove", grantId),
  exportCsv: (grants: GrantSummary[]) => ipcRenderer.invoke("grants:exportCsv", grants),
  getToken: () => ipcRenderer.invoke("token:get"),
  setToken: (token: string) => ipcRenderer.invoke("token:set", token),
  clearToken: () => ipcRenderer.invoke("token:clear")
});
