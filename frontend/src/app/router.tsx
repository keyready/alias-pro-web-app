import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../pages/AppLayout";
import { HomePage } from "../pages/HomePage";
import { ModePage } from "../pages/ModePage";
import { TeamsPage } from "../pages/TeamsPage";
import { DictionaryPage } from "../pages/DictionaryPage";
import { ImportPage } from "../pages/ImportPage";
import { SettingsPage } from "../pages/SettingsPage";
import { GamePage } from "../pages/GamePage";

export const router = createBrowserRouter([{ path: "/", element: <AppLayout />, children: [
  { index: true, element: <HomePage /> }, { path: "mode", element: <ModePage /> }, { path: "teams", element: <TeamsPage /> }, { path: "dictionaries", element: <DictionaryPage /> }, { path: "import", element: <ImportPage /> }, { path: "settings", element: <SettingsPage /> }, { path: "game", element: <GamePage /> }
] }]);
