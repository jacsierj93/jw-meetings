const copyComputedStyles = (source: Element, target: Element) => {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const computedStyle = window.getComputedStyle(source);
  for (const propertyName of Array.from(computedStyle)) {
    const value = computedStyle.getPropertyValue(propertyName);
    const priority = computedStyle.getPropertyPriority(propertyName);
    target.style.setProperty(propertyName, value, priority);
  }
};

const cloneNodeWithInlineStyles = (source: Element): Element => {
  const clone = source.cloneNode(true) as Element;
  const sourceTree: Element[] = [source];
  const cloneTree: Element[] = [clone];

  while (sourceTree.length > 0) {
    const sourceElement = sourceTree.pop();
    const cloneElement = cloneTree.pop();

    if (!sourceElement || !cloneElement) {
      continue;
    }

    copyComputedStyles(sourceElement, cloneElement);

    const sourceChildren = Array.from(sourceElement.children);
    const cloneChildren = Array.from(cloneElement.children);

    for (let i = 0; i < sourceChildren.length; i += 1) {
      const sourceChild = sourceChildren[i];
      const cloneChild = cloneChildren[i];
      if (sourceChild && cloneChild) {
        sourceTree.push(sourceChild);
        cloneTree.push(cloneChild);
      }
    }
  }

  return clone;
};

const createSvgDataUrl = (content: string, width: number, height: number) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${content}</foreignObject>` +
    "</svg>";

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen SVG intermedia"));
    image.src = src;
  });

export const elementToPngDataUrl = async (element: HTMLElement, pixelRatio = 2) => {
  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(bounds.width));
  const height = Math.max(1, Math.ceil(bounds.height));

  const clonedNode = cloneNodeWithInlineStyles(element) as HTMLElement;
  clonedNode.querySelectorAll(".no-export").forEach((node) => node.remove());
  clonedNode.classList.remove("card-selected");
  clonedNode.querySelectorAll(".card-selected").forEach((node) => {
    node.classList.remove("card-selected");
  });

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.backgroundColor = "#ffffff";
  wrapper.appendChild(clonedNode);

  const serializedContent = new XMLSerializer().serializeToString(wrapper);
  const svgDataUrl = createSvgDataUrl(serializedContent, width, height);

  const image = await loadImage(svgDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo obtener el contexto de render para exportar la tarjeta");
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/png");
};

export const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
