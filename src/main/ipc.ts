import { registerIpcHandlers } from "./ipc-handlers";
import { ipcMain } from "electron";
import { fetchGrantDetail, listRegions, searchGrants } from "./jgrants-client";
import { listFavorites, removeFavorite, saveFavorite } from "./favorites-store";
import { exportGrantsCsv } from "./csv-export";
import { clearToken, getToken, setToken } from "./token-store";
import { clearLogs, listLogs } from "./log-store";

registerIpcHandlers(ipcMain, {
  searchGrants,
  fetchGrantDetail,
  listRegions,
  listFavorites,
  saveFavorite,
  removeFavorite,
  exportCsv: exportGrantsCsv,
  getToken,
  setToken,
  clearToken,
  listLogs: async () => listLogs(),
  clearLogs: async () => clearLogs()
});
