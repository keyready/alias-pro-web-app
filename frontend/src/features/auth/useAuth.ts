import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../../shared/api/client";
import { telegram } from "../telegram/telegram";

export function useAuth() {
  const mutation = useMutation({ mutationFn: () => api.auth(telegram.initData()) });
  const { mutate } = mutation;
  useEffect(() => { if (!localStorage.getItem("alias-token")) mutate(); }, [mutate]);
  return mutation;
}
