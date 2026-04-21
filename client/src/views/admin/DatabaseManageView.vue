<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as databaseAdminApi from "@/api/database-admin";
import { getApiErrorMessage } from "@/api/auth";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import EmptyState from "@/components/EmptyState.vue";
import Pagination from "@/components/Pagination.vue";
import type {
  DatabaseCellValue,
  DatabaseOverview,
  DatabaseTableColumn,
  DatabaseTableDetail,
  DatabaseTableForeignKey,
  DatabaseTableIndex,
  DatabaseTableRecord,
  DatabaseTableRowsPage,
  DatabaseTableSummary,
} from "@/types/blog";

type EditorMode = "create" | "edit" | "";

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "primary" | "danger";
  action: () => Promise<void>;
}

const tablePageSize = 14;
const rowPageSize = 12;

const overview = ref<DatabaseOverview | null>(null);
const tables = ref<DatabaseTableSummary[]>([]);
const tableTotal = ref(0);
const tableTotalPages = ref(1);
const tablePage = ref(1);
const selectedTableName = ref("");
const tableDetail = ref<DatabaseTableDetail | null>(null);
const tableRows = ref<DatabaseTableRowsPage | null>(null);
const rowPage = ref(1);
const bootLoading = ref(false);
const tableLoading = ref(false);
const detailLoading = ref(false);
const rowsLoading = ref(false);
const mutationLoading = ref(false);
const activeRowKey = ref("");
const notice = ref("");
const errorMessage = ref("");
const editorMode = ref<EditorMode>("");
const editorPrimaryKey = ref<Record<string, DatabaseCellValue> | null>(null);
const confirmRequest = ref<ConfirmRequest | null>(null);
const confirmLoading = ref(false);

const tableFilters = reactive({
  keyword: "",
  engine: "all",
});

const rowFilters = reactive({
  keyword: "",
});

const editorValues = reactive<Record<string, string>>({});
const editorNullState = reactive<Record<string, boolean>>({});

const engineOptions = computed(() => {
  const values = new Set<string>();
  overview.value?.engineStats.forEach((item) => values.add(item.engine));
  tables.value.forEach((table) => {
    if (table.engine) {
      values.add(table.engine);
    }
  });
  return Array.from(values).sort((left, right) => left.localeCompare(right, "zh-CN"));
});

const selectedTable = computed(() => {
  return (
    tableDetail.value?.table ??
    tables.value.find((item) => item.tableName === selectedTableName.value) ??
    null
  );
});

const editorColumns = computed(() => {
  if (!tableDetail.value) {
    return [] as DatabaseTableColumn[];
  }

  return tableDetail.value.columns.filter((column) =>
    editorMode.value === "create" ? column.creatable : column.editable,
  );
});

const tableStats = computed(() => ({
  tableCount: overview.value?.tableCount ?? 0,
  totalSize: overview.value?.totalSize ?? 0,
  estimatedRowCount: overview.value?.estimatedRowCount ?? 0,
  entityCount: overview.value?.typeormEntityCount ?? 0,
}));

function formatSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "未记录";
  }

  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function joinTextList(values: string[] | null | undefined, fallback = "无", separator = ", ") {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  return values.join(separator);
}

function encodePrimaryKey(primaryKey: Record<string, DatabaseCellValue>) {
  return JSON.stringify(
    Object.entries(primaryKey).sort(([left], [right]) => left.localeCompare(right, "zh-CN")),
  );
}

function primaryKeyLabel(primaryKey: Record<string, DatabaseCellValue>) {
  return Object.entries(primaryKey)
    .map(([columnName, value]) => `${columnName}=${formatInlineValue(value)}`)
    .join(", ");
}

function formatInlineValue(value: DatabaseCellValue) {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "string") {
    return value.length > 32 ? `${value.slice(0, 32)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const serialized = JSON.stringify(value);
  return serialized.length > 32 ? `${serialized.slice(0, 32)}…` : serialized;
}

function formatCellValue(value: DatabaseCellValue) {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function formatCellPreview(value: DatabaseCellValue) {
  const serialized = formatCellValue(value);
  return serialized.length > 80 ? `${serialized.slice(0, 80)}…` : serialized;
}

function formatIndexColumns(index: DatabaseTableIndex) {
  if (!Array.isArray(index.columns) || index.columns.length === 0) {
    return "无字段";
  }

  return index.columns
    .map((column) => (column.subPart ? `${column.columnName}(${column.subPart})` : column.columnName))
    .join(" · ");
}

function formatForeignKeyReference(foreignKey: DatabaseTableForeignKey) {
  return `${joinTextList(foreignKey.columns, "未知字段")} → ${foreignKey.referencedTableName || "未知表"}.${joinTextList(foreignKey.referencedColumns, "未知字段")}`;
}

function normalizeTableDetail(detail: DatabaseTableDetail): DatabaseTableDetail {
  return {
    ...detail,
    primaryKeyColumns: Array.isArray(detail.primaryKeyColumns) ? detail.primaryKeyColumns : [],
    searchableColumns: Array.isArray(detail.searchableColumns) ? detail.searchableColumns : [],
    columns: Array.isArray(detail.columns)
      ? detail.columns.map((column) => ({
          ...column,
          enumValues: Array.isArray(column.enumValues) ? column.enumValues : [],
        }))
      : [],
    indexes: Array.isArray(detail.indexes)
      ? detail.indexes.map((index) => ({
          ...index,
          columns: Array.isArray(index.columns) ? index.columns : [],
        }))
      : [],
    foreignKeys: Array.isArray(detail.foreignKeys)
      ? detail.foreignKeys.map((foreignKey) => ({
          ...foreignKey,
          columns: Array.isArray(foreignKey.columns) ? foreignKey.columns : [],
          referencedColumns: Array.isArray(foreignKey.referencedColumns)
            ? foreignKey.referencedColumns
            : [],
        }))
      : [],
  };
}

function normalizeTableRows(page: DatabaseTableRowsPage): DatabaseTableRowsPage {
  return {
    ...page,
    primaryKeyColumns: Array.isArray(page.primaryKeyColumns) ? page.primaryKeyColumns : [],
    searchableColumns: Array.isArray(page.searchableColumns) ? page.searchableColumns : [],
    items: Array.isArray(page.items) ? page.items : [],
  };
}

function getRowValue(row: DatabaseTableRecord, columnName: string) {
  return row.values[columnName] ?? null;
}

function getColumnBadgeClass(column: DatabaseTableColumn) {
  if (column.primaryKey) {
    return "border-brand/20 bg-brand/10 text-brand";
  }
  if (column.unique) {
    return "border-cobalt/20 bg-cobalt/10 text-cobalt";
  }
  if (column.indexed) {
    return "border-moss/20 bg-moss/10 text-moss";
  }
  return "border-line bg-white text-ink/58";
}

function getEditorLabel(column: DatabaseTableColumn) {
  const marks = [];
  if (column.primaryKey) {
    marks.push("PK");
  }
  if (!column.nullable) {
    marks.push("必填");
  }
  if (column.generated) {
    marks.push("自动生成");
  }
  return marks.length > 0 ? `${column.columnName} · ${marks.join(" / ")}` : column.columnName;
}

function isBooleanColumn(column: DatabaseTableColumn) {
  return column.dataType === "boolean" || column.columnType === "tinyint(1)";
}

function isNumericColumn(column: DatabaseTableColumn) {
  return ["tinyint", "smallint", "mediumint", "int", "integer", "bigint", "decimal", "numeric", "float", "double", "real"].includes(
    column.dataType,
  );
}

function isTemporalColumn(column: DatabaseTableColumn) {
  return ["date", "datetime", "timestamp", "time", "year"].includes(column.dataType);
}

function isLargeTextColumn(column: DatabaseTableColumn) {
  return (
    ["text", "tinytext", "mediumtext", "longtext", "json"].includes(column.dataType) ||
    (column.characterMaximumLength ?? 0) > 160
  );
}

function getTemporalInputType(column: DatabaseTableColumn) {
  if (column.dataType === "date") {
    return "date";
  }
  if (column.dataType === "time") {
    return "time";
  }
  return "datetime-local";
}

function normalizeTemporalEditorValue(column: DatabaseTableColumn, value: DatabaseCellValue) {
  if (value === null || typeof value !== "string" || !value) {
    return "";
  }

  if (column.dataType === "date") {
    return value.slice(0, 10);
  }

  if (column.dataType === "time") {
    const source = value.includes("T") ? value.split("T")[1] ?? "" : value;
    return source.slice(0, 8);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace(" ", "T").slice(0, 16);
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function setEditorValue(column: DatabaseTableColumn, value: DatabaseCellValue) {
  if (value === null) {
    editorValues[column.columnName] = "";
    editorNullState[column.columnName] = true;
    return;
  }

  editorNullState[column.columnName] = false;

  if (isBooleanColumn(column) && typeof value === "number") {
    editorValues[column.columnName] = value !== 0 ? "true" : "false";
    return;
  }

  if (isBooleanColumn(column) && typeof value === "boolean") {
    editorValues[column.columnName] = value ? "true" : "false";
    return;
  }

  if (isTemporalColumn(column)) {
    editorValues[column.columnName] = normalizeTemporalEditorValue(column, value);
    return;
  }

  if (column.dataType === "json" && typeof value !== "string") {
    editorValues[column.columnName] = JSON.stringify(value, null, 2);
    return;
  }

  editorValues[column.columnName] = String(value);
}

function resetEditorState() {
  editorMode.value = "";
  editorPrimaryKey.value = null;
  Object.keys(editorValues).forEach((key) => delete editorValues[key]);
  Object.keys(editorNullState).forEach((key) => delete editorNullState[key]);
}

function openCreateEditor() {
  if (!tableDetail.value) {
    return;
  }

  notice.value = "";
  errorMessage.value = "";
  editorMode.value = "create";
  editorPrimaryKey.value = null;
  Object.keys(editorValues).forEach((key) => delete editorValues[key]);
  Object.keys(editorNullState).forEach((key) => delete editorNullState[key]);

  tableDetail.value.columns
    .filter((column) => column.creatable)
    .forEach((column) => {
      editorNullState[column.columnName] = false;
      if (isBooleanColumn(column)) {
        editorValues[column.columnName] = "false";
        return;
      }
      if (column.enumValues.length > 0 && !column.nullable) {
        editorValues[column.columnName] = column.columnDefault ?? column.enumValues[0] ?? "";
        return;
      }
      editorValues[column.columnName] = column.columnDefault ?? "";
    });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openEditEditor(row: DatabaseTableRecord) {
  if (!tableDetail.value) {
    return;
  }

  notice.value = "";
  errorMessage.value = "";
  editorMode.value = "edit";
  editorPrimaryKey.value = row.primaryKey;
  Object.keys(editorValues).forEach((key) => delete editorValues[key]);
  Object.keys(editorNullState).forEach((key) => delete editorNullState[key]);

  tableDetail.value.columns
    .filter((column) => column.editable)
    .forEach((column) => {
      setEditorValue(column, getRowValue(row, column.columnName));
    });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function prepareEditorPayload() {
  if (!tableDetail.value) {
    return {};
  }

  const payload: Record<string, unknown> = {};

  for (const column of editorColumns.value) {
    if (editorNullState[column.columnName]) {
      payload[column.columnName] = null;
      continue;
    }

    const rawValue = editorValues[column.columnName];
    if (rawValue === undefined) {
      continue;
    }

    if (isBooleanColumn(column)) {
      payload[column.columnName] = rawValue === "true";
      continue;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      const required = !column.nullable && !column.hasDefault && editorMode.value === "create";

      if (!trimmed && editorMode.value === "create" && !required) {
        continue;
      }

      if (!trimmed && required) {
        throw new Error(`字段 ${column.columnName} 为必填项`);
      }

      payload[column.columnName] = rawValue;
      continue;
    }

    payload[column.columnName] = rawValue;
  }

  return payload;
}

async function loadOverview() {
  overview.value = await databaseAdminApi.getDatabaseOverview();
}

async function loadTables() {
  tableLoading.value = true;
  try {
    const result = await databaseAdminApi.getDatabaseTables({
      page: tablePage.value,
      pageSize: tablePageSize,
      keyword: tableFilters.keyword.trim() || undefined,
      engine: tableFilters.engine === "all" ? undefined : tableFilters.engine,
    });

    tables.value = result.items;
    tableTotal.value = result.total;
    tableTotalPages.value = result.totalPages;

    if (!result.items.length) {
      selectedTableName.value = "";
      tableDetail.value = null;
      tableRows.value = null;
      resetEditorState();
      return;
    }

    const nextTableName = result.items.some((item) => item.tableName === selectedTableName.value)
      ? selectedTableName.value
      : result.items[0].tableName;

    if (nextTableName !== selectedTableName.value || !tableDetail.value || !tableRows.value) {
      selectedTableName.value = nextTableName;
      rowPage.value = 1;
      await Promise.all([loadSelectedTableDetail(), loadSelectedTableRows()]);
    }
  } finally {
    tableLoading.value = false;
  }
}

async function loadSelectedTableDetail() {
  if (!selectedTableName.value) {
    tableDetail.value = null;
    return;
  }

  detailLoading.value = true;
  try {
    tableDetail.value = normalizeTableDetail(
      await databaseAdminApi.getDatabaseTableDetail(selectedTableName.value),
    );
  } finally {
    detailLoading.value = false;
  }
}

async function loadSelectedTableRows() {
  if (!selectedTableName.value) {
    tableRows.value = null;
    return;
  }

  rowsLoading.value = true;
  try {
    tableRows.value = normalizeTableRows(
      await databaseAdminApi.getDatabaseTableRows(selectedTableName.value, {
        page: rowPage.value,
        pageSize: rowPageSize,
        keyword: rowFilters.keyword.trim() || undefined,
      }),
    );
  } finally {
    rowsLoading.value = false;
  }
}

async function refreshSelectedTable(fullRefresh = false) {
  if (!selectedTableName.value) {
    return;
  }

  await Promise.all([
    loadSelectedTableDetail(),
    loadSelectedTableRows(),
    fullRefresh ? loadOverview() : Promise.resolve(),
    fullRefresh ? loadTables() : Promise.resolve(),
  ]);
}

async function initializeWorkbench() {
  bootLoading.value = true;
  errorMessage.value = "";
  try {
    await Promise.all([loadOverview(), loadTables()]);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "数据库工作台初始化失败");
  } finally {
    bootLoading.value = false;
  }
}

async function submitTableFilters() {
  tablePage.value = 1;
  errorMessage.value = "";
  notice.value = "";
  try {
    await loadTables();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "表列表加载失败");
  }
}

async function changeTablePage(page: number) {
  tablePage.value = page;
  errorMessage.value = "";
  notice.value = "";
  try {
    await loadTables();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "表列表加载失败");
  }
}

async function selectTable(tableName: string) {
  if (selectedTableName.value === tableName && tableDetail.value && tableRows.value) {
    return;
  }

  selectedTableName.value = tableName;
  rowPage.value = 1;
  errorMessage.value = "";
  notice.value = "";
  resetEditorState();

  try {
    await Promise.all([loadSelectedTableDetail(), loadSelectedTableRows()]);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "数据表详情加载失败");
  }
}

async function submitRowFilters() {
  rowPage.value = 1;
  errorMessage.value = "";
  notice.value = "";
  try {
    await loadSelectedTableRows();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "数据行加载失败");
  }
}

async function changeRowPage(page: number) {
  rowPage.value = page;
  errorMessage.value = "";
  notice.value = "";
  try {
    await loadSelectedTableRows();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "数据行加载失败");
  }
}

async function saveEditor() {
  if (!selectedTableName.value || !tableDetail.value) {
    return;
  }

  mutationLoading.value = true;
  errorMessage.value = "";
  notice.value = "";

  try {
    const values = prepareEditorPayload();
    if (editorMode.value === "create") {
      const result = await databaseAdminApi.createDatabaseTableRow(selectedTableName.value, {
        values,
      });
      notice.value = result.message;
    } else if (editorMode.value === "edit" && editorPrimaryKey.value) {
      const result = await databaseAdminApi.updateDatabaseTableRow(selectedTableName.value, {
        primaryKey: editorPrimaryKey.value,
        values,
      });
      notice.value = result.message;
    }

    resetEditorState();
    await refreshSelectedTable(true);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "记录保存失败");
  } finally {
    mutationLoading.value = false;
  }
}

function requestDeleteRow(row: DatabaseTableRecord) {
  confirmRequest.value = {
    title: "删除数据行",
    message: `确认删除 ${selectedTableName.value} 中的记录（${primaryKeyLabel(
      row.primaryKey,
    )}）？此操作不可撤销。`,
    confirmLabel: "确认删除",
    variant: "danger",
    action: async () => {
      if (!selectedTableName.value) {
        return;
      }

      activeRowKey.value = encodePrimaryKey(row.primaryKey);
      errorMessage.value = "";
      notice.value = "";

      try {
        const result = await databaseAdminApi.deleteDatabaseTableRow(selectedTableName.value, {
          primaryKey: row.primaryKey,
        });
        notice.value = result.message;
        if ((tableRows.value?.items.length ?? 0) === 1 && rowPage.value > 1) {
          rowPage.value -= 1;
        }
        await refreshSelectedTable(true);
      } catch (error) {
        errorMessage.value = getApiErrorMessage(error, "记录删除失败");
        throw error;
      } finally {
        activeRowKey.value = "";
      }
    },
  };
}

function closeConfirmDialog() {
  if (!confirmLoading.value) {
    confirmRequest.value = null;
  }
}

async function executeConfirmDialog() {
  if (!confirmRequest.value) {
    return;
  }

  confirmLoading.value = true;
  try {
    await confirmRequest.value.action();
    confirmRequest.value = null;
  } finally {
    confirmLoading.value = false;
  }
}

onMounted(() => {
  void initializeWorkbench();
});
</script>

<template>
  <div>
    <div
      class="overflow-hidden rounded-md border border-brand/15 bg-[radial-gradient(circle_at_top_left,_rgba(11,92,137,0.14),_transparent_42%),linear-gradient(135deg,rgba(250,248,243,0.98),rgba(244,239,229,0.92))] p-6 shadow-editorial md:p-8"
    >
      <div class="flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-3xl">
          <p class="eyebrow">Super Admin</p>
          <h1 class="mt-2 font-display text-5xl text-brand">数据库工作台</h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-ink/68">
            这里直接连接当前项目数据库，用于高权限巡检和数据修正。默认只开放行级数据管理，不开放任意 SQL 和 DDL。
          </p>
        </div>
        <button
          class="focus-ring ui-button-secondary px-4 py-2"
          :disabled="bootLoading"
          type="button"
          @click="initializeWorkbench"
        >
          {{ bootLoading ? "刷新中..." : "刷新工作台" }}
        </button>
      </div>

      <div
        class="mt-6 rounded-md border border-coral/25 bg-coral/8 px-4 py-3 text-sm leading-6 text-coral"
      >
        该页面仅限 <strong>super_admin</strong> 使用，所有新增、更新、删除操作都会直接作用于当前库。
      </div>
    </div>

    <p
      v-if="notice"
      class="mt-5 rounded-md border border-moss/25 bg-moss/10 px-4 py-3 text-sm font-medium text-moss"
    >
      {{ notice }}
    </p>
    <p
      v-if="errorMessage"
      class="mt-5 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
    >
      {{ errorMessage }}
    </p>

    <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">数据表数量</p>
        <p class="mt-3 font-display text-4xl text-brand">{{ tableStats.tableCount }}</p>
      </article>
      <article class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">估算总行数</p>
        <p class="mt-3 font-display text-4xl text-brand">{{ tableStats.estimatedRowCount }}</p>
      </article>
      <article class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">总存储体积</p>
        <p class="mt-3 font-display text-4xl text-brand">{{ formatSize(tableStats.totalSize) }}</p>
      </article>
      <article class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">TypeORM 实体</p>
        <p class="mt-3 font-display text-4xl text-brand">{{ tableStats.entityCount }}</p>
      </article>
    </div>

    <div class="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="ui-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="eyebrow">Navigator</p>
            <h2 class="mt-2 font-display text-3xl text-brand">数据表列表</h2>
          </div>
          <span class="rounded-full border border-line px-3 py-1 text-xs text-ink/55">
            {{ tableTotal }} 张表
          </span>
        </div>

        <form class="mt-5 grid gap-3" @submit.prevent="submitTableFilters">
          <input
            v-model="tableFilters.keyword"
            class="focus-ring rounded-md border border-line bg-white px-3 py-2"
            placeholder="搜索表名"
            type="search"
          />
          <select
            v-model="tableFilters.engine"
            class="focus-ring rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="all">全部引擎</option>
            <option v-for="engine in engineOptions" :key="engine" :value="engine">
              {{ engine }}
            </option>
          </select>
          <button class="focus-ring ui-button-primary px-4 py-2" :disabled="tableLoading" type="submit">
            {{ tableLoading ? "筛选中..." : "筛选数据表" }}
          </button>
        </form>

        <div class="mt-5 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <button
            v-for="table in tables"
            :key="table.tableName"
            class="focus-ring w-full rounded-md border px-4 py-4 text-left transition"
            :class="
              table.tableName === selectedTableName
                ? 'border-brand bg-brand/6 shadow-insetline'
                : 'border-line bg-white hover:border-brand/40 hover:bg-brand/3'
            "
            type="button"
            @click="selectTable(table.tableName)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate font-semibold text-brand">{{ table.tableName }}</h3>
                <p class="mt-1 text-xs text-ink/52">
                  {{ table.engine || "未知引擎" }} · {{ table.estimatedRowCount }} 行
                </p>
              </div>
              <span
                v-if="table.managedByTypeOrm"
                class="rounded-full border border-moss/20 bg-moss/10 px-2 py-1 text-[11px] text-moss"
              >
                {{ table.entityName || "TypeORM" }}
              </span>
            </div>
            <p v-if="table.tableComment" class="mt-3 line-clamp-2 text-xs leading-5 text-ink/56">
              {{ table.tableComment }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-ink/50">
              <span class="rounded-full border border-line px-2 py-1">
                数据 {{ formatSize(table.dataSize) }}
              </span>
              <span class="rounded-full border border-line px-2 py-1">
                索引 {{ formatSize(table.indexSize) }}
              </span>
            </div>
          </button>
        </div>

        <Pagination
          class="mt-5"
          :current-page="tablePage"
          :disabled="tableLoading"
          :show-page-numbers="true"
          :total="tableTotal"
          :total-pages="tableTotalPages"
          summary="数据表分页"
          @change="changeTablePage"
        />
      </aside>

      <section class="min-w-0">
        <EmptyState
          v-if="!selectedTableName && !bootLoading"
          eyebrow="Database"
          title="暂无可用数据表"
          description="请调整左侧筛选条件，或确认当前数据库已完成初始化。"
        />

        <template v-else>
          <section class="ui-surface overflow-hidden p-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="eyebrow">Workbench</p>
                <h2 class="mt-2 break-all font-display text-4xl text-brand">
                  {{ selectedTableName }}
                </h2>
                <p class="mt-3 max-w-3xl text-sm leading-7 text-ink/62">
                  {{ selectedTable?.tableComment || "当前表暂无备注，以下展示结构信息与可操作数据。" }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full border border-line px-3 py-2 text-xs text-ink/55">
                  {{ selectedTable?.engine || "UNKNOWN" }}
                </span>
                <span
                  class="rounded-full border px-3 py-2 text-xs"
                  :class="
                    selectedTable?.managedByTypeOrm
                      ? 'border-moss/20 bg-moss/10 text-moss'
                      : 'border-line text-ink/55'
                  "
                >
                  {{
                    selectedTable?.managedByTypeOrm
                      ? `TypeORM · ${selectedTable?.entityName || "Entity"}`
                      : "Manual Table"
                  }}
                </span>
                <button
                  class="focus-ring ui-button-secondary px-4 py-2"
                  :disabled="detailLoading || rowsLoading"
                  type="button"
                  @click="refreshSelectedTable(true)"
                >
                  刷新当前表
                </button>
                <button
                  v-if="tableDetail?.canCreateRows"
                  class="focus-ring ui-button-primary px-4 py-2"
                  :disabled="mutationLoading"
                  type="button"
                  @click="openCreateEditor"
                >
                  新增记录
                </button>
              </div>
            </div>

            <div class="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-md border border-line bg-paper p-4">
                <p class="text-xs uppercase tracking-[0.24em] text-ink/42">Rows</p>
                <p class="mt-2 font-display text-3xl text-brand">
                  {{ selectedTable?.estimatedRowCount ?? 0 }}
                </p>
              </div>
              <div class="rounded-md border border-line bg-paper p-4">
                <p class="text-xs uppercase tracking-[0.24em] text-ink/42">Storage</p>
                <p class="mt-2 font-display text-3xl text-brand">
                  {{ formatSize(selectedTable?.totalSize ?? 0) }}
                </p>
              </div>
              <div class="rounded-md border border-line bg-paper p-4">
                <p class="text-xs uppercase tracking-[0.24em] text-ink/42">Primary Key</p>
                <p class="mt-2 text-sm font-semibold text-brand">
                  {{ joinTextList(tableDetail?.primaryKeyColumns, "无主键") }}
                </p>
              </div>
              <div class="rounded-md border border-line bg-paper p-4">
                <p class="text-xs uppercase tracking-[0.24em] text-ink/42">Updated</p>
                <p class="mt-2 text-sm font-semibold text-brand">
                  {{ formatDate(selectedTable?.updateTime) }}
                </p>
              </div>
            </div>
          </section>

          <section
            v-if="editorMode"
            class="ui-surface mt-6 border-brand/15 bg-[linear-gradient(135deg,rgba(11,92,137,0.06),rgba(255,255,255,1))] p-6"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="eyebrow">Mutation</p>
                <h3 class="mt-2 font-display text-3xl text-brand">
                  {{ editorMode === "create" ? "新增数据行" : "编辑数据行" }}
                </h3>
                <p class="mt-3 text-sm leading-7 text-ink/62">
                  {{
                    editorMode === "create"
                      ? "只会提交你填写的字段；空值字段会按默认值或数据库约束处理。"
                      : `正在编辑主键为 ${editorPrimaryKey ? primaryKeyLabel(editorPrimaryKey) : "-"} 的记录。`
                  }}
                </p>
              </div>
              <button class="focus-ring ui-button-secondary px-4 py-2" type="button" @click="resetEditorState">
                关闭编辑器
              </button>
            </div>

            <form class="mt-6 grid gap-5 md:grid-cols-2" @submit.prevent="saveEditor">
              <label
                v-for="column in editorColumns"
                :key="`${editorMode}-${column.columnName}`"
                class="grid gap-2"
              >
                <span class="text-sm font-semibold text-ink/62">{{ getEditorLabel(column) }}</span>

                <select
                  v-if="column.enumValues.length > 0"
                  v-model="editorValues[column.columnName]"
                  class="focus-ring rounded-md border border-line bg-white px-3 py-3"
                  :disabled="editorNullState[column.columnName]"
                >
                  <option v-if="column.nullable" value="">请选择</option>
                  <option v-for="option in column.enumValues" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>

                <select
                  v-else-if="isBooleanColumn(column)"
                  v-model="editorValues[column.columnName]"
                  class="focus-ring rounded-md border border-line bg-white px-3 py-3"
                  :disabled="editorNullState[column.columnName]"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>

                <textarea
                  v-else-if="isLargeTextColumn(column)"
                  v-model="editorValues[column.columnName]"
                  class="focus-ring min-h-28 rounded-md border border-line bg-white px-3 py-3 font-mono text-sm"
                  :disabled="editorNullState[column.columnName]"
                  :placeholder="column.columnType"
                ></textarea>

                <input
                  v-else
                  v-model="editorValues[column.columnName]"
                  class="focus-ring rounded-md border border-line bg-white px-3 py-3"
                  :disabled="editorNullState[column.columnName]"
                  :placeholder="column.columnType"
                  :type="
                    isTemporalColumn(column)
                      ? getTemporalInputType(column)
                      : isNumericColumn(column)
                        ? 'number'
                        : 'text'
                  "
                />

                <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-ink/50">
                  <span>
                    {{ column.columnType }}
                    <template v-if="column.columnComment"> · {{ column.columnComment }}</template>
                  </span>
                  <label
                    v-if="column.nullable"
                    class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1"
                  >
                    <input v-model="editorNullState[column.columnName]" class="accent-brand" type="checkbox" />
                    设为 NULL
                  </label>
                </div>
              </label>

              <div class="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  class="focus-ring ui-button-primary px-5 py-3"
                  :disabled="mutationLoading"
                  type="submit"
                >
                  {{ mutationLoading ? "提交中..." : editorMode === "create" ? "保存新记录" : "保存修改" }}
                </button>
                <button
                  class="focus-ring ui-button-secondary px-5 py-3"
                  :disabled="mutationLoading"
                  type="button"
                  @click="resetEditorState"
                >
                  取消
                </button>
              </div>
            </form>
          </section>

          <section class="ui-surface mt-6 p-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="eyebrow">Rows</p>
                <h3 class="mt-2 font-display text-3xl text-brand">表数据</h3>
                <p class="mt-3 text-sm leading-7 text-ink/62">
                  这里展示当前表的分页数据。编辑和删除依赖主键定位；没有主键的表仅提供浏览。
                </p>
              </div>
              <form class="flex flex-wrap gap-3" @submit.prevent="submitRowFilters">
                <input
                  v-model="rowFilters.keyword"
                  class="focus-ring min-w-[240px] rounded-md border border-line bg-white px-3 py-2"
                  placeholder="搜索可检索字段"
                  type="search"
                />
                <button class="focus-ring ui-button-secondary px-4 py-2" :disabled="rowsLoading" type="submit">
                  {{ rowsLoading ? "检索中..." : "筛选数据" }}
                </button>
              </form>
            </div>

            <div class="mt-5 overflow-x-auto rounded-md border border-line">
              <table class="min-w-full border-collapse text-left text-sm">
                <thead class="bg-brand/5 text-ink/62">
                  <tr>
                    <th class="px-4 py-3 font-semibold">操作</th>
                    <th
                      v-for="column in tableDetail?.columns || []"
                      :key="`head-${column.columnName}`"
                      class="px-4 py-3 font-semibold"
                    >
                      <div class="flex items-center gap-2 whitespace-nowrap">
                        <span>{{ column.columnName }}</span>
                        <span
                          class="rounded-full border px-2 py-0.5 text-[10px]"
                          :class="getColumnBadgeClass(column)"
                        >
                          {{ column.primaryKey ? "PK" : column.dataType }}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody v-if="tableRows?.items.length" class="bg-white">
                  <tr
                    v-for="row in tableRows.items"
                    :key="encodePrimaryKey(row.primaryKey)"
                    class="border-t border-line align-top"
                  >
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap gap-2 whitespace-nowrap">
                        <button
                          class="focus-ring rounded-md border border-line px-3 py-1.5 text-xs hover:border-brand hover:text-brand disabled:opacity-50"
                          :disabled="!tableDetail?.canUpdateRows || mutationLoading"
                          type="button"
                          @click="openEditEditor(row)"
                        >
                          编辑
                        </button>
                        <button
                          class="focus-ring rounded-md border border-line px-3 py-1.5 text-xs hover:border-coral hover:text-coral disabled:opacity-50"
                          :disabled="
                            !tableDetail?.canDeleteRows ||
                            mutationLoading ||
                            activeRowKey === encodePrimaryKey(row.primaryKey)
                          "
                          type="button"
                          @click="requestDeleteRow(row)"
                        >
                          {{
                            activeRowKey === encodePrimaryKey(row.primaryKey)
                              ? "删除中..."
                              : "删除"
                          }}
                        </button>
                      </div>
                    </td>
                    <td
                      v-for="column in tableDetail?.columns || []"
                      :key="`${encodePrimaryKey(row.primaryKey)}-${column.columnName}`"
                      class="max-w-[260px] px-4 py-3"
                    >
                      <pre
                        class="whitespace-pre-wrap break-all font-mono text-xs leading-6 text-ink/68"
                        :title="formatCellValue(getRowValue(row, column.columnName))"
                      >{{ formatCellPreview(getRowValue(row, column.columnName)) }}</pre>
                    </td>
                  </tr>
                </tbody>
              </table>

              <EmptyState
                v-if="!tableRows?.items.length && !rowsLoading"
                compact
                title="当前筛选下没有数据"
                description="可以调整关键字、切换数据表，或者直接新增一条记录。"
              />
            </div>

            <Pagination
              v-if="tableRows"
              class="mt-5"
              :current-page="rowPage"
              :disabled="rowsLoading"
              :show-page-numbers="true"
              :total="tableRows.total"
              :total-pages="tableRows.totalPages"
              summary="数据行分页"
              @change="changeRowPage"
            />
          </section>

          <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <section class="ui-surface p-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="eyebrow">Schema</p>
                  <h3 class="mt-2 font-display text-3xl text-brand">字段设计</h3>
                </div>
                <div class="flex flex-wrap gap-2 text-xs text-ink/50">
                  <span class="rounded-full border border-line px-3 py-1">
                    {{ tableDetail?.columnCount || 0 }} 个字段
                  </span>
                  <span class="rounded-full border border-line px-3 py-1">
                    {{ tableDetail?.indexCount || 0 }} 个索引
                  </span>
                  <span class="rounded-full border border-line px-3 py-1">
                    {{ tableDetail?.foreignKeyCount || 0 }} 个外键
                  </span>
                </div>
              </div>

              <div class="mt-5 overflow-x-auto rounded-md border border-line">
                <table class="min-w-full text-left text-sm">
                  <thead class="bg-brand/5 text-ink/62">
                    <tr>
                      <th class="px-4 py-3 font-semibold">字段</th>
                      <th class="px-4 py-3 font-semibold">类型</th>
                      <th class="px-4 py-3 font-semibold">能力</th>
                      <th class="px-4 py-3 font-semibold">默认值 / 备注</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white">
                    <tr
                      v-for="column in tableDetail?.columns || []"
                      :key="`schema-${column.columnName}`"
                      class="border-t border-line align-top"
                    >
                      <td class="px-4 py-3">
                        <p class="font-semibold text-brand">{{ column.columnName }}</p>
                        <p class="mt-1 text-xs text-ink/50">#{{ column.ordinalPosition }}</p>
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-ink/68">
                        {{ column.columnType }}
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex flex-wrap gap-2 text-[11px]">
                          <span
                            class="rounded-full border px-2 py-1"
                            :class="column.primaryKey ? 'border-brand/20 bg-brand/10 text-brand' : 'border-line text-ink/55'"
                          >
                            {{ column.primaryKey ? "主键" : "普通字段" }}
                          </span>
                          <span
                            class="rounded-full border px-2 py-1"
                            :class="column.nullable ? 'border-line text-ink/55' : 'border-coral/20 bg-coral/10 text-coral'"
                          >
                            {{ column.nullable ? "可空" : "非空" }}
                          </span>
                          <span
                            v-if="column.indexed"
                            class="rounded-full border border-moss/20 bg-moss/10 px-2 py-1 text-moss"
                          >
                            已索引
                          </span>
                          <span
                            v-if="column.generated"
                            class="rounded-full border border-cobalt/20 bg-cobalt/10 px-2 py-1 text-cobalt"
                          >
                            自动生成
                          </span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-xs leading-6 text-ink/58">
                        <p>{{ column.columnDefault ?? "无默认值" }}</p>
                        <p v-if="column.columnComment" class="mt-1">{{ column.columnComment }}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="grid gap-6">
              <article class="ui-surface p-6">
                <p class="eyebrow">Indexes</p>
                <h3 class="mt-2 font-display text-3xl text-brand">索引</h3>
                <div class="mt-5 grid gap-3">
                  <article
                    v-for="index in tableDetail?.indexes || []"
                    :key="index.indexName"
                    class="rounded-md border border-line bg-paper p-4"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <h4 class="font-semibold text-brand">{{ index.indexName }}</h4>
                      <span class="rounded-full border border-line px-2 py-1 text-[11px] text-ink/55">
                        {{ index.primary ? "PRIMARY" : index.unique ? "UNIQUE" : index.indexType }}
                      </span>
                    </div>
                    <p class="mt-2 text-xs leading-6 text-ink/56">
                      {{ formatIndexColumns(index) }}
                    </p>
                  </article>
                  <EmptyState
                    v-if="!tableDetail?.indexes.length"
                    compact
                    title="暂无索引信息"
                    description="当前表没有额外索引，或数据库尚未返回索引元数据。"
                  />
                </div>
              </article>

              <article class="ui-surface p-6">
                <p class="eyebrow">Foreign Keys</p>
                <h3 class="mt-2 font-display text-3xl text-brand">外键关系</h3>
                <div class="mt-5 grid gap-3">
                  <article
                    v-for="foreignKey in tableDetail?.foreignKeys || []"
                    :key="foreignKey.constraintName"
                    class="rounded-md border border-line bg-paper p-4"
                  >
                    <h4 class="font-semibold text-brand">{{ foreignKey.constraintName }}</h4>
                    <p class="mt-2 text-xs leading-6 text-ink/58">
                      {{ formatForeignKeyReference(foreignKey) }}
                    </p>
                    <p class="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink/42">
                      UPDATE {{ foreignKey.updateRule || "NO ACTION" }} · DELETE
                      {{ foreignKey.deleteRule || "NO ACTION" }}
                    </p>
                  </article>
                  <EmptyState
                    v-if="!tableDetail?.foreignKeys.length"
                    compact
                    title="暂无外键关系"
                    description="当前表没有显式外键，或元数据未返回引用关系。"
                  />
                </div>
              </article>
            </section>
          </div>
        </template>
      </section>
    </div>
  </div>

  <ConfirmDialog
    :open="Boolean(confirmRequest)"
    :title="confirmRequest?.title || ''"
    :message="confirmRequest?.message || ''"
    :confirm-label="confirmRequest?.confirmLabel || '确认'"
    :loading="confirmLoading"
    :variant="confirmRequest?.variant || 'primary'"
    @cancel="closeConfirmDialog"
    @confirm="executeConfirmDialog"
  />
</template>
