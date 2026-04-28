import { Fragment, useMemo } from "react"

type MonoFont = {
  family: string
}

export const MONO_NERD_FONTS = [
  { family: "JetBrains Mono Nerd Font" },
  { family: "Fira Code Nerd Font" },
  { family: "Cascadia Code Nerd Font" },
  { family: "Hack Nerd Font" },
  { family: "Source Code Pro Nerd Font" },
  { family: "Inconsolata Nerd Font" },
  { family: "Roboto Mono Nerd Font" },
  { family: "Ubuntu Mono Nerd Font" },
  { family: "Intel One Mono Nerd Font" },
  { family: "Meslo LGS Nerd Font" },
  { family: "Iosevka Nerd Font" },
  { family: "GeistMono Nerd Font" },
] satisfies MonoFont[]

export function Font() {
  const monoNerdCss = useMemo(
    () =>
      MONO_NERD_FONTS.map(
        (font) => `
@font-face {
  font-family: "${font.family}";
  src: local("${font.family}");
  font-display: swap;
  font-style: normal;
  font-weight: 400;
}
@font-face {
  font-family: "${font.family}";
  src: local("${font.family} Bold");
  font-display: swap;
  font-style: normal;
  font-weight: 700;
}`,
      ).join(""),
    [],
  )

  return (
    <Fragment>
      <style>{`
@font-face {
  font-family: "Inter";
  src: local("Inter");
  font-display: swap;
  font-style: normal;
  font-weight: 100 900;
}
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 100%;
  ascent-override: 97%;
  descent-override: 25%;
  line-gap-override: 1%;
}
@font-face {
  font-family: "IBM Plex Mono";
  src: local("IBM Plex Mono");
  font-display: swap;
  font-style: normal;
  font-weight: 400;
}
@font-face {
  font-family: "IBM Plex Mono";
  src: local("IBM Plex Mono Medium");
  font-display: swap;
  font-style: normal;
  font-weight: 500;
}
@font-face {
  font-family: "IBM Plex Mono";
  src: local("IBM Plex Mono Bold");
  font-display: swap;
  font-style: normal;
  font-weight: 700;
}
@font-face {
  font-family: "IBM Plex Mono Fallback";
  src: local("Courier New");
  size-adjust: 100%;
  ascent-override: 97%;
  descent-override: 25%;
  line-gap-override: 1%;
}
${monoNerdCss}
      `}</style>
    </Fragment>
  )
}
