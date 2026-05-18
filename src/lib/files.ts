import type { AttachmentRecord } from "./api";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export function downloadAttachment(attachment: AttachmentRecord) {
  const byteCharacters = atob(attachment.fileData);
  const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: attachment.mimeType || "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
