document.addEventListener("DOMContentLoaded", () => {
    const newGameBtn = document.getElementById("new-game-btn");
    const resumeBtn = document.getElementById("resume-btn");
    const nameInputSection = document.getElementById("name-input-section");
    const submitNameBtn = document.getElementById("submit-name-btn");
    const playerNameInput = document.getElementById("player-name");

    const resumeInputSection = document.getElementById("resume-input-section");
    const submitResumeBtn = document.getElementById("submit-resume-btn");
    const resumePlayerNameInput = document.getElementById("resume-player-name");

    newGameBtn.addEventListener("click", () => {
        nameInputSection.classList.remove("hidden");
        resumeInputSection.classList.add("hidden");
    });

    submitNameBtn.addEventListener("click", async () => {
        const playerName = playerNameInput.value.trim();

        if (!playerName) {
            alert("Please enter a valid name.");
            return;
        }

        try {
            const response = await fetch("/create-player", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ player_name: playerName }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create a new player.");
            }

            const data = await response.json();
            alert(`New player created successfully!`);
            localStorage.setItem("player_id", data.player_id);
            window.location.href = `/main?player_id=${data.player_id}`;
        } catch (error) {
            alert(`Error: ${error.message}`);
            console.error("Error creating player:", error);
        }
    });

    resumeBtn.addEventListener("click", () => {
        resumeInputSection.classList.remove("hidden");
        nameInputSection.classList.add("hidden");
    });

    submitResumeBtn.addEventListener("click", async () => {
        const playerName = resumePlayerNameInput.value.trim();

        if (!playerName) {
            alert("Please enter a valid name.");
            return;
        }

        try {
            const response = await fetch("/player/resume", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ screen_name: playerName }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to resume the game.");
            }

            const data = await response.json();
            alert(`Welcome back, ${data.player.screen_name}!`);
            localStorage.setItem("player_id", data.player.player_id);
            window.location.href = `/main?player_id=${data.player.player_id}`;
        } catch (error) {
            alert(`Error: ${error.message}`);
            console.error("Error resuming player:", error);
        }
    });
});
