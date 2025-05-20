import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

let instance: WebContainer | null = null;

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);

  useEffect(() => {
    if (!instance) {
      WebContainer.boot().then(wc => {
        instance = wc;
        setWebcontainer(wc);
      }).catch(err => {
        console.error("Failed to boot WebContainer:", err);
        // Avoid retrying if it's a known irrecoverable error
        instance = null;
      });
    } else {
      setWebcontainer(instance);
    }
  }, []);

  return webcontainer;
}