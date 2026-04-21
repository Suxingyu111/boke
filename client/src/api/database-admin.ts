import { patch, post, request } from "@/api/http";
import type {
  DatabaseOverview,
  DatabaseTableDetail,
  DatabaseTableMutationResult,
  DatabaseTableRowsPage,
  DatabaseTableSummary,
} from "@/types/blog";

export interface DatabaseTableListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  engine?: string;
}

export interface DatabaseTableRowsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface DatabaseTableListPage {
  items: DatabaseTableSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DatabaseTableRowCreatePayload {
  values: Record<string, unknown>;
}

export interface DatabaseTableRowUpdatePayload {
  primaryKey: Record<string, unknown>;
  values: Record<string, unknown>;
}

export interface DatabaseTableRowDeletePayload {
  primaryKey: Record<string, unknown>;
}

export async function getDatabaseOverview() {
  const response = await request<DatabaseOverview>("/admin/database/overview");
  return response.data;
}

export async function getDatabaseTables(params: DatabaseTableListQuery = {}) {
  const response = await request<DatabaseTableListPage>("/admin/database/tables", params);
  return response.data;
}

export async function getDatabaseTableDetail(tableName: string) {
  const response = await request<DatabaseTableDetail>(
    `/admin/database/tables/${encodeURIComponent(tableName)}`,
  );
  return response.data;
}

export async function getDatabaseTableRows(
  tableName: string,
  params: DatabaseTableRowsQuery = {},
) {
  const response = await request<DatabaseTableRowsPage>(
    `/admin/database/tables/${encodeURIComponent(tableName)}/rows`,
    params,
  );
  return response.data;
}

export async function createDatabaseTableRow(
  tableName: string,
  payload: DatabaseTableRowCreatePayload,
) {
  const response = await post<DatabaseTableMutationResult, DatabaseTableRowCreatePayload>(
    `/admin/database/tables/${encodeURIComponent(tableName)}/rows`,
    payload,
  );
  return response.data;
}

export async function updateDatabaseTableRow(
  tableName: string,
  payload: DatabaseTableRowUpdatePayload,
) {
  const response = await patch<DatabaseTableMutationResult, DatabaseTableRowUpdatePayload>(
    `/admin/database/tables/${encodeURIComponent(tableName)}/rows`,
    payload,
  );
  return response.data;
}

export async function deleteDatabaseTableRow(
  tableName: string,
  payload: DatabaseTableRowDeletePayload,
) {
  const response = await post<DatabaseTableMutationResult, DatabaseTableRowDeletePayload>(
    `/admin/database/tables/${encodeURIComponent(tableName)}/rows/delete`,
    payload,
  );
  return response.data;
}
