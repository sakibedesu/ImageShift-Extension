chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-image-as",
    title: "ImageShift | Save image as...",
    contexts: ["image"]
  });

  const formats = [
    { id: "save-as-jpg",  title: "JPG",  mime: "image/jpeg", ext: "jpg"  },
    { id: "save-as-png",  title: "PNG",  mime: "image/png",  ext: "png"  },
    { id: "save-as-webp", title: "WebP", mime: "image/webp", ext: "webp" }
  ];

  formats.forEach(fmt => {
    chrome.contextMenus.create({
      id: fmt.id,
      parentId: "save-image-as",
      title: fmt.title,
      contexts: ["image"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const formatMap = {
    "save-as-jpg":  { mime: "image/jpeg", ext: "jpg",  quality: 0.92 },
    "save-as-png":  { mime: "image/png",  ext: "png",  quality: 1.0  },
    "save-as-webp": { mime: "image/webp", ext: "webp", quality: 0.92 }
  };

  const fmt = formatMap[info.menuItemId];
  if (!fmt || !info.srcUrl) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: convertAndDownload,
    args: [info.srcUrl, fmt.mime, fmt.ext, fmt.quality]
  });
});

function convertAndDownload(srcUrl, mime, ext, quality) {
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");

    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL(mime, quality);
    const name = srcUrl.split("/").pop().split("?")[0].replace(/\.[^.]+$/, "") || "image";

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  img.onerror = () => {
    fetch(srcUrl)
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const tempImg = new Image();

        tempImg.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = tempImg.naturalWidth;
          canvas.height = tempImg.naturalHeight;

          const ctx = canvas.getContext("2d");

          if (mime === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(tempImg, 0, 0);

          const dataUrl = canvas.toDataURL(mime, quality);
          const name = srcUrl.split("/").pop().split("?")[0].replace(/\.[^.]+$/, "") || "image";

          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `${name}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        };

        tempImg.src = blobUrl;
      })
      .catch(() => alert("ImageShift: Could not save this image."));
  };

  img.src = srcUrl;
}
