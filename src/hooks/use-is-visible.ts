"use client";

import { useLayoutEffect, useState } from "react";

/**
 * True while the route that renders this component is on screen.
 *
 * With `cacheComponents`, Next.js does not unmount a page when you navigate away: it
 * hides it with React <Activity>. Hiding runs effect cleanups, and react-leaflet's
 * cleanup destroys the Leaflet map (`map.remove()`) while the component keeps a
 * reference to it. Coming back then crashes ("reading 'appendChild'").
 *
 * Rendering the map only while this is true makes React unmount it on hide and mount
 * a fresh one on show. The cleanup sets it to false when the page is hidden; the
 * effect sets it back to true when the page is visible again.
 */
export function useIsVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    // Intended: one extra render each time the page is shown, to mount the map.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    return () => setVisible(false);
  }, []);

  return visible;
}
