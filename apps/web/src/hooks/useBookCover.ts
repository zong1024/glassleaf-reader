import { useEffect, useState } from "react";

import { absoluteAssetUrl } from "../lib/api";
import { useSession } from "../lib/session";
import type { Book } from "../lib/types";

function isDirectAsset(url: string) {
  return (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

export function useBookCover(book: Book) {
  const { token } = useSession();
  const [cover, setCover] = useState<string | undefined>(() =>
    book.coverUrl ? absoluteAssetUrl(book.coverUrl) : undefined,
  );

  useEffect(() => {
    const assetUrl = book.coverUrl ? absoluteAssetUrl(book.coverUrl) : undefined;
    if (!assetUrl) {
      setCover(undefined);
      return;
    }

    if (isDirectAsset(assetUrl) || token.startsWith("local:")) {
      setCover(assetUrl);
      return;
    }

    let active = true;
    let objectUrl = "";

    fetch(assetUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Cover request failed");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setCover(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setCover(undefined);
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [book.coverUrl, token]);

  return cover;
}
