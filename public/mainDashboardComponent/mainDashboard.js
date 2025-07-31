window.addEventListener("DOMContentLoaded", function () {
  let advisorStudents = [];
  try {
    advisorStudents = JSON.parse(localStorage.getItem("advisorStudents")) || [];
    console.log("Advisor students from localStorage:", advisorStudents);
  } catch (e) {
    console.error("Error parsing advisorStudents from localStorage:", e);
  }

  if (advisorStudents.length === 0) {
    console.log("No students found for this advisor");
    const container = document.createElement("div");
    container.className = "student-ids-list";
    container.innerHTML =
      '<h2>My Students</h2><div class="student-id">No students assigned to this advisor.</div>';
    document.body.appendChild(container);
    return;
  }

  Promise.all([
    fetch("/student_performance_riskly.csv").then((res) => res.text()),
    fetch("/student_risks.csv").then((res) => res.text()),
  ])
    .then(([studentCSV, riskCSV]) => {
      const studentLines = studentCSV.split("\n").filter(Boolean);
      const studentHeaders = studentLines[0].split(",").map((h) => h.trim());
      const studentRows = studentLines.slice(1).map((line) => line.split(","));

      const riskLines = riskCSV.split("\n").filter(Boolean);
      const riskMap = {};
      riskLines.slice(1).forEach((line) => {
        const [id, dropout, underperform] = line.split(",").map((val) => val.trim());
        riskMap[id] = {
          DropoutRisk: dropout === "1" ? "At Risk" : "No Risk",
          Underperform: underperform === "1" ? "At Risk" : "No Risk",
        };
      });

      const filteredStudents = studentRows
        .filter((row) => advisorStudents.includes(Number(row[0])))
        .map((row) => {
          const obj = {};
          studentHeaders.forEach((header, i) => (obj[header] = row[i]));
          const studentId = row[0];
          const risks = riskMap[studentId] || {
            DropoutRisk: "No Risk",
            Underperform: "No Risk",
          };
          obj["DropoutRisk"] = risks.DropoutRisk;
          obj["Underperform"] = risks.Underperform;

          let riskCount = 0;
          if (risks.DropoutRisk === "At Risk") riskCount++;
          if (risks.Underperform === "At Risk") riskCount++;

          obj["riskClass"] =
            riskCount === 0 ? "no-risk" : riskCount === 1 ? "one-risk" : "two-risks";
          return obj;
        });

      const allHeaders = [...studentHeaders, "DropoutRisk", "Underperform"];

      const container = document.createElement("div");
      container.className = "student-ids-list";
      const tableHTML = `
        <h2 class="student-table-title">My Assigned Students</h2>
        <table class="students-table">
            <thead>
                <tr>
        ${allHeaders.map((header) => `<th>${header}</th>`).join("")}
        <th>Alert Mail</th>
      </tr>
            </thead>
             <tbody>
      ${filteredStudents
        .map((student) => {
          const isDisabled = student.riskClass === "no-risk";
          return `
          <tr class="${student.riskClass}">
            ${allHeaders.map((header) => `<td>${student[header] || ""}</td>`).join("")}
            <td>
              <button class="alert-mail-btn" ${isDisabled ? "disabled" : ""}>
                Send Alert
              </button>
            </td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
        </table>
    `;
      container.innerHTML = tableHTML;
      const tableSection = document.getElementById("student-table-section");
      if (tableSection) {
        tableSection.appendChild(container);
      } else {
        console.warn("No element with id 'student-table-section' found");
        document.body.appendChild(container);
      }
    })
    .catch((error) => {
      console.error("Error fetching CSVs:", error);
    });

  // --- Search Highlight and Navigation Logic ---
  const searchInput = document.querySelector(".nav-search");
  const searchBtn = document.querySelector(".search-btn");

  let navContainer;
  let currentIndex = 0;
  let matches = [];

  function clearHighlights() {
    document.querySelectorAll(".highlighted-text").forEach((el) => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    matches = [];
    currentIndex = 0;
    if (navContainer) {
      navContainer.remove();
      navContainer = null;
    }
  }

  function createNavArrows() {
    navContainer = document.createElement("div");
    navContainer.style.position = "fixed";
    navContainer.style.top = "60px";
    navContainer.style.right = "20px";
    navContainer.style.zIndex = 9999;
    navContainer.style.background = "rgba(0,0,0,0.6)";
    navContainer.style.borderRadius = "8px";
    navContainer.style.padding = "5px";
    navContainer.style.display = "flex";
    navContainer.style.gap = "5px";
    navContainer.style.alignItems = "center";

    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "⬆️";
    prevBtn.title = "Previous match";
    prevBtn.style.cursor = "pointer";

    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "⬇️";
    nextBtn.title = "Next match";
    nextBtn.style.cursor = "pointer";

    const countSpan = document.createElement("span");
    countSpan.style.color = "#fff";
    countSpan.style.fontSize = "0.9rem";
    countSpan.style.userSelect = "none";

    function updateCount() {
      countSpan.textContent = `${currentIndex + 1} / ${matches.length}`;
    }

    prevBtn.addEventListener("click", () => {
      if (matches.length === 0) return;
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
      scrollToMatch(currentIndex);
      updateCount();
    });

    nextBtn.addEventListener("click", () => {
      if (matches.length === 0) return;
      currentIndex = (currentIndex + 1) % matches.length;
      scrollToMatch(currentIndex);
      updateCount();
    });

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(countSpan);
    navContainer.appendChild(nextBtn);
    document.body.appendChild(navContainer);
    updateCount();
  }

  function scrollToMatch(index) {
    matches.forEach((span, i) => {
      if (i === index) {
        span.classList.add("highlighted-text-active");
        span.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        span.classList.remove("highlighted-text-active");
      }
    });
  }

  function highlightMatchesInNode(node, searchTerm) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      const lowerText = text.toLowerCase();
      const lowerSearch = searchTerm.toLowerCase();

      if (!lowerText.includes(lowerSearch)) return;

      const frag = document.createDocumentFragment();
      let startIndex = 0;
      let matchIndex;

      while ((matchIndex = lowerText.indexOf(lowerSearch, startIndex)) !== -1) {
        const before = text.slice(startIndex, matchIndex);
        const match = text.slice(matchIndex, matchIndex + searchTerm.length);
        if (before) frag.appendChild(document.createTextNode(before));

        const span = document.createElement("span");
        span.className = "highlighted-text";
        span.textContent = match;
        frag.appendChild(span);
        matches.push(span);

        startIndex = matchIndex + searchTerm.length;
      }

      const after = text.slice(startIndex);
      if (after) frag.appendChild(document.createTextNode(after));

      node.parentNode.replaceChild(frag, node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.childNodes &&
      !["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME"].includes(node.tagName)
    ) {
      Array.from(node.childNodes).forEach((child) =>
        highlightMatchesInNode(child, searchTerm)
      );
    }
  }

  function performSearch() {
    const searchTerm = searchInput?.value.trim().toLowerCase();
    if (!searchTerm) return;

    clearHighlights();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const parent = node.parentNode;
          if (!parent || !parent.offsetParent) return NodeFilter.FILTER_SKIP;
          if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME"].includes(parent.tagName))
            return NodeFilter.FILTER_SKIP;
          return node.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      }
    );

    const nodesToHighlight = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      nodesToHighlight.push(currentNode);
    }

    nodesToHighlight.forEach((node) => highlightMatchesInNode(node, searchTerm));

    if (matches.length === 0) {
      alert("No matches found.");
      return;
    }

    createNavArrows();
    currentIndex = 0;
    scrollToMatch(currentIndex);

    setTimeout(() => {
      matches.forEach((span) =>
        span.classList.remove("highlighted-text", "highlighted-text-active")
      );
      if (navContainer) {
        navContainer.remove();
        navContainer = null;
      }
      matches = [];
      currentIndex = 0;
    }, 5000);
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
  } else {
    console.warn("Search button not found");
  }

  searchInput?.addEventListener("keydown", function (e) {
    if (e.key === "Enter") performSearch();
  });
});
