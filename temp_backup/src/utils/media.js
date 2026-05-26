import { useState, useEffect } from "react";
import { MEDIA_DB_NAME, MEDIA_STORE_NAME, MEDIA_REF_PREFIX, MEDIA_FIELD_NAMES } from '../config.js';

export function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(MEDIA_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putMediaRecord(record) {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE_NAME, "readwrite");
    transaction.objectStore(MEDIA_STORE_NAME).put(record);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function getMediaRecord(id) {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE_NAME, "readonly");
    const request = transaction.objectStore(MEDIA_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveMediaFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const id = crypto.randomUUID();
  await putMediaRecord({ id, dataUrl, name: file.name, type: file.type });
  return `${MEDIA_REF_PREFIX}${id}`;
}

export async function saveDataUrlMedia(dataUrl) {
  const id = crypto.randomUUID();
  await putMediaRecord({ id, dataUrl, name: "imported-media", type: getDataUrlMimeType(dataUrl) });
  return `${MEDIA_REF_PREFIX}${id}`;
}

export function getDataUrlMimeType(dataUrl) {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/);
  return match?.[1] || "";
}

export function isIndexedDbMediaRef(value) {
  return typeof value === "string" && value.startsWith(MEDIA_REF_PREFIX);
}

export function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

export async function inlineGameMediaRefs(gameState) {
  const draft = structuredClone(gameState);
  await updateGameMediaRefs(draft, async (value) => {
    if (!isIndexedDbMediaRef(value)) {
      return value;
    }

    const record = await getMediaRecord(value.slice(MEDIA_REF_PREFIX.length));
    return record?.dataUrl || value;
  });
  return draft;
}

export async function storeInlineGameMediaRefs(gameState) {
  const draft = structuredClone(gameState);
  await updateGameMediaRefs(draft, async (value) => (isDataUrl(value) ? saveDataUrlMedia(value) : value));
  return draft;
}

export async function updateGameMediaRefs(gameState, resolveMediaRef) {
  if (!gameState || typeof gameState !== "object") {
    return;
  }

  const categoryQuestions = Array.isArray(gameState.categories)
    ? gameState.categories.flatMap((category) => (Array.isArray(category?.questions) ? category.questions : []))
    : [];
  const finalQuestions = Array.isArray(gameState.finalRound?.questions) ? gameState.finalRound.questions : [];

  await Promise.all(
    [...categoryQuestions, ...finalQuestions].flatMap((question) =>
      MEDIA_FIELD_NAMES.map(async (fieldName) => {
        if (!question || typeof question[fieldName] !== "string") {
          return;
        }
        question[fieldName] = await resolveMediaRef(question[fieldName]);
      }),
    ),
  );
}

export function useMediaUrl(value) {
  const [mediaUrl, setMediaUrl] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function resolveMediaUrl() {
      if (!value) {
        setMediaUrl("");
        return;
      }
      if (!isIndexedDbMediaRef(value)) {
        setMediaUrl(value);
        return;
      }

      try {
        const record = await getMediaRecord(value.slice(MEDIA_REF_PREFIX.length));
        if (isMounted) {
          setMediaUrl(record?.dataUrl || "");
        }
      } catch (error) {
        console.error("Could not load media", error);
        if (isMounted) {
          setMediaUrl("");
        }
      }
    }

    resolveMediaUrl();
    return () => {
      isMounted = false;
    };
  }, [value]);

  return mediaUrl;
}
