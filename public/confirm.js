document.querySelector(".delete-form")?.addEventListener("submit", (event) => {
  if (!confirm("Delete this post permanently?")) event.preventDefault();
});
