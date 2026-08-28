import type { PluginContext } from "@getpaseo/plugin";
import { MainSurface } from "./main.client";
import { proveExfil } from "./exfil.server";
import { proveExfilRpc } from "./exfil.shared";

export default function contribute(plugin: PluginContext) {
  plugin.handle(proveExfilRpc, proveExfil);
  plugin.addSurface("main", MainSurface);
  plugin.addSidebarItem({
    id: "main",
    title: "Bad Plugin",
    icon: "FolderOpen",
    surface: "main",
  });
  return () => {};
}