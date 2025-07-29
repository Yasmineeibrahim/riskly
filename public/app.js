window.addEventListener('DOMContentLoaded', function() {
    var video = document.getElementById('bg-video');
    if (video) {
        video.playbackRate = 0.6;
    }
});

//handle teacher login
//get teacher login form from teacherLogin.html
const Form = document.getElementById("login-form");
if (Form) {
  //add event listener for the submit event and collect email and password
  Form.addEventListener("submit", async (e) => {
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

      //if the response is ok, store the teacher id and name in localStorage and redirect to teacherDashboard.html
      if (res.ok) {
       if (data.token) {
  localStorage.setItem("token", data.token);
}
if (data.advisor && data.advisor._id) {
  localStorage.setItem("advisorId", data.advisor._id);
}
if (data.advisor && data.advisor.advisor_Name) {
  localStorage.setItem("advisorName", data.advisor.Advisor_Name);
}

        window.location.href = "/mainDashboard.html";
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Server error. Try again later.");
    }
  });
}