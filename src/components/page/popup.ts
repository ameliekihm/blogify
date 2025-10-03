export function showPopup(message: string) {
  const popup = document.createElement('div');
  popup.className = 'custom-popup';

  popup.innerHTML = `
    <div class="popup-content">
      <p>${message}</p>
      <button class="popup-close">OK</button>
    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector('.popup-close')!.addEventListener('click', () => {
    popup.remove();
  });
}
