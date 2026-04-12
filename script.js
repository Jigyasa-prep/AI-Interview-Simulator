let output;

window.onload = function () {
    output = document.getElementById("output");
};

// 🔹 Skill questions
async function generateQuestions() {
    console.log("generateQuestions called");

    let skill = document.getElementById("skillInput").value.trim();

    if (!skill) {
        output.innerHTML = "<p>⚠️ Enter skill</p>";
        return;
    }

    output.innerHTML = "<p>⏳ Loading...</p>";

    try {
        let response = await fetch("http://127.0.0.1:5000/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ skill })
        });

        let data = await response.json();

        output.innerHTML = ""; // clear loading

        let container = document.createElement("div");

        let title = document.createElement("h3");
        title.innerText = "Questions:";
        container.appendChild(title);

        data.questions.forEach(q => {
            let p = document.createElement("p");
            p.innerText = "👉 " + q;
            container.appendChild(p);
        });

        output.appendChild(container);

    } catch (err) {
        output.innerHTML = "<p>Error</p>";
    }
}


// 🔹 Resume questions
async function uploadResume() {
    console.log("uploadResume called");

    let file = document.getElementById("resumeInput").files[0];

    if (!file) {
        output.innerHTML = "<p>Upload file</p>";
        return;
    }

    output.innerHTML = "<p>⏳ Processing...</p>";

    let formData = new FormData();
    formData.append("resume", file);

    try {
        let response = await fetch("http://127.0.0.1:5000/upload-resume", {
            method: "POST",
            body: formData
        });

        let data = await response.json();

        output.innerHTML = "";

        let container = document.createElement("div");

        let title = document.createElement("h3");
        title.innerText = "Resume Questions:";
        container.appendChild(title);

        data.questions.forEach(q => {
            let p = document.createElement("p");
            p.innerText = "👉 " + q;
            container.appendChild(p);
        });

        output.appendChild(container);

    } catch (err) {
        output.innerHTML = "<p>Error</p>";
    }
}