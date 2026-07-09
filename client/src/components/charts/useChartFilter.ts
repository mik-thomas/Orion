import { useCallback, useEffect, useRef, useState } from "react";

/** Toggle visibility of chart series/categories via legend clicks. Resets when keys change. */
export function useChartFilter(keys: string[]) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());
  const keysSignature = keys.join("\0");
  const prevKeysRef = useRef(keysSignature);

  useEffect(() => {
    if (prevKeysRef.current !== keysSignature) {
      prevKeysRef.current = keysSignature;
      setHiddenKeys(new Set());
    }
  }, [keysSignature]);

  const toggle = useCallback(
    (key: string) => {
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          return next;
        }

        const wouldHide = new Set(next);
        wouldHide.add(key);
        const visibleCount = keys.filter((k) => !wouldHide.has(k)).length;
        if (visibleCount === 0) {
          return new Set();
        }

        next.add(key);
        return next;
      });
    },
    [keys]
  );

  const showAll = useCallback(() => setHiddenKeys(new Set()), []);

  const isVisible = useCallback((key: string) => !hiddenKeys.has(key), [hiddenKeys]);

  const isFiltered = hiddenKeys.size > 0;

  return { toggle, showAll, isVisible, isFiltered, hiddenKeys };
}
