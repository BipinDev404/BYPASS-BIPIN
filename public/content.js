(function() {
  if (document.getElementById('bypass-vault-widget')) {
    const el = document.getElementById('bypass-vault-widget');
    const wasHidden = el.style.display === 'none';
    el.style.display = wasHidden ? 'flex' : 'none';
    if (!wasHidden) { // Just hid it
      const iframe = el.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'lock_vault' }, '*');
      }
    }
    return;
  }

  const container = document.createElement('div');
  container.id = 'bypass-vault-widget';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.width = '360px';
  container.style.height = '700px';
  container.style.zIndex = '2147483647';
  container.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
  container.style.borderRadius = '32px';
  container.style.overflow = 'hidden';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.background = '#111';
  container.style.fontFamily = 'sans-serif';

  const header = document.createElement('div');
  header.style.height = '32px';
  header.style.background = '#1a1a1a';
  header.style.cursor = 'move';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'center';
  header.style.borderBottom = '1px solid #333';
  header.title = 'Drag to move';
  
  const dragIndicator = document.createElement('div');
  dragIndicator.style.width = '40px';
  dragIndicator.style.height = '4px';
  dragIndicator.style.background = '#444';
  dragIndicator.style.borderRadius = '2px';
  header.appendChild(dragIndicator);
  
  container.appendChild(header);

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.style.width = '100%';
  iframe.style.height = 'calc(100% - 32px)';
  iframe.style.border = 'none';
  
  container.appendChild(iframe);
  document.body.appendChild(container);

  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  const startRight = window.innerWidth - 380;
  xOffset = startRight;
  yOffset = 20;
  setTranslate(xOffset, yOffset, container);
  
  container.style.left = '0px';
  container.style.top = '0px';

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
    iframe.style.pointerEvents = 'none'; 
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, container);
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    iframe.style.pointerEvents = 'auto'; 
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  window.addEventListener('message', (event) => {
    if (event.data) {
      if (event.data.action === 'close_bypass_vault') {
        container.style.display = 'none';
      } else if (event.data.action === 'theme_changed') {
        if (event.data.theme === 'light') {
          container.style.background = '#ffffff';
          header.style.background = '#f5f5f5';
          header.style.borderBottom = '1px solid #eee';
          dragIndicator.style.background = '#ccc';
        } else {
          container.style.background = '#111111';
          header.style.background = '#1a1a1a';
          header.style.borderBottom = '1px solid #333';
          dragIndicator.style.background = '#444';
        }
      }
    }
  });
})();
