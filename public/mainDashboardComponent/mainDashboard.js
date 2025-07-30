window.addEventListener('DOMContentLoaded', function() {
    var video = document.getElementById('bg-video');
    if (video) {
        video.playbackRate = 0.6;
    }

    // Get advisor's student IDs from localStorage
    let advisorStudents = [];
    try {
        advisorStudents = JSON.parse(localStorage.getItem('advisorStudents')) || [];
        console.log('Advisor students from localStorage:', advisorStudents);
    } catch (e) {
        console.error('Error parsing advisorStudents from localStorage:', e);
    }

    // If no students in localStorage, show a message
    if (advisorStudents.length === 0) {
        console.log('No students found for this advisor');
        const container = document.createElement('div');
        container.className = 'student-ids-list';
        container.innerHTML = '<h2>My Students</h2><div class="student-id">No students assigned to this advisor.</div>';
        document.body.appendChild(container);
        return;
    }

    // Fetch and display only the advisor's students from CSV
    fetch('/student_performance_riskly.csv')
        .then(response => {
            console.log('CSV fetch response status:', response.status);
            return response.text();
        })
        .then(csv => {
            console.log('CSV data received, length:', csv.length);
            const lines = csv.split('\n').filter(Boolean);
            console.log('CSV lines count:', lines.length);
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
            console.log('CSV headers:', headers);
            
            const students = lines.slice(1)
                .map(line => line.split(','))
                .filter(row => {
                    const studentId = Number(row[0]);
                    const isIncluded = advisorStudents.includes(studentId);
                    console.log(`Student ID ${studentId} included: ${isIncluded}`);
                    return isIncluded;
                })
                .map(row => {
                    const obj = {};
                    headers.forEach((h, i) => obj[h] = row[i]);
                    return obj;
                });

            console.log('Filtered students:', students);
            console.log('First student object:', students[0]);
            console.log('Available properties:', Object.keys(students[0] || {}));

            const container = document.createElement('div');
            container.className = 'student-ids-list';
            const htmlContent = '<h2>My Students</h2>' +
                students.map(s => `<div class="student-id">
                    <b>ID:</b> ${s.StudentID} <b>Name:</b> ${s.Name} <b>Grade:</b> ${s.FinalGrade}
                </div>`).join('');
            
            container.innerHTML = htmlContent;
            console.log('Generated HTML:', htmlContent);
            console.log('Container element:', container);
            
            document.body.appendChild(container);
            console.log('Container added to body. Total containers:', document.querySelectorAll('.student-ids-list').length);
        })
        .catch(error => {
            console.error('Error fetching CSV:', error);
        });
});
