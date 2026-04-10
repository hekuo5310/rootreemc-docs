const menuButton = document.querySelector(".menu-button");
const sidebar = document.querySelector(".sidebar");

if (menuButton && sidebar) {
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    sidebar.classList.toggle("open");
  });
}

const tocLinks = Array.from(document.querySelectorAll(".toc a"));
if (tocLinks.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const hash = `#${entry.target.id}`;
        for (const link of tocLinks) {
          const active = link.getAttribute("href") === hash;
          link.classList.toggle("active", active);
        }
      }
    },
    {
      rootMargin: "0px 0px -70% 0px",
      threshold: [0, 1]
    }
  );

  for (const link of tocLinks) {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) observer.observe(target);
  }
}

