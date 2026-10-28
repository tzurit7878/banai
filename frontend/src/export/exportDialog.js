// "PDF for your carpenter" dialog: pick the document language, download dimensioned drawings plus a
// component list. It is a design drawing to explain the intent, never a claim of manufacturability.
import { el, button, selectField } from '../editor/fields.js';
import { createDialog } from '../ui/dialog.js';
import { exportPdf } from '../api/client.js';

export const EXPORT_NOTE = 'Design drawing to explain the intent. Construction details are decided by the carpenter.';
const FAILED = 'The PDF could not be created. Please try again.';
const PICTURE_FAILED = 'The picture could not be created on this device.';

/** "banai-200x240x60.png": the overall size in cm (a decimal only when the size has one). */
export function pictureFilename(design) {
  const { width, height, depth } = design.dimensions;
  return `banai-${[width, height, depth].map((mm) => mm / 10).join('x')}.png`;
}

/** A data URL decoded in the browser (no fetch, so nothing touches the network). */
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: header.slice('data:'.length, header.indexOf(';')) });
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = el('a', { attrs: { href: url, download: filename } });
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * getSnapshot(design, options) returns the 3D picture as a data URL, or throws (the PDF then uses
 * its own drawing). "Save picture" asks it for a PNG and downloads it without contacting the server.
 */
export function createExportDialog({ getDesign, getLanguage, getSnapshot = null, exportImpl = exportPdf }) {
  let language = getLanguage();
  let busy = false;
  const status = el('p', { className: 'dialog__status', attrs: { role: 'status' } });
  status.dataset.testid = 'export-status';
  const languageField = selectField({
    label: 'Document language',
    options: [{ label: 'עברית', value: 'he' }, { label: 'English', value: 'en' }],
    value: language,
    onChange: (value) => { language = value; },
    testId: 'export-language',
  });
  const select = languageField.querySelector('select');
  const download = button('Download PDF', async () => {
    if (busy) return;
    busy = true;
    download.disabled = true;
    status.textContent = 'Preparing your PDF…';
    try {
      const design = getDesign();
      let image = null;
      try {
        image = getSnapshot ? getSnapshot(design) : null;
      } catch {
        image = null; // no WebGL here: the PDF falls back to its drawn illustration
      }
      const { blob, filename } = await exportImpl({ design, language, image });
      saveBlob(blob, filename);
      status.textContent = 'Your PDF is downloading.';
    } catch (error) {
      status.textContent = error?.message || FAILED;
    } finally {
      busy = false;
      download.disabled = false;
    }
  }, { variant: 'primary', testId: 'export-download' });

  const savePicture = button('Save picture', () => {
    if (!getSnapshot) return;
    try {
      const design = getDesign();
      saveBlob(dataUrlToBlob(getSnapshot(design, { type: 'image/png' })), pictureFilename(design));
      status.textContent = 'Your picture is downloading.';
    } catch {
      status.textContent = PICTURE_FAILED; // no WebGL here
    }
  }, { testId: 'export-picture', disabled: !getSnapshot });

  const dialog = createDialog({
    title: 'PDF for your carpenter',
    labelId: 'export-dialog-title',
    testId: 'export-dialog',
    body: [
      el('p', { className: 'dialog__text', text: 'Download a picture of your wardrobe with dimensioned drawings (front with doors, interior, side and top), build steps and a component list. All measurements are in mm.' }),
      languageField,
      el('span', { className: 'chip', text: EXPORT_NOTE }),
      status,
    ],
    actions: [download, savePicture, button('Close', () => dialog.close(), { variant: 'ghost', testId: 'export-close' })],
  });
  return {
    ...dialog,
    open() {
      language = getLanguage(); // each time: follow the current chat language
      select.value = language;
      if (!busy) status.textContent = '';
      dialog.open();
    },
  };
}
