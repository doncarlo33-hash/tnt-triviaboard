import { saveMediaFile } from '../utils/media.js';

export function LabeledInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="final-question-editor">
      <span className="mini-label">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function LabeledTextarea({ label, value, onChange }) {
  return (
    <label className="final-question-editor">
      <span className="mini-label">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function MediaUploadField({ label, accept, currentValue, onChange, className = "" }) {
  return (
    <label className={`final-question-editor ${className}`.trim()}>
      <span className="mini-label">{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={async (event) => {
          const [file] = event.target.files || [];
          if (!file) {
            return;
          }
          const mediaRef = await saveMediaFile(file);
          onChange(mediaRef);
          event.target.value = "";
        }}
      />
      {currentValue && <span className="helper-text">File loaded</span>}
    </label>
  );
}
