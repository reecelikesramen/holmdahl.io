document.addEventListener("DOMContentLoaded", function () {
  var pdfPopup = document.getElementById("pdf-popup");
  var pdfViewer = document.getElementById("pdf-viewer");

  // Function to open the PDF popup
  function openPdfPopup(pdfUrl) {
    pdfViewer.setAttribute("src", pdfUrl);
    pdfPopup.style.display = "block";
  }

  // Function to close the PDF popup
  function closePdfPopup() {
    pdfPopup.style.display = "none";
  }

  // Add click event listener to PDF links
  var pdfLinks = document.querySelectorAll('a[href$=".pdf"]');
  pdfLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      openPdfPopup(this.href);
    });
  });

  // Add click event listener to the close button
  var closeButton = document.querySelector(".pdf-popup .close-button");
  closeButton.addEventListener("click", closePdfPopup);

  // add escape key listener to close the popuo
  document.getElementById("top").addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePdfPopup();
    }
  });
});
