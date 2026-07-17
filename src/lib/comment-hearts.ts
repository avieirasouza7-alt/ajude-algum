import { supabase } from "@/integrations/supabase/client";

export type CommentHeartStats = {
  count: number;
  likedByMe: boolean;
};

export async function fetchCommentHeartStats(
  commentIds: string[],
  viewerId?: string | null,
): Promise<Map<string, CommentHeartStats>> {
  const stats = new Map<string, CommentHeartStats>();
  const unique = [...new Set(commentIds.filter(Boolean))];
  for (const id of unique) stats.set(id, { count: 0, likedByMe: false });
  if (unique.length === 0) return stats;

  const { data, error } = await supabase
    .from("comment_hearts")
    .select("comment_id, user_id")
    .in("comment_id", unique);

  if (error) {
    console.warn("[comment-hearts]", error.message);
    return stats;
  }

  for (const row of data ?? []) {
    const current = stats.get(row.comment_id) ?? { count: 0, likedByMe: false };
    current.count += 1;
    if (viewerId && row.user_id === viewerId) current.likedByMe = true;
    stats.set(row.comment_id, current);
  }

  return stats;
}

export async function toggleCommentHeart(commentId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("comment_hearts")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("comment_hearts").insert({
    comment_id: commentId,
    user_id: userId,
  });
  if (error) throw error;
  return true;
}
