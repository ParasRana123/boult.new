import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

let webcontainerPromise: Promise<WebContainer> | null = null;

export function getWebContainer(): Promise<WebContainer> {
  if (!webcontainerPromise) {
    webcontainerPromise = WebContainer.boot().catch((err) => {
      // If already booted, resolve cleanly or reset promise
      if (err?.message?.includes("already booted") || err?.message?.includes("single instance")) {
        console.warn("WebContainer is already running a singleton instance.");
      }
      throw err;
    });
  }
  return webcontainerPromise;
}

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | undefined>();

  useEffect(() => {
    let isMounted = true;

    getWebContainer()
      .then((instance) => {
        if (isMounted) {
          setWebcontainer(instance);
        }
      })
      .catch((err) => {
        console.error("WebContainer boot error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return webcontainer;
}