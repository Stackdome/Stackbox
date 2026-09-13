import * as React from "react";

export const SHELL_EXPANDED_QUERY = "(min-width: 1280px)";

export function useShellOpen(initialOpen?: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpen] = React.useState(() => initialOpen ?? window.matchMedia(SHELL_EXPANDED_QUERY).matches);

  React.useEffect(() => {
    const media = window.matchMedia(SHELL_EXPANDED_QUERY);
    const onChange = (event: MediaQueryListEvent) => setOpen(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return [open, setOpen];
}
