document.addEventListener("DOMContentLoaded", () => {
  const copyElements = document.querySelectorAll(".copy-content")

  copyElements.forEach((element) => {
    element.addEventListener("click", () => {
      const content = element.textContent.replace("Click to copy", "").trim()

      navigator.clipboard.writeText(content).then(() => {
        const tooltip = element.querySelector(".tooltiptext")
        const originalText = tooltip.textContent
        tooltip.textContent = "Copied!"

        setTimeout(() => {
          tooltip.textContent = originalText
        }, 2000)
      })
    })

    // Add keyboard support
    element.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        element.click()
      }
    })
  })
})
