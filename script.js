function generateQuestions() {
    let skills = document.getElementById("skills").value;

    let questions = `
        <p>1. Explain OOP concepts</p>
        <p>2. What is SQL JOIN?</p>
        <p>3. Difference between stack and queue</p>
    `;

    document.getElementById("output").innerHTML = questions;
}