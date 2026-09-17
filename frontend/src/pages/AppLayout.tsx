import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Alert } from "@heroui/react";
import { telegram } from "../features/telegram/telegram";
import { useAuth } from "../features/auth/useAuth";

export function AppLayout() { const location = useLocation(); const navigate = useNavigate(); const auth = useAuth(); useEffect(() => { const goBack = () => navigate(-1); if (location.pathname === "/") telegram.backButton.hide(); else { telegram.backButton.show(); telegram.backButton.on(goBack); } return () => telegram.backButton.off(goBack); }, [location.pathname, navigate]); return <main className="app-shell mx-auto flex max-w-md flex-col gap-4"><Outlet />{auth.isError ? <Alert className="border border-[var(--danger)]">Авторизация Telegram не удалась. Для локальной разработки включите DEV_AUTH=true на backend.</Alert> : null}</main>; }
