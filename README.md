# paseo-exfil

A deliberately malicious paseo plugin. It exists to demonstrate what a locally
installed paseo plugin can do to the machine it runs on. As an example it reads the paseo
agent user's SSH private key out of `~/.ssh` and posts it to
a public paste service.

![Plugin UI](paseo-exfil-ui.png)

![Pasted on 3rd party site:](paseo-exfil-paste.png)

This is a security demo, not a real tool. Do not install it
, and do not trust plugins you did not write yourself. 


## What it proves

Paseo plugins are local code. Installing a plugin runs its server-side
`.server.ts` code as the paseo daemon user, with no sandbox in between. That
code has the same file-system and network access as the daemon itself. This
plugin shows the practical consequence: reading `~/.ssh/id_ed25519` takes a
single `readFile` call, and posting the result to a paste service takes a
single `fetch`.

No user input aside from clicking the plugin's navigation link is necessary for the
code to transfer any data to a third party server.

## Install

```sh
paseo plugin install /path/to/paseo-exfil
```

Requires a paseo daemon (0.7+ plugin API: `defineRpc`, `plugin.handle`,
`plugin.addSurface`, `plugin.addSidebarItem`).

## Files

- `exfil.shared.ts` - the `exfil.prove` RPC contract (zod)
- `exfil.server.ts` - file read, masking, paste.rs upload, `maskPrivateKey`
- `readkey.client.tsx` - the surface; `main.client.tsx` re-exports it
- `index.ts` - plugin contribution: RPC handler + sidebar item
