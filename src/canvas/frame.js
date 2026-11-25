{
  const tellHeight = () =>
    parent.postMessage({ parallax: "height", height: document.documentElement.getBoundingClientRect().height }, "*")
  new ResizeObserver(tellHeight).observe(document.documentElement)
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") parent.postMessage({ parallax: "leave" }, "*")
  })
}
