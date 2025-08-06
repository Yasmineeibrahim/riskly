window.addEventListener("DOMContentLoaded", function () {
  let advisorStudents = [];
  try {
    advisorStudents = JSON.parse(localStorage.getItem("advisorStudents")) || [];
    console.log("Advisor students from localStorage:", advisorStudents);
  } catch (e) {
    console.error("Error parsing advisorStudents from localStorage:", e);
  }

  // Get advisor email from localStorage
  const advisorEmail = localStorage.getItem("advisorEmail") || "unknown";
  
  // Fetch both assigned students and predicted students
  Promise.all([
    // Fetch assigned students (if any)
    advisorStudents.length > 0 ? fetch("/api/students/by-ids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentIds: advisorStudents }),
    }).then(res => res.json()) : Promise.resolve({ students: [] }),
    
    // Fetch predicted students
    fetch("/api/students/predicted", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ advisorEmail: advisorEmail }),
    }).then(res => res.json())
    ])
    .then(([assignedData, predictedData]) => {
      console.log('Assigned students data:', assignedData);
      console.log('Predicted students data:', predictedData);
      
      // Combine assigned and predicted students
      const assignedStudents = assignedData.students || [];
      const predictedStudents = predictedData.students || [];
      
      // Add a flag to distinguish predicted students in the display
      const allStudents = [
        ...assignedStudents.map(s => ({ ...s, isAssigned: true })),
        ...predictedStudents.map(s => ({ ...s, isPredicted: true }))
      ];
      
      if (allStudents.length === 0) {
        console.log("No students found for this advisor");
        const container = document.createElement("div");
        container.className = "student-ids-list";
        container.innerHTML =
          '<h2>My Students</h2><div class="student-id">No students assigned to this advisor.</div>';
        document.body.appendChild(container);
        return;
      }

      console.log('All students with risk classes:', allStudents.map(s => ({ 
        id: s.StudentID, 
        name: s.Name, 
        riskClass: s.riskClass,
        type: s.isPredicted ? 'Predicted' : 'Assigned'
      })));
      
             const allHeaders = [
         "StudentID", "Name", "Gender", "AttendanceRate", 
         "StudyHoursPerWeek", "PreviousGrade", "ExtracurricularActivities", 
         "ParentalSupport", "FinalGrade", "DropoutRisk", "Underperform"
       ];
       
       // Add prediction probabilities for predicted students
       allStudents.forEach(student => {
         if (student.isPredicted && student.dropout_probability && student.underperform_probability) {
           student.DropoutRisk = `${student.DropoutRisk} (${(student.dropout_probability * 100).toFixed(1)}%)`;
           student.Underperform = `${student.Underperform} (${(student.underperform_probability * 100).toFixed(1)}%)`;
         }
       });

      const container = document.createElement("div");
      container.className = "student-ids-list";
             const tableHTML = `
         <h2 class="student-table-title">My Students (Assigned & Predicted)</h2>
         <table class="students-table">
             <thead>
                 <tr>
         ${allHeaders.map((header) => `<th>${header}</th>`).join("")}
         <th>Alert Mail</th>
       </tr>
             </thead>
              <tbody>
       ${allStudents
         .map((student) => {
           const isDisabled = student.riskClass === "no-risk";
           const typeClass = student.isPredicted ? "predicted-student" : "assigned-student";
           return `
           <tr class="${student.riskClass} ${typeClass}">
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

      // Add event listeners for alert mail buttons
      addAlertMailEventListeners();

      // Update performance metrics with the loaded student data
      updatePerformanceMetrics(allStudents);

      // ---- FILTERING ----
      const filterBtn = document.querySelector(".filter-btn");
      const filterOptions = document.getElementById("filter-options");

      filterBtn?.addEventListener("click", () => {
        filterOptions.classList.toggle("hidden");
      });

             filterOptions?.addEventListener("click", (e) => {
         const selectedClass = e.target.dataset.filter;
         if (!selectedClass) return;

         // Filter logic
         const filtered = selectedClass === "all"
           ? allStudents
           : allStudents.filter((student) => student.riskClass === selectedClass);

         // Re-render table with filtered data
         const newFilteredHTML = `
           <h2 class="student-table-title">My Students (Assigned & Predicted)</h2>
           <table class="students-table">
             <thead>
               <tr>
                 ${allHeaders.map((header) => `<th>${header}</th>`).join("")}
                 <th>Alert Mail</th>
               </tr>
             </thead>
             <tbody>
               ${filtered
                 .map((student) => {
                   const isDisabled = student.riskClass === "no-risk";
                   const typeClass = student.isPredicted ? "predicted-student" : "assigned-student";
                   return `
                     <tr class="${student.riskClass} ${typeClass}">
                       ${allHeaders
                         .map((header) => `<td>${student[header] || ""}</td>`)
                         .join("")}
                       <td>
                         <button class="alert-mail-btn" ${
                           isDisabled ? "disabled" : ""
                         }>
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
         container.innerHTML = newFilteredHTML;
         filterOptions.classList.add("hidden");
         
         // Re-add event listeners for the new buttons
         addAlertMailEventListeners();
       });

      // ---- SORTING ----
      const sortBtn = document.querySelector(".sort-btn");
      const sortOptions = document.getElementById("sort-options");

      sortBtn?.addEventListener("click", () => {
        sortOptions.classList.toggle("hidden");
      });

      let sortOrder = {};

               sortOptions?.addEventListener("click", (e) => {
           const field = e.target.dataset.sort;
           if (!field) return;

           // Ensure the field exists in the student objects
           if (!allStudents[0] || !(field in allStudents[0])) {
             console.warn(`Field '${field}' not found in student data.`);
             return;
           }

           // Show sort order options
           const sortOrderMenu = document.getElementById("sort-order");
           sortOrderMenu.classList.remove("hidden");

           sortOrderMenu.addEventListener("click", (event) => {
             const order = event.target.dataset.order;
             if (!order) return;

             allStudents.sort((a, b) => {
               const valA = a[field] || "";
               const valB = b[field] || "";

               // Check for numbers
               if (!isNaN(valA) && !isNaN(valB)) {
                 return order === "asc" ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
               } else {
                 return order === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
               }
             });

             // Re-render table
             const newTableHTML = `
               <h2 class="student-table-title">My Students (Assigned & Predicted)</h2>
               <table class="students-table">
                 <thead>
                   <tr>
                     ${allHeaders.map((header) => `<th>${header}</th>`).join("")}
                     <th>Alert Mail</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${allStudents
                     .map((student) => {
                       const isDisabled = student.riskClass === "no-risk";
                       const typeClass = student.isPredicted ? "predicted-student" : "assigned-student";
                       return `
                         <tr class="${student.riskClass} ${typeClass}">
                           ${allHeaders
                             .map((header) => `<td>${student[header] || ""}</td>`)
                             .join("")}
                           <td>
                             <button class="alert-mail-btn" ${
                               isDisabled ? "disabled" : ""
                             }>
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
             container.innerHTML = newTableHTML;
             sortOrderMenu.classList.add("hidden");
             
             // Re-add event listeners for the new buttons
             addAlertMailEventListeners();
           });
         });
    })
    .catch((error) => {
      console.error("Error fetching students:", error);
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

    // Handle Add and Predict form submission
  const addStudentForm = document.getElementById("add-student-form");
   
  addStudentForm?.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      Name: document.getElementById("name").value,
      Email: document.getElementById("email").value,
      Gender: document.getElementById("Gender").value,
      AttendanceRate: parseFloat(document.getElementById("AttendanceRate").value),
      StudyHoursPerWeek: parseFloat(document.getElementById("StudyHoursPerWeek").value),
      PreviousGrade: parseFloat(document.getElementById("PreviousGrade").value),
      ExtracurricularActivities: parseFloat(document.getElementById("ExtracurricularActivities").value),
      ParentalSupport: document.getElementById("ParentalSupport").value,
      FinalGrade: parseFloat(document.getElementById("FinalGrade").value),
      advisor_email: localStorage.getItem("advisorEmail") || "unknown"
    };

    // Validate form data
    if (!formData.Name || !formData.Gender || !formData.AttendanceRate || 
        !formData.StudyHoursPerWeek || !formData.PreviousGrade || 
        !formData.ExtracurricularActivities || !formData.ParentalSupport || 
        !formData.FinalGrade) {
      showCustomPopup("Please fill in all required fields", "error");
      return;
    }

    // Show loading popup with dynamic message
    const loadingMessages = [
      "Analyzing student data...",
      "Processing academic metrics...",
      "Generating ML predictions...",
      "Calculating risk factors...",
      "Finalizing results..."
    ];
    
    let messageIndex = 0;
    showLoadingPopup(loadingMessages[messageIndex]);
    
    // Update loading message every 2 seconds
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      const loadingContent = document.querySelector('#loading-popup p');
      if (loadingContent) {
        loadingContent.textContent = loadingMessages[messageIndex];
      }
    }, 2000);

    try {
      console.log("Submitting student data to Python backend:", formData);
      
      // Send to Python backend for ML prediction
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      // Clear message interval and hide loading popup
      clearInterval(messageInterval);
      hideLoadingPopup();
      
      if (response.ok) {
        // Show success popup with prediction results
        const predictionMessage = `
          <div style="text-align: center;">
            <h3 style="color: #4CAF50; margin-bottom: 20px;">🎯 Prediction Complete!</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 15px 0;">
              <h4 style="color: #333; margin-bottom: 15px;">ML Prediction Results:</h4>
              <div style="display: flex; justify-content: space-around; margin-bottom: 15px;">
                <div style="text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: ${result.dropout_risk ? '#f44336' : '#4CAF50'};">
                    ${result.dropout_risk ? '⚠️' : '✅'}
                  </div>
                  <div style="font-weight: bold; color: #333;">Dropout Risk</div>
                  <div style="color: ${result.dropout_risk ? '#f44336' : '#4CAF50'};">
                    ${result.dropout_risk ? "At Risk" : "No Risk"}
                  </div>
                  <div style="font-size: 12px; color: #666;">
                    (${(result.dropout_probability * 100).toFixed(1)}% probability)
                  </div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: ${result.underperform_risk ? '#ff9800' : '#4CAF50'};">
                    ${result.underperform_risk ? '⚠️' : '✅'}
                  </div>
                  <div style="font-weight: bold; color: #333;">Underperform Risk</div>
                  <div style="color: ${result.underperform_risk ? '#ff9800' : '#4CAF50'};">
                    ${result.underperform_risk ? "At Risk" : "No Risk"}
                  </div>
                  <div style="font-size: 12px; color: #666;">
                    (${(result.underperform_probability * 100).toFixed(1)}% probability)
                  </div>
                </div>
              </div>
              <div style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin-top: 15px;">
                <strong>✅ Student data saved to database successfully!</strong>
              </div>
            </div>
          </div>
        `;
        
        showCustomPopup(predictionMessage, "success");
        
        // Clear form
        addStudentForm.reset();
      } else {
        // Handle specific error types
        if (result.error === "Duplicate email error") {
          showCustomPopup(`
            <div style="text-align: center;">
              <h3 style="color: #f44336; margin-bottom: 15px;">❌ Duplicate Email Error</h3>
              <p style="color: #333; margin-bottom: 15px;">${result.message}</p>
              <p style="color: #666; font-size: 14px;">Please use a different email address for this student.</p>
            </div>
          `, "error");
        } else {
          showCustomPopup(`
            <div style="text-align: center;">
              <h3 style="color: #f44336; margin-bottom: 15px;">❌ Prediction Failed</h3>
              <p style="color: #333;">${result.message || "Failed to predict student"}</p>
            </div>
          `, "error");
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      clearInterval(messageInterval);
      hideLoadingPopup();
      showCustomPopup(`
        <div style="text-align: center;">
          <h3 style="color: #f44336; margin-bottom: 15px;">❌ Connection Error</h3>
          <p style="color: #333; margin-bottom: 15px;">Error connecting to prediction server.</p>
          <p style="color: #666; font-size: 14px;">Please ensure the Python backend is running on port 5000.</p>
        </div>
      `, "error");
    }
  });
});

// Function to predict student risk based on form data
function predictStudentRisk(formData) {
  let dropoutRisk = 0;
  let underperformRisk = 0;

  // Dropout risk factors
  if (formData.AttendanceRate < 80) dropoutRisk = 1;
  if (formData.StudyHoursPerWeek < 10) dropoutRisk = 1;
  if (formData.ParentalSupport === 'Low') dropoutRisk = 1;

  // Underperform risk factors
  if (formData.PreviousGrade < 70) underperformRisk = 1;
  if (formData.ExtracurricularActivities < 2) underperformRisk = 1;
  if (formData.FinalGrade < 75) underperformRisk = 1;

  // Determine risk class
  const riskCount = dropoutRisk + underperformRisk;
  const riskClass = riskCount === 0 ? "no-risk" : 
                   riskCount === 1 ? "medium-risk" : "high-risk";

  return {
    dropoutRisk: dropoutRisk === 1 ? "At Risk" : "No Risk",
    underperformRisk: underperformRisk === 1 ? "At Risk" : "No Risk",
    riskClass: riskClass
  };
}

// Function to add event listeners for alert mail buttons
function addAlertMailEventListeners() {
  const alertButtons = document.querySelectorAll('.alert-mail-btn');
  
  alertButtons.forEach(button => {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      
      // Get the student ID from the table row
      const row = this.closest('tr');
      const studentIdCell = row.querySelector('td:first-child');
      const studentId = studentIdCell.textContent.trim();
      const studentName = row.querySelector('td:nth-child(2)').textContent.trim();
      
      if (!studentId) {
        alert('Student ID not found');
        return;
      }

      // Determine risk level based on the row's risk class
      console.log('Row classes:', row.className);
      const riskLevel = row.className.includes('high-risk') ? 'high' : 
                       row.className.includes('medium-risk') ? 'medium' : 
                       row.className.includes('low-risk') ? 'low' : 'high';
      console.log('Detected risk level:', riskLevel);
      
      // Disable button to prevent multiple clicks
      this.disabled = true;
      this.textContent = 'Sending...';
      
      try {
        // Choose endpoint based on risk level
        const endpoint = riskLevel === 'medium' ? '/api/sendMediumRiskEmail' : '/api/sendHighRiskEmail';
        const emailType = riskLevel === 'medium' ? 'warning' : 'alert';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: parseInt(studentId)
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          // Show success message
          this.textContent = 'Sent ✓';
          this.style.backgroundColor = '#4CAF50';
          this.style.color = 'white';
          
          // Show success notification
          const message = riskLevel === 'medium' 
            ? `Academic warning sent successfully to ${studentName}`
            : `High risk alert sent successfully to ${studentName}`;
          showNotification(message, 'success');
          
          // Reset button after 3 seconds
          setTimeout(() => {
            this.textContent = 'Send Alert';
            this.style.backgroundColor = '';
            this.style.color = '';
            this.disabled = false;
          }, 3000);
        } else {
          throw new Error(result.message || 'Failed to send email');
        }
      } catch (error) {
        console.error(`Error sending ${riskLevel} risk email:`, error);
        
        // Show error message
        this.textContent = 'Failed';
        this.style.backgroundColor = '#f44336';
        this.style.color = 'white';
        
        // Show error notification
        const message = riskLevel === 'medium' 
          ? `Failed to send warning to ${studentName}: ${error.message}`
          : `Failed to send alert to ${studentName}: ${error.message}`;
        showNotification(message, 'error');
        
        // Reset button after 3 seconds
        setTimeout(() => {
          this.textContent = 'Send Alert';
          this.style.backgroundColor = '';
          this.style.color = '';
          this.disabled = false;
        }, 3000);
      }
    });
  });
}

// Function to show notifications
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Set background color based on type
  if (type === 'success') {
    notification.style.backgroundColor = '#4CAF50';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f44336';
  } else {
    notification.style.backgroundColor = '#2196F3';
  }
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Function to show loading popup
function showLoadingPopup(message) {
  // Remove existing loading popup if any
  hideLoadingPopup();
  
  const loadingPopup = document.createElement('div');
  loadingPopup.id = 'loading-popup';
  loadingPopup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
    backdrop-filter: blur(5px);
  `;
  
  const loadingContent = document.createElement('div');
  loadingContent.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
  `;
  
  // Add spinning animation CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
  `;
  document.head.appendChild(style);
  
  loadingContent.innerHTML = `
    <div class="spinner"></div>
    <h3 style="color: #333; margin-bottom: 15px;">Processing...</h3>
    <p style="color: #666; font-size: 14px;">${message}</p>
  `;
  
  loadingPopup.appendChild(loadingContent);
  document.body.appendChild(loadingPopup);
}

// Function to hide loading popup
function hideLoadingPopup() {
  const existingPopup = document.getElementById('loading-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
}

// Function to show custom popup
function showCustomPopup(message, type = 'info') {
  // Remove existing custom popup if any
  const existingPopup = document.getElementById('custom-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'custom-popup';
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10002;
    backdrop-filter: blur(5px);
  `;
  
  const popupContent = document.createElement('div');
  popupContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  // Set border color based on type
  if (type === 'success') {
    popupContent.style.borderLeft = '5px solid #4CAF50';
  } else if (type === 'error') {
    popupContent.style.borderLeft = '5px solid #f44336';
  } else {
    popupContent.style.borderLeft = '5px solid #2196F3';
  }
  
  popupContent.innerHTML = `
    ${message}
    <div style="margin-top: 25px;">
      <button id="popup-close-btn" style="
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 25px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: background 0.3s;
      " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
        Close
      </button>
    </div>
  `;
  
  popup.appendChild(popupContent);
  document.body.appendChild(popup);
  
  // Add close functionality
  const closeBtn = document.getElementById('popup-close-btn');
  closeBtn.addEventListener('click', () => {
    popup.remove();
  });
  
  // Close on background click
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });
  
  // Auto-close success popups after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (document.getElementById('custom-popup')) {
        popup.remove();
      }
    }, 5000);
  }
}

// Logout functionality
function setupLogout() {
  console.log('Setting up logout functionality...');
  const logoutBtn = document.querySelector('.logout-btn');
  
  if (logoutBtn) {
    console.log('Logout button found, adding event listener');
    logoutBtn.addEventListener('click', function(e) {
      console.log('Logout button clicked');
      e.preventDefault();
      
      // Show confirmation dialog
      if (confirm('Are you sure you want to logout?')) {
        console.log('User confirmed logout');
        // Clear all localStorage data
        localStorage.removeItem('token');
        localStorage.removeItem('advisorId');
        localStorage.removeItem('advisorName');
        localStorage.removeItem('advisorEmail');
        localStorage.removeItem('advisorStudents');
        
        console.log('User logged out, localStorage cleared');
        
        // Show success notification
        showNotification('Successfully logged out', 'success');
        
        // Small delay before redirect to show notification
        setTimeout(() => {
          // Redirect to login page with logout reason
          window.location.href = window.location.origin + '/?logout=manual';
        }, 1000);
      } else {
        console.log('User cancelled logout');
      }
    });
  } else {
    console.warn('Logout button not found');
  }
}

// Initialize logout functionality
console.log('Initializing logout functionality...');
setupLogout();

// Initialize Performance section functionality
console.log('Initializing performance section...');
initializePerformanceSection();

// Function to initialize Performance section
function initializePerformanceSection() {
  // Add event listeners for action buttons
  const actionButtons = document.querySelectorAll('.action-btn');
  
  actionButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const action = this.querySelector('span').textContent;
      console.log(`Performance action clicked: ${action}`);
      
      // Show notification based on action
      switch(action) {
        case 'Export Report':
          showNotification('Report export started...', 'info');
          // Simulate export process
          setTimeout(() => {
            showNotification('Report exported successfully!', 'success');
          }, 2000);
          break;
          
        case 'Send Alerts':
          showNotification('Sending alerts to at-risk students...', 'info');
          // Simulate alert sending
          setTimeout(() => {
            showNotification('Alerts sent successfully!', 'success');
          }, 1500);
          break;
          
        case 'Schedule Meeting':
          showNotification('Opening calendar to schedule meeting...', 'info');
          // Simulate calendar opening
          setTimeout(() => {
            showNotification('Meeting scheduled successfully!', 'success');
          }, 1000);
          break;
          
        case 'Generate Insights':
          showNotification('Generating performance insights...', 'info');
          // Simulate insight generation
          setTimeout(() => {
            showNotification('Insights generated successfully!', 'success');
          }, 2500);
          break;
      }
    });
  });
  
  // Update performance metrics based on student data
  updatePerformanceMetrics();
}

// Function to update performance metrics
function updatePerformanceMetrics(studentsData = null) {
  try {
    // Use provided students data or fall back to localStorage
    let advisorStudents = studentsData;
    if (!advisorStudents) {
      advisorStudents = JSON.parse(localStorage.getItem("advisorStudents")) || [];
    }
    
    if (advisorStudents && advisorStudents.length > 0) {
      // Calculate metrics based on student data
      const totalStudents = advisorStudents.length;
      
      // Calculate average grade from student data
      const totalGrade = advisorStudents.reduce((sum, student) => {
        return sum + (parseFloat(student.FinalGrade) || 0);
      }, 0);
      const avgGrade = totalStudents > 0 ? (totalGrade / totalStudents).toFixed(1) : 0;
      
      // Calculate average attendance rate
      const totalAttendance = advisorStudents.reduce((sum, student) => {
        return sum + (parseFloat(student.AttendanceRate) || 0);
      }, 0);
      const attendanceRate = totalStudents > 0 ? (totalAttendance / totalStudents).toFixed(1) : 0;
      
      // Calculate number of at-risk students
      const atRiskStudents = advisorStudents.filter(student => {
        const isAtRisk = student.DropoutRisk === "At Risk" || student.Underperform === "At Risk";
        console.log(`Student ${student.StudentID} (${student.Name}): DropoutRisk=${student.DropoutRisk}, Underperform=${student.Underperform}, isAtRisk=${isAtRisk}`);
        return isAtRisk;
      }).length;
      
      // Calculate total number of risks assigned to this advisor
      const totalRisks = advisorStudents.reduce((total, student) => {
        let studentRisks = 0;
        if (student.DropoutRisk === "At Risk") studentRisks++;
        if (student.Underperform === "At Risk") studentRisks++;
        console.log(`Student ${student.StudentID} (${student.Name}): ${studentRisks} risks assigned`);
        return total + studentRisks;
      }, 0);
      
      // Calculate success rate (students not at risk)
      const successRate = totalStudents > 0 ? ((totalStudents - atRiskStudents) / totalStudents * 100).toFixed(1) : 0;
      
      // Update the metric values
      const overallPerformance = document.getElementById('overall-performance');
      const studentEngagement = document.getElementById('student-engagement');
      const totalRisksElement = document.getElementById('total-risks');
      const successRateElement = document.getElementById('success-rate');
      
      if (overallPerformance) overallPerformance.textContent = `${avgGrade}%`;
      if (studentEngagement) studentEngagement.textContent = `${attendanceRate}%`;
      if (totalRisksElement) totalRisksElement.textContent = totalRisks;
      if (successRateElement) successRateElement.textContent = `${successRate}%`;
      
      console.log('Performance metrics updated successfully', {
        totalStudents,
        avgGrade,
        attendanceRate,
        atRiskStudents,
        totalRisks,
        successRate,
        sampleStudent: advisorStudents[0] // Log first student for debugging
      });
    }
  } catch (error) {
    console.error('Error updating performance metrics:', error);
  }
}
