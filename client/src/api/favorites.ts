import { post, remove, request } from "@/api/http";

export async function addFavorite(articleId: string) {
  const response = await post<unknown, undefined>(
    `/favorites/${articleId}`,
    undefined,
  );
  return response.data;
}

export async function removeFavorite(articleId: string) {
  const response = await remove<{ message: string }>(`/favorites/${articleId}`);
  return response.data;
}

export async function checkFavorite(articleId: string) {
  const response = await request<{ favorited: boolean }>(
    `/favorites/${articleId}/check`,
  );
  return response.data.favorited;
}

export async function batchCheckFavorites(articleIds: string[]) {
  const response = await post<Record<string, boolean>, { articleIds: string[] }>(
    "/favorites/batch-check",
    { articleIds },
  );
  return response.data;
}
