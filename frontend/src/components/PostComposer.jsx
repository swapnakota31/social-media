import { useEffect, useMemo, useRef, useState } from "react";
import { uploadPostMedia } from "../services/socialApi";

const filterPresets = {
  none: "none",
  grayscale: "grayscale(1)",
  warm: "contrast(1.05) saturate(1.2) sepia(0.12)",
  cool: "contrast(1.05) saturate(1.1) hue-rotate(12deg)",
};

const makeId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const renderEditedFile = (draft) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const rotation = ((draft.rotation % 360) + 360) % 360;
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const sourceWidth = image.width * scale;
    const sourceHeight = image.height * scale;
    const rotated = rotation === 90 || rotation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = rotated ? sourceHeight : sourceWidth;
    canvas.height = rotated ? sourceWidth : sourceHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Canvas context unavailable"));
      return;
    }

    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.filter = filterPresets[draft.filter] || "none";
    context.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
    context.restore();

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Image processing failed"));
        return;
      }

      resolve(new File([blob], draft.file.name, { type: draft.file.type || "image/jpeg" }));
    }, draft.file.type || "image/jpeg", 0.92);
  };

  image.onerror = () => reject(new Error("Unable to load image"));
  image.src = draft.previewUrl;
});

function PostComposer({ onCreatePost, busy }) {
  const [content, setContent] = useState("");
  const [drafts, setDrafts] = useState([]);
  const draftsRef = useRef([]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => () => {
    draftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
  }, []);

  const attachmentsLabel = useMemo(() => {
    if (drafts.length === 0) {
      return "Attach photos";
    }

    return `${drafts.length} media item${drafts.length > 1 ? "s" : ""} selected`;
  }, [drafts.length]);

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    const nextDrafts = files.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
      filter: "none",
    }));

    setDrafts((current) => [...current, ...nextDrafts]);
    event.target.value = "";
  };

  const updateDraft = (draftId, patch) => {
    setDrafts((current) => current.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)));
  };

  const removeDraft = (draftId) => {
    setDrafts((current) => {
      const nextDrafts = current.filter((draft) => draft.id !== draftId);
      const removedDraft = current.find((draft) => draft.id === draftId);
      if (removedDraft) {
        URL.revokeObjectURL(removedDraft.previewUrl);
      }
      return nextDrafts;
    });
  };

  const submitPost = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent && drafts.length === 0) {
      return;
    }

    const files = await Promise.all(drafts.map((draft) => renderEditedFile(draft)));
    const uploaded = files.length > 0 ? await uploadPostMedia(files) : { media: [] };
    const mediaUrls = Array.isArray(uploaded.media) ? uploaded.media.map((item) => item.url) : [];

    await onCreatePost({ content: trimmedContent, mediaUrls });

    drafts.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
    setContent("");
    setDrafts([]);
  };

  return (
    <section className="composer-card social-card" id="compose-post">
      <header className="composer-header">
        <div>
          <h2>Create post</h2>
          <p>Share an update, image, or short thought.</p>
        </div>
        <span className="composer-badge">Mobile first</span>
      </header>

      <textarea
        className="composer-input"
        placeholder="What's happening?"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />

      <div className="composer-toolbar">
        <label className="ghost-chip file-chip">
          {attachmentsLabel}
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
        </label>
        <button type="button" className="primary-chip" onClick={submitPost} disabled={busy}>
          {busy ? "Publishing..." : "Post now"}
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="composer-previews">
          {drafts.map((draft) => (
            <article key={draft.id} className="composer-preview-card">
              <img
                src={draft.previewUrl}
                alt="Selected media preview"
                className="composer-preview-image"
                style={{ transform: `rotate(${draft.rotation}deg)`, filter: filterPresets[draft.filter] || "none" }}
              />
              <div className="composer-preview-actions">
                <button type="button" onClick={() => updateDraft(draft.id, { rotation: draft.rotation - 90 })}>Rotate left</button>
                <button type="button" onClick={() => updateDraft(draft.id, { rotation: draft.rotation + 90 })}>Rotate right</button>
                <button type="button" onClick={() => removeDraft(draft.id)}>Remove</button>
              </div>
              <label className="composer-filter-select">
                Filter
                <select value={draft.filter} onChange={(event) => updateDraft(draft.id, { filter: event.target.value })}>
                  <option value="none">None</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="warm">Warm</option>
                  <option value="cool">Cool</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PostComposer;