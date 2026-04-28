const categoryCards = document.querySelectorAll(".category-card");
const previewCategory = document.querySelector("#preview-category");
const previewTitle = document.querySelector("#preview-title");

const categoryThemes = {
  IDE: {
    title: "Planning IDE",
    color: "linear-gradient(135deg, #d95d39, #ed8f68)",
  },
  AS: {
    title: "Planning AS",
    color: "linear-gradient(135deg, #2a7f62, #58a587)",
  },
  ASH: {
    title: "Planning ASH",
    color: "linear-gradient(135deg, #355c7d, #5e89af)",
  },
};

categoryCards.forEach((card) => {
  card.addEventListener("click", () => {
    const category = card.dataset.category;
    const theme = categoryThemes[category];

    categoryCards.forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");

    previewCategory.textContent = category;
    previewTitle.textContent = theme.title;
    previewCategory.style.background = theme.color;
  });
});
