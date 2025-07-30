console.log("app.js loaded successfully");

window.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded");
    var video = document.getElementById('bg-video');
    if (video) {
        video.playbackRate = 0.6;
        console.log("Video found and playback rate set");
    } else {
        console.log("Video element not found");
    }
});

//handle teacher login
//get teacher login form from teacherLogin.html
const Form = document.getElementById("login-form");
console.log("Form element found:", Form);
if (Form) {
  console.log("Adding submit event listener to form");
  //add event listener for the submit event and collect email and password
  Form.addEventListener("submit", async (e) => {
    console.log("Form submitted!");
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    console.log("Attempting advisor login with email:", email);

    try {
      //send a POST request to the /api/teacherLogin endpoint with the email and password
      const res = await fetch("/api/advisorLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("Login response status:", res.status);
      const data = await res.json();
      console.log("Login response data:", data);
      console.log("Advisor object:", data.advisor);
      console.log("Students array in response:", data.advisor?.Students);

      //if the response is ok, store the teacher id and name in localStorage and redirect to teacherDashboard.html
      if (res.ok) {
       if (data.token) {
  localStorage.setItem("token", data.token);
}
if (data.advisor && data.advisor._id) {
  localStorage.setItem("advisorId", data.advisor._id);
}
if (data.advisor && data.advisor.advisor_name) {
  localStorage.setItem("advisorName", data.advisor.advisor_name);
}
if (data.advisor && data.advisor.Students) {
  console.log("Saving students to localStorage:", data.advisor.Students);
  localStorage.setItem("advisorStudents", JSON.stringify(data.advisor.Students));
  console.log("Students saved to localStorage. Current value:", localStorage.getItem("advisorStudents"));
}

        window.location.href = "mainDashboardComponent/mainDashboard.html";
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Server error. Try again later.");
    }
  });
}