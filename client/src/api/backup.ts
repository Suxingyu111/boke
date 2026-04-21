import { http, post, remove, request } from "@/api/http";

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

export async function createBackup() {
  const response = await post<BackupFile, undefined>("/admin/backup", undefined);
  return response.data;
}

export async function listBackups() {
  const response = await request<BackupFile[]>("/admin/backup");
  return response.data;
}

export async function restoreBackup(filename: string) {
  const response = await post<{ message: string }, undefined>(
    `/admin/backup/${encodeURIComponent(filename)}/restore`,
    undefined,
  );
  return response.data;
}

export async function deleteBackup(filename: string) {
  const response = await remove<{ message: string }>(
    `/admin/backup/${encodeURIComponent(filename)}`,
  );
  return response.data;
}

export async function downloadBackupFile(filename: string) {
  const blob = await http.get<Blob, Blob>(
    `/admin/backup/${encodeURIComponent(filename)}/download`,
    {
      responseType: "blob",
    },
  );

  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function getBackupDownloadUrl(filename: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
  return `${baseUrl}/admin/backup/${encodeURIComponent(filename)}/download`;
}
