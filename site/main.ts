/**
 * The download buttons open a "coming soon" dialog until desktop builds are
 * published. A native <dialog> gives focus trapping, Escape to close and the
 * inert background for free.
 */
const dialog = document.getElementById('download-dialog') as HTMLDialogElement | null;

if (dialog) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-download]')) {
    button.addEventListener('click', () => dialog.showModal());
  }
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-close]')) {
    button.addEventListener('click', () => dialog.close());
  }
  // A click that lands on the dialog element itself hit the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
