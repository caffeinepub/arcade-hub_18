import { useActor } from "@/hooks/useActor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LeaderboardEntry {
  player: string;
  score: bigint;
}

export function useGetLeaderboard(gameId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", gameId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard(gameId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      player,
      score,
    }: {
      gameId: string;
      player: string;
      score: number;
    }) => {
      if (!actor) throw new Error("No actor");
      await actor.submitScore(gameId, player, BigInt(score));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["leaderboard", variables.gameId],
      });
    },
  });
}
