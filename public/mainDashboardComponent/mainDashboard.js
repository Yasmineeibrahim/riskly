window.addEventListener("DOMContentLoaded", function () {

  // Get advisor's student IDs from localStorage
  let advisorStudents = [];
  try {
    advisorStudents = JSON.parse(localStorage.getItem("advisorStudents")) || [];
    console.log("Advisor students from localStorage:", advisorStudents);
  } catch (e) {
    console.error("Error parsing advisorStudents from localStorage:", e);
  }

  // If no students in localStorage, show a message
  if (advisorStudents.length === 0) {
    console.log("No students found for this advisor");
    const container = document.createElement("div");
    container.className = "student-ids-list";
    container.innerHTML =
      '<h2>My Students</h2><div class="student-id">No students assigned to this advisor.</div>';
    document.body.appendChild(container);
    return;
  }

  // Fetch and display only the advisor's students from CSV
  // Fetch and display advisor's students + their risk values
Promise.all([
    fetch('/student_performance_riskly.csv').then(res => res.text()),
    fetch('/student_risks.csv').then(res => res.text()) // ✅ fetch risks
])
.then(([studentCSV, riskCSV]) => {
    const studentLines = studentCSV.split('\n').filter(Boolean);
    const studentHeaders = studentLines[0].split(',').map(h => h.trim());
    const studentRows = studentLines.slice(1).map(line => line.split(','));

    const riskLines = riskCSV.split('\n').filter(Boolean);
    const riskMap = {};
    riskLines.slice(1).forEach(line => {
        const [id, dropout, underperform] = line.split(',').map(val => val.trim());
        riskMap[id] = {
  DropoutRisk: dropout === "1" ? "At Risk" : "No Risk",
  Underperform: underperform === "1" ? "At Risk" : "No Risk"
};

    });

    const filteredStudents = studentRows
        .filter(row => advisorStudents.includes(Number(row[0])))
        .map(row => {
            const obj = {};
            studentHeaders.forEach((header, i) => obj[header] = row[i]);
            const studentId = row[0];
            const risks = riskMap[studentId] || { DropoutRisk: '', Underperform: '' };
            obj['DropoutRisk'] = risks.DropoutRisk;
            obj['Underperform'] = risks.Underperform;
            return obj;
        });

    const allHeaders = [...studentHeaders, 'DropoutRisk', 'Underperform'];

    const container = document.createElement('div');
    container.className = 'student-ids-list';
    const tableHTML = `
        <h2 class="student-table-title">My Assigned Students</h2>
        <table class="students-table">
            <thead>
                <tr>
                    ${allHeaders.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${filteredStudents.map(student => `
                    <tr>
                        ${allHeaders.map(header => `<td>${student[header] || ''}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tableHTML;
    const tableSection = document.getElementById("student-table-section");
if (tableSection) {
  tableSection.appendChild(container);
} else {
  console.warn("No element with id 'student-table-section' found");
  document.body.appendChild(container); // fallback
}

})
.catch(error => {
    console.error('Error fetching CSVs:', error);
});
});