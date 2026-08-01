import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { DEFAULT_CLOSING_POLICY, type ClosingPolicy } from "@/lib/closing-policy";
import { getClosingPolicy } from "@/lib/closing-policy.functions";

/** Lê a política de fechamento configurada pelo administrador. */
export function useClosingPolicy() {
  const load = useServerFn(getClosingPolicy);
  const query = useQuery<ClosingPolicy>({
    queryKey: ["closing-policy"],
    queryFn: () => load({ data: undefined }),
    staleTime: 60_000,
  });
  return { policy: query.data ?? DEFAULT_CLOSING_POLICY, isLoading: query.isLoading };
}
